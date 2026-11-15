import assert from "node:assert/strict";
import test from "node:test";
import { buildImpactSummary, estimateMealsProvided } from "./impactSummary.js";

test("meal estimates include only recognized meal-sized units", () => {
  assert.equal(estimateMealsProvided([
    { unit: "meal packets", quantity: 12 },
    { unit: "PORTION", quantity: 3 },
    { unit: "kg", quantity: 20 },
    { unit: "boxes", quantity: 5 },
  ]), 15);
});

test("impact summary preserves separate units and completion definitions", () => {
  assert.deepEqual(buildImpactSummary({
    donationsCreated: 4,
    units: [{ unit: "kg", quantity: 12 }, { unit: "meal packets", quantity: 7 }],
    completedRequests: 3,
    completedDeliveries: 2,
  }), {
    donationsCreated: 4,
    redistributedByUnit: [{ unit: "kg", quantity: 12 }, { unit: "meal packets", quantity: 7 }],
    completedRequests: 3,
    completedDeliveries: 2,
    estimatedMeals: 7,
    mealEstimateAssumption: "One meal, portion, serving, or meal packet equals one estimated meal; other units are not converted.",
  });
});
