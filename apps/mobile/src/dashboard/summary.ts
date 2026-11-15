import type { Role } from "@replate/shared";

export type DashboardMetric = { label: string; value: number; icon: "package" | "clipboard-list" | "clock" | "users" | "check" | "heart" | "building" | "truck" };
type DonationSummary = { status: string; availableQuantity: number };
type RequestSummary = { status: string };
type AssignmentSummary = { status: string };
type AdminSummary = { users: number; donations: number; requests: number; pendingNgos: number; completedDeliveries: number };

const activeDonationStatuses = new Set(["AVAILABLE", "PARTIALLY_RESERVED"]);
const activeRequestStatuses = new Set(["PENDING", "APPROVED", "VOLUNTEER_ASSIGNED", "COLLECTED", "DELIVERED"]);

export function getDashboardMetrics(
  role: Role,
  donations: DonationSummary[] = [],
  requests: RequestSummary[] = [],
  assignments: AssignmentSummary[] = [],
  admin?: AdminSummary,
): DashboardMetric[] {
  if (role === "DONOR") return [
    { label: "Active listings", value: donations.filter(d => activeDonationStatuses.has(d.status)).length, icon: "package" },
    { label: "Needs review", value: requests.filter(r => r.status === "PENDING").length, icon: "clock" },
    { label: "Completed requests", value: requests.filter(r => r.status === "COMPLETED").length, icon: "check" },
  ];
  if (role === "NGO") return [
    { label: "Available listings", value: donations.length, icon: "package" },
    { label: "Active requests", value: requests.filter(r => activeRequestStatuses.has(r.status)).length, icon: "clipboard-list" },
    { label: "Received", value: requests.filter(r => r.status === "COMPLETED").length, icon: "check" },
  ];
  if (role === "VOLUNTEER") return [
    { label: "Open assignments", value: assignments.filter(a => a.status === "OPEN").length, icon: "package" },
    { label: "In progress", value: assignments.filter(a => ["ACCEPTED", "COLLECTED"].includes(a.status)).length, icon: "truck" },
    { label: "Delivered", value: assignments.filter(a => a.status === "DELIVERED").length, icon: "check" },
  ];
  return [
    { label: "Users", value: admin?.users ?? 0, icon: "users" },
    { label: "Listings", value: admin?.donations ?? 0, icon: "package" },
    { label: "Pending NGOs", value: admin?.pendingNgos ?? 0, icon: "building" },
  ];
}
