import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardMetrics } from "./summary.js";

test("Donor dashboard counts active listings, pending review, and completed requests from API data", () => {
  assert.deepEqual(getDashboardMetrics("DONOR", [
    { status: "AVAILABLE", availableQuantity: 4 },
    { status: "PARTIALLY_RESERVED", availableQuantity: 2 },
    { status: "CANCELLED", availableQuantity: 8 },
  ], [{ status: "PENDING" }, { status: "REJECTED" }]), [
    { label: "Active listings", value: 2, icon: "package" },
    { label: "Needs review", value: 1, icon: "clock" },
    { label: "Completed requests", value: 0, icon: "check" },
  ]);
});

test("NGO and volunteer dashboard summaries count only current workflow states", () => {
  assert.deepEqual(getDashboardMetrics("NGO", [{ status: "AVAILABLE", availableQuantity: 4 }], [
    { status: "PENDING" }, { status: "DELIVERED" }, { status: "COMPLETED" }, { status: "REJECTED" },
  ]).map(metric => metric.value), [1, 2, 1]);
  assert.deepEqual(getDashboardMetrics("VOLUNTEER", [], [], [
    { status: "OPEN" }, { status: "ACCEPTED" }, { status: "COLLECTED" }, { status: "DELIVERED" },
  ]).map(metric => metric.value), [1, 2, 1]);
});

test("Admin dashboard uses provided API statistics and safe zero defaults", () => {
  assert.deepEqual(getDashboardMetrics("ADMIN", [], [], [], { users: 8, donations: 11, requests: 6, pendingNgos: 2, completedDeliveries: 3 }).map(metric => metric.value), [8, 11, 2]);
  assert.deepEqual(getDashboardMetrics("ADMIN").map(metric => metric.value), [0, 0, 0]);
});
