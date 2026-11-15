import type { Role } from "@replate/shared";
import type { DashboardMetric } from "./summary";

export type ImpactSummary = {
  donationsCreated: number | null;
  redistributedByUnit: { unit: string; quantity: number }[];
  completedRequests: number;
  completedDeliveries: number;
  estimatedMeals: number;
  mealEstimateAssumption: string;
};

export function getImpactMetrics(role: Role, summary: ImpactSummary): DashboardMetric[] {
  const completed = { label: "Confirmed deliveries", value: summary.completedDeliveries, icon: "truck" as const };
  const requests = { label: "Requests fulfilled", value: summary.completedRequests, icon: "check" as const };
  const meals = { label: "Estimated meals", value: summary.estimatedMeals, icon: "heart" as const };
  if (role === "DONOR") return [
    { label: "Donations created", value: summary.donationsCreated ?? 0, icon: "package" },
    requests,
    completed,
    meals,
  ];
  if (role === "NGO") return [
    { label: "Requests received", value: summary.completedRequests, icon: "clipboard-list" },
    completed,
    meals,
  ];
  if (role === "VOLUNTEER") return [completed, meals];
  return [
    { label: "Donations created", value: summary.donationsCreated ?? 0, icon: "package" },
    requests,
    completed,
    meals,
  ];
}
