import assert from "node:assert/strict";
import test from "node:test";
import { getImpactMetrics, type ImpactSummary } from "./impact.js";

const summary: ImpactSummary = {
  donationsCreated: 5,
  redistributedByUnit: [{ unit: "meal packets", quantity: 10 }, { unit: "kg", quantity: 4 }],
  completedRequests: 3,
  completedDeliveries: 3,
  estimatedMeals: 10,
  mealEstimateAssumption: "One meal-sized unit equals one estimated meal.",
};

test("impact metrics are role appropriate and use the live summary", () => {
  assert.deepEqual(getImpactMetrics("DONOR", summary).map(metric => metric.value), [5, 3, 3, 10]);
  assert.deepEqual(getImpactMetrics("NGO", summary).map(metric => metric.value), [3, 3, 10]);
  assert.deepEqual(getImpactMetrics("VOLUNTEER", summary).map(metric => metric.value), [3, 10]);
  assert.deepEqual(getImpactMetrics("ADMIN", summary).map(metric => metric.value), [5, 3, 3, 10]);
});
