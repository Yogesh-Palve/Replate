export type RedistributedUnit = { unit: string; quantity: number };

const mealSizedUnits = new Set([
  "meal", "meals", "meal packet", "meal packets", "portion", "portions", "serving", "servings",
]);

export function estimateMealsProvided(units: RedistributedUnit[]): number {
  return units.reduce((total, item) => {
    const normalizedUnit = item.unit.trim().toLowerCase().replace(/[\s_-]+/g, " ");
    return total + (mealSizedUnits.has(normalizedUnit) ? item.quantity : 0);
  }, 0);
}

export function buildImpactSummary(input: {
  donationsCreated: number | null;
  units: RedistributedUnit[];
  completedRequests: number;
  completedDeliveries: number;
}) {
  return {
    donationsCreated: input.donationsCreated,
    redistributedByUnit: input.units,
    completedRequests: input.completedRequests,
    completedDeliveries: input.completedDeliveries,
    estimatedMeals: estimateMealsProvided(input.units),
    mealEstimateAssumption: "One meal, portion, serving, or meal packet equals one estimated meal; other units are not converted.",
  };
}
