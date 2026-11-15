import "dotenv/config";

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
function ok(result: Result, label: string) { if (result.status < 200 || result.status >= 300) throw new Error(`${label}: HTTP ${result.status} (${result.data?.error?.code || "no error code"})`); }

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 16) throw new Error("Admin credentials are missing or below the configured minimum");

  const adminLogin = await call("/auth/login", { method: "POST", body: { email: adminEmail, password: adminPassword } });
  ok(adminLogin, "Admin login");
  if (adminLogin.data.user?.role !== "ADMIN") throw new Error("Admin login returned an unexpected role");
  const adminToken = adminLogin.data.accessToken as string;
  for (const endpoint of ["/admin/stats", "/admin/users", "/admin/organizations", "/admin/donations", "/admin/requests", "/impact/summary"]) {
    ok(await call(endpoint, { token: adminToken }), `Admin dashboard ${endpoint}`);
  }
  const forbiddenAdmin = await call("/admin/stats", { token: "" });
  expect(forbiddenAdmin, 401, "Protected admin route without token");

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const testPassword = `RePlate-smoke-${suffix}-A9!`;
  const donorRegistration = await call("/auth/register", { method: "POST", body: { name: `Smoke Donor ${suffix}`, email: `donor-${suffix}@example.invalid`, password: testPassword, role: "DONOR" } });
  ok(donorRegistration, "Donor registration");
  const donorToken = donorRegistration.data.accessToken as string;
  if ((await call("/auth/me", { token: donorToken })).data.user?.role !== "DONOR") throw new Error("Donor session role check failed");
  expect(await call("/admin/stats", { token: donorToken }), 403, "Admin route role protection");
  expect(await call("/volunteer/tasks", { token: donorToken }), 403, "Donor cannot access volunteer tasks");
  ok(await call("/donations", { token: donorToken }), "Donor dashboard donations");
  ok(await call("/requests", { token: donorToken }), "Donor dashboard requests");
  ok(await call("/impact/summary", { token: donorToken }), "Donor impact authorization");
  const ngoRegistration = await call("/auth/register", { method: "POST", body: { name: `Smoke NGO User ${suffix}`, email: `ngo-${suffix}@example.invalid`, password: testPassword, role: "NGO", organizationName: `Smoke NGO ${suffix}`, address: "1 Test Road, Local Test City" } });
  ok(ngoRegistration, "NGO registration");
  const ngoToken = ngoRegistration.data.accessToken as string;
  if ((await call("/auth/me", { token: ngoToken })).data.user?.role !== "NGO") throw new Error("NGO session role check failed");
  ok(await call("/donations", { token: ngoToken }), "NGO dashboard donations");
  ok(await call("/requests", { token: ngoToken }), "NGO dashboard requests");
  ok(await call("/impact/summary", { token: ngoToken }), "NGO impact authorization");
  expect(await call("/volunteer/tasks", { token: ngoToken }), 403, "NGO cannot access volunteer tasks");
  const organizationId = ngoRegistration.data.user?.organization?.id as string;
  const volunteerRegistration = await call("/auth/register", { method: "POST", body: { name: `Smoke Volunteer ${suffix}`, email: `volunteer-${suffix}@example.invalid`, password: testPassword, role: "VOLUNTEER" } });
  ok(volunteerRegistration, "Volunteer registration");
  const volunteerToken = volunteerRegistration.data.accessToken as string;
  if ((await call("/auth/me", { token: volunteerToken })).data.user?.role !== "VOLUNTEER") throw new Error("Volunteer session role check failed");
  ok(await call("/volunteer/tasks", { token: volunteerToken }), "Volunteer dashboard tasks");
  ok(await call("/impact/summary", { token: volunteerToken }), "Volunteer impact authorization");
  expect(await call("/admin/stats", { token: volunteerToken }), 403, "Volunteer cannot access admin routes");
  expect(await call("/volunteer/availability", { method: "PATCH", token: donorToken, body: { available: false } }), 403, "Donor cannot change volunteer availability");

  for (const [email, role] of [[`donor-${suffix}@example.invalid`, "DONOR"], [`ngo-${suffix}@example.invalid`, "NGO"], [`volunteer-${suffix}@example.invalid`, "VOLUNTEER"]] as const) {
    const login = await call("/auth/login", { method: "POST", body: { email, password: testPassword } });
    ok(login, `${role} login`);
    if (login.data.user?.role !== role) throw new Error(`${role} login returned an unexpected role`);
  }

  const selfAdminRegistration = await call("/auth/register", { method: "POST", body: { name: "Invalid Role Smoke", email: `self-admin-${suffix}@example.invalid`, password: testPassword, role: "ADMIN" } });
  expect(selfAdminRegistration, 400, "Public admin role assignment rejection");

  const now = new Date();
  const donationResult = await call("/donations", { method: "POST", token: donorToken, body: { foodName: `Smoke Test Meals ${suffix}`, category: "Prepared meals", quantity: 3, unit: "meal packets", preparedAt: new Date(now.getTime() - 60_000).toISOString(), collectionDeadline: new Date(now.getTime() + 3_600_000).toISOString(), pickupAddress: "1 Test Road, Local Test City", description: "Automated workflow test record" } });
  ok(donationResult, "Donor creates donation");
  const donationId = donationResult.data.donation?.id as string;
  const createdDonation = await call(`/donations/${donationId}`, { token: donorToken });
  ok(createdDonation, "Donor reads newly created donation");
  if (createdDonation.data.donation?.availableQuantity !== 3 || createdDonation.data.donation?.status !== "AVAILABLE") throw new Error("New donation quantity/state is inconsistent");
  const browse = await call(`/donations?search=${encodeURIComponent(`Smoke Test Meals ${suffix}`)}`, { token: ngoToken });
  ok(browse, "NGO browses donation");
  if (!browse.data.donations?.some((item: any) => item.id === donationId)) throw new Error("NGO could not find the newly created donation");

  const unverifiedRequest = await call(`/donations/${donationId}/requests`, { method: "POST", token: ngoToken, body: { quantity: 1 } });
  expect(unverifiedRequest, 403, "Unverified NGO cannot request food");
  if (unverifiedRequest.data?.error?.code !== "NGO_NOT_VERIFIED") throw new Error("Unverified NGO request was rejected for an unexpected reason");
  ok(await call(`/admin/organizations/${organizationId}/verify`, { method: "PATCH", token: adminToken, body: { verified: true } }), "Admin NGO verification");

  const firstRequest = await call(`/donations/${donationId}/requests`, { method: "POST", token: ngoToken, body: { quantity: 2, note: "Automated workflow test" } });
  ok(firstRequest, "NGO requests food");
  const requestId = firstRequest.data.request?.id as string;
  const beforeApproval = await call(`/donations/${donationId}`, { token: donorToken });
  ok(beforeApproval, "Donor checks pending reservation");
  if (beforeApproval.data.donation?.availableQuantity !== 3) throw new Error("A pending request incorrectly reserved donation quantity");
  expect(await call(`/requests/${requestId}/approve`, { method: "PATCH", token: ngoToken }), 403, "NGO cannot approve its own request");
  const donorRequests = await call("/requests", { token: donorToken });
  ok(donorRequests, "Donor reviews incoming requests");
  if (!donorRequests.data.requests?.some((item: any) => item.id === requestId)) throw new Error("Incoming request was not visible to the donor");
  ok(await call(`/requests/${requestId}/approve`, { method: "PATCH", token: donorToken }), "Donor approves request");
  const afterApproval = await call(`/donations/${donationId}`, { token: donorToken });
  ok(afterApproval, "Donor checks approved reservation");
  if (afterApproval.data.donation?.availableQuantity !== 1 || afterApproval.data.donation?.status !== "PARTIALLY_RESERVED") throw new Error("Approval did not reserve the requested quantity exactly once");

  const oversubscriptionRequest = await call(`/donations/${donationId}/requests`, { method: "POST", token: ngoToken, body: { quantity: 2 } });
  ok(oversubscriptionRequest, "NGO submits second request");
  const oversubscriptionApproval = await call(`/requests/${oversubscriptionRequest.data.request.id}/approve`, { method: "PATCH", token: donorToken });
  expect(oversubscriptionApproval, 409, "Over-allocation prevention");
  if (oversubscriptionApproval.data?.error?.code !== "INSUFFICIENT_QUANTITY") throw new Error("Over-allocation was rejected for an unexpected reason");
  ok(await call(`/requests/${oversubscriptionRequest.data.request.id}/reject`, { method: "PATCH", token: donorToken }), "Donor rejects overlarge pending request");
  const afterRejection = await call(`/donations/${donationId}`, { token: donorToken });
  ok(afterRejection, "Donor checks rejected request allocation");
  if (afterRejection.data.donation?.availableQuantity !== 1) throw new Error("Rejected request changed available donation quantity");

  const tasks = await call("/volunteer/tasks", { token: volunteerToken });
  ok(tasks, "Volunteer task dashboard");
  const assignmentId = tasks.data.tasks?.find((task: any) => task.requestId === requestId || task.request?.id === requestId)?.id as string;
  if (!assignmentId) throw new Error("Volunteer could not see the approved assignment");
  ok(await call("/volunteer/availability", { method: "PATCH", token: volunteerToken, body: { available: false } }), "Volunteer marks unavailable");
  const unavailableAccept = await call(`/assignments/${assignmentId}/accept`, { method: "PATCH", token: volunteerToken });
  expect(unavailableAccept, 409, "Unavailable volunteer cannot accept assignment");
  if (unavailableAccept.data?.error?.code !== "NOT_AVAILABLE") throw new Error("Unavailable volunteer was rejected for an unexpected reason");
  ok(await call("/volunteer/availability", { method: "PATCH", token: volunteerToken, body: { available: true } }), "Volunteer marks available");
  ok(await call(`/assignments/${assignmentId}/accept`, { method: "PATCH", token: volunteerToken }), "Volunteer accepts assignment");
  expect(await call(`/assignments/${assignmentId}/accept`, { method: "PATCH", token: volunteerToken }), 409, "Duplicate assignment acceptance guard");
  const skipCollection = await call(`/assignments/${assignmentId}/deliver`, { method: "PATCH", token: volunteerToken });
  expect(skipCollection, 409, "Delivery transition guard");
  ok(await call(`/assignments/${assignmentId}/collect`, { method: "PATCH", token: volunteerToken }), "Volunteer records collection");
  ok(await call(`/assignments/${assignmentId}/deliver`, { method: "PATCH", token: volunteerToken }), "Volunteer records delivery");
  ok(await call(`/requests/${requestId}/confirm-delivery`, { method: "PATCH", token: ngoToken }), "NGO confirms delivery");

  const ngoRequests = await call("/requests", { token: ngoToken });
  ok(ngoRequests, "NGO request dashboard");
  const completed = ngoRequests.data.requests?.find((item: any) => item.id === requestId);
  if (completed?.status !== "COMPLETED" || completed.assignment?.delivery?.status !== "CONFIRMED") throw new Error("Final request or delivery state is inconsistent");
  const donationFinal = await call(`/donations/${donationId}`, { token: donorToken });
  ok(donationFinal, "Donor donation dashboard");
  if (donationFinal.data.donation?.availableQuantity !== 1 || donationFinal.data.donation?.status !== "PARTIALLY_RESERVED") throw new Error("Donation reservation quantity/status is inconsistent");

  const [donorImpact, ngoImpact, volunteerImpact, adminImpact] = await Promise.all([
    call("/impact/summary", { token: donorToken }), call("/impact/summary", { token: ngoToken }),
    call("/impact/summary", { token: volunteerToken }), call("/impact/summary", { token: adminToken }),
  ]);
  [donorImpact, ngoImpact, volunteerImpact, adminImpact].forEach((result, index) => ok(result, `Role impact summary ${index + 1}`));
  const donorSummary = donorImpact.data.summary;
  if (donorSummary.donationsCreated !== 1 || donorSummary.completedRequests !== 1 || donorSummary.completedDeliveries !== 1 || donorSummary.estimatedMeals !== 2) throw new Error("Donor impact summary does not match the completed workflow fixture");
  if (ngoImpact.data.summary.donationsCreated !== null || ngoImpact.data.summary.completedRequests !== 1 || ngoImpact.data.summary.completedDeliveries !== 1 || ngoImpact.data.summary.estimatedMeals !== 2) throw new Error("NGO impact summary is not correctly scoped");
  if (volunteerImpact.data.summary.donationsCreated !== null || volunteerImpact.data.summary.completedRequests !== 1 || volunteerImpact.data.summary.completedDeliveries !== 1 || volunteerImpact.data.summary.estimatedMeals !== 2) throw new Error("Volunteer impact summary is not correctly scoped");
  const redistributedPackets = donorSummary.redistributedByUnit?.find((unit: any) => unit.unit === "meal packets")?.quantity;
  if (redistributedPackets !== 2) throw new Error("Impact quantity was not grouped by its original food unit");
  if (typeof adminImpact.data.summary.donationsCreated !== "number" || adminImpact.data.summary.completedDeliveries < 1) throw new Error("Admin platform impact summary is incomplete");

  const concurrentNow = new Date();
  const concurrentDonationResult = await call("/donations", { method: "POST", token: donorToken, body: { foodName: `Concurrent Smoke Meals ${suffix}`, category: "Prepared meals", quantity: 3, unit: "meal packets", preparedAt: new Date(concurrentNow.getTime() - 60_000).toISOString(), collectionDeadline: new Date(concurrentNow.getTime() + 3_600_000).toISOString(), pickupAddress: "1 Test Road, Local Test City", description: "Concurrent allocation smoke test" } });
  ok(concurrentDonationResult, "Donor creates concurrent allocation fixture");
  const concurrentDonationId = concurrentDonationResult.data.donation?.id as string;
  const competingRequests = await Promise.all([1, 2].map(() => call(`/donations/${concurrentDonationId}/requests`, { method: "POST", token: ngoToken, body: { quantity: 2, note: "Concurrent allocation smoke test" } })));
  competingRequests.forEach((result, index) => ok(result, `NGO creates competing request ${index + 1}`));
  const competingApprovals = await Promise.all(competingRequests.map(result => call(`/requests/${result.data.request.id}/approve`, { method: "PATCH", token: donorToken })));
  const acceptedIndex = competingApprovals.findIndex(result => result.status === 200);
  const rejectedIndex = competingApprovals.findIndex(result => result.status === 409);
  if (acceptedIndex < 0 || rejectedIndex < 0 || acceptedIndex === rejectedIndex || competingApprovals.some(result => ![200, 409].includes(result.status))) {
    const outcomes = competingApprovals.map(result => ({ status: result.status, code: result.data?.error?.code || "none" }));
    throw new Error(`Concurrent approvals did not produce exactly one accepted reservation and one conflict (${JSON.stringify(outcomes)})`);
  }
  const rejectedCode = competingApprovals[rejectedIndex].data?.error?.code;
  if (!["INSUFFICIENT_QUANTITY", "CONCURRENT_UPDATE"].includes(rejectedCode)) throw new Error("Concurrent reservation failed with an unexpected error");
  const concurrentFinal = await call(`/donations/${concurrentDonationId}`, { token: donorToken });
  ok(concurrentFinal, "Donor checks concurrent allocation result");
  if (concurrentFinal.data.donation?.availableQuantity !== 1 || concurrentFinal.data.donation?.status !== "PARTIALLY_RESERVED") throw new Error("Concurrent approvals oversubscribed or corrupted the donation quantity");
  ok(await call(`/requests/${competingRequests[rejectedIndex].data.request.id}/reject`, { method: "PATCH", token: donorToken }), "Donor closes losing concurrent request");

  console.log("Admin login and dashboard: PASS");
  console.log("Donor, NGO, and volunteer registration/authenticated dashboards: PASS");
  console.log("Public admin-role escalation guard: PASS");
  console.log("Role restrictions, NGO verification, and volunteer availability guards: PASS");
  console.log("Donation browse/request/approval and insufficient-quantity guard: PASS");
  console.log("Assignment accept/collect/deliver, transition guard, and NGO confirmation: PASS");
  console.log("Final request, delivery, and available-quantity consistency: PASS");
  console.log("Role-scoped impact summaries, confirmed quantities by unit, and meal-estimate rules: PASS");
  console.log("Concurrent reservation serialization and oversubscription guard: PASS");
  console.log("Synthetic test records were retained in the database; no existing data was modified or deleted.");
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Workflow smoke test failed"); process.exitCode = 1; });
