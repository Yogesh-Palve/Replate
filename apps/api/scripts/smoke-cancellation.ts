import "dotenv/config";
import { prisma } from "../src/config/db.js";

const baseUrl = process.env.SMOKE_API_URL || `http://127.0.0.1:${process.env.PORT || "4000"}/api/v1`;
type Result = { status: number; data: any };

async function call(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<Result> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { "Content-Type": "application/json" } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { status: response.status, data };
}

function expect(result: Result, status: number, label: string) {
  if (result.status !== status) throw new Error(`${label}: expected HTTP ${status}, got ${result.status} (${result.data?.error?.code || "no error code"})`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("Admin bootstrap credentials must be configured to run cancellation smoke checks");

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const testPassword = `RePlate-cancel-${suffix}-A9!`;
  const donorLogin = await call("/auth/register", { method: "POST", body: { name: `Cancel Smoke Donor ${suffix}`, email: `cancel-donor-${suffix}@example.invalid`, password: testPassword, role: "DONOR" } });
  assert(donorLogin.status === 201, `Donor test registration failed (${donorLogin.data?.error?.code || donorLogin.status})`);
  const donorToken = donorLogin.data.accessToken as string;
  const ngoLogin = await call("/auth/register", { method: "POST", body: { name: `Cancel Smoke NGO ${suffix}`, email: `cancel-ngo-${suffix}@example.invalid`, password: testPassword, role: "NGO", organizationName: `Cancel Smoke NGO ${suffix}`, address: "1 Test Road, Local Test City" } });
  assert(ngoLogin.status === 201, `NGO test registration failed (${ngoLogin.data?.error?.code || ngoLogin.status})`);
  const ngoToken = ngoLogin.data.accessToken as string;
  const adminLogin = await call("/auth/login", { method: "POST", body: { email: adminEmail, password: adminPassword } });
  assert(adminLogin.status === 200, `Admin login failed (${adminLogin.data?.error?.code || adminLogin.status})`);
  const adminToken = adminLogin.data.accessToken as string;
  const organizationId = ngoLogin.data.user?.organization?.id as string;
  const verification = await call(`/admin/organizations/${organizationId}/verify`, { method: "PATCH", token: adminToken, body: { verified: true } });
  assert(verification.status === 200, `Test NGO verification failed (${verification.data?.error?.code || verification.status})`);

  const makeDonation = async (foodName: string) => {
    const now = Date.now();
    const created = await call("/donations", { method: "POST", token: donorToken, body: {
      foodName, category: "Prepared meals", quantity: 5, unit: "meal packets",
      preparedAt: new Date(now - 60_000).toISOString(), collectionDeadline: new Date(now + 3_600_000).toISOString(),
      pickupAddress: "1 Test Road, Local Test City", description: "Automated cancellation regression record",
    } });
    assert(created.status === 201, `Test donation creation failed (${created.data?.error?.code || created.status})`);
    return created.data.donation as { id: string; status: string; availableQuantity: number; quantity: number };
  };

  const available = await makeDonation(`Cancel Smoke Available ${suffix}`);
  const cancelResult = await call(`/donations/${available.id}/cancel`, { method: "PATCH", token: donorToken });
  assert(cancelResult.status === 200, `Available donation cancellation failed (${cancelResult.data?.error?.code || cancelResult.status})`);
  assert(cancelResult.data.donation?.id === available.id && cancelResult.data.donation?.status === "CANCELLED", "Cancellation response did not contain the updated CANCELLED donation");
  const persisted = await prisma.donation.findUnique({ where: { id: available.id }, select: { status: true, availableQuantity: true, quantity: true } });
  assert(persisted?.status === "CANCELLED", "PostgreSQL does not contain CANCELLED after cancellation");
  assert(persisted.availableQuantity === available.availableQuantity && persisted.quantity === available.quantity, "Cancellation modified donation quantities");
  const donorList = await call("/donations", { token: donorToken });
  assert(donorList.status === 200 && donorList.data.donations?.find((item: any) => item.id === available.id)?.status === "CANCELLED", "Donor list did not return the persisted CANCELLED status");
  const repeatedCancel = await call(`/donations/${available.id}/cancel`, { method: "PATCH", token: donorToken });
  expect(repeatedCancel, 409, "Repeated cancellation");
  assert(repeatedCancel.data?.error?.code === "INVALID_TRANSITION", "Repeated cancellation returned an unexpected error");

  const pending = await makeDonation(`Cancel Smoke Pending ${suffix}`);
  const requestResult = await call(`/donations/${pending.id}/requests`, { method: "POST", token: ngoToken, body: { quantity: 2 } });
  assert(requestResult.status === 201, `Pending request creation failed (${requestResult.data?.error?.code || requestResult.status})`);
  const withPending = await prisma.donation.findUnique({ where: { id: pending.id }, select: { status: true, availableQuantity: true } });
  assert(withPending?.status === "AVAILABLE" && withPending.availableQuantity === pending.quantity, "Pending request unexpectedly reserved donation quantity");
  const blockedCancel = await call(`/donations/${pending.id}/cancel`, { method: "PATCH", token: donorToken });
  expect(blockedCancel, 409, "Cancellation with pending request");
  assert(blockedCancel.data?.error?.code === "ACTIVE_REQUESTS", "Pending request cancellation block returned an unexpected error");
  const afterBlockedCancel = await prisma.donation.findUnique({ where: { id: pending.id }, select: { status: true, availableQuantity: true } });
  assert(afterBlockedCancel?.status === "AVAILABLE" && afterBlockedCancel.availableQuantity === pending.quantity, "Blocked cancellation changed donation status or quantity");
  const requestId = requestResult.data.request?.id as string;
  const resolveRequest = await call(`/requests/${requestId}/cancel`, { method: "PATCH", token: ngoToken });
  assert(resolveRequest.status === 200, `Test pending request cleanup failed (${resolveRequest.data?.error?.code || resolveRequest.status})`);
  const cancelAfterResolve = await call(`/donations/${pending.id}/cancel`, { method: "PATCH", token: donorToken });
  assert(cancelAfterResolve.status === 200 && cancelAfterResolve.data.donation?.status === "CANCELLED", "Donation could not be cancelled after the pending request was resolved");

  const reserved = await makeDonation(`Cancel Smoke Reserved ${suffix}`);
  const approvedRequest = await call(`/donations/${reserved.id}/requests`, { method: "POST", token: ngoToken, body: { quantity: 2 } });
  assert(approvedRequest.status === 201, `Reservation test request creation failed (${approvedRequest.data?.error?.code || approvedRequest.status})`);
  const approve = await call(`/requests/${approvedRequest.data.request.id}/approve`, { method: "PATCH", token: donorToken });
  assert(approve.status === 200, `Reservation test approval failed (${approve.data?.error?.code || approve.status})`);
  const afterReservation = await prisma.donation.findUnique({ where: { id: reserved.id }, select: { status: true, availableQuantity: true, quantity: true } });
  assert(afterReservation?.status === "PARTIALLY_RESERVED" && afterReservation.availableQuantity === reserved.quantity - 2, "Approved request did not reserve the expected quantity");
  const blockedReservedCancel = await call(`/donations/${reserved.id}/cancel`, { method: "PATCH", token: donorToken });
  expect(blockedReservedCancel, 409, "Cancellation with approved request");
  assert(blockedReservedCancel.data?.error?.code === "ACTIVE_REQUESTS", "Approved request cancellation block returned an unexpected error");
  const afterReservedCancel = await prisma.donation.findUnique({ where: { id: reserved.id }, select: { status: true, availableQuantity: true, quantity: true } });
  assert(afterReservedCancel?.status === "PARTIALLY_RESERVED" && afterReservedCancel.availableQuantity === reserved.quantity - 2, "Blocked cancellation corrupted reserved quantities");
  const cancelApprovedRequest = await call(`/requests/${approvedRequest.data.request.id}/cancel`, { method: "PATCH", token: ngoToken });
  assert(cancelApprovedRequest.status === 200, `Approved test request cancellation failed (${cancelApprovedRequest.data?.error?.code || cancelApprovedRequest.status})`);
  const afterRequestCancel = await prisma.donation.findUnique({ where: { id: reserved.id }, select: { status: true, availableQuantity: true, quantity: true } });
  assert(afterRequestCancel?.status === "AVAILABLE" && afterRequestCancel.availableQuantity === reserved.quantity, "Resolving the approved request did not restore its reserved quantity");
  const cancelAfterReservationResolve = await call(`/donations/${reserved.id}/cancel`, { method: "PATCH", token: donorToken });
  assert(cancelAfterReservationResolve.status === 200 && cancelAfterReservationResolve.data.donation?.status === "CANCELLED", "Donation could not be cancelled after its approved request was resolved");

  console.log("Cancellation smoke passed: response and PostgreSQL status are CANCELLED; donor list returns CANCELLED; repeat cancellation is rejected; pending requests block cancellation without quantity changes; approved reservations remain consistent and block cancellation until resolved.");
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Cancellation smoke failed");
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
