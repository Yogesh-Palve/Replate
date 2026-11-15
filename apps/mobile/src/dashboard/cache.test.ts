import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { dashboardQueryKey, invalidateDashboard, shouldRefreshDashboardOnFocus } from "./cache";

test("dashboard invalidation targets the donor role cache without changing other roles", async () => {
  const client = new QueryClient();
  client.setQueryData(dashboardQueryKey("DONOR"), { donations: [{ id: "before-create" }], requests: [] });
  client.setQueryData(dashboardQueryKey("NGO"), { donations: [{ id: "ngo-listing" }], requests: [] });
  await invalidateDashboard(client, "DONOR");
  assert.equal(client.getQueryState(dashboardQueryKey("DONOR"))?.isInvalidated, true);
  assert.equal(client.getQueryState(dashboardQueryKey("NGO"))?.isInvalidated, false);
  client.clear();
});

test("dashboard focus refresh runs only for invalidated or stale cached data", () => {
  assert.equal(shouldRefreshDashboardOnFocus(undefined, 50_000), false);
  assert.equal(shouldRefreshDashboardOnFocus({ dataUpdatedAt: 0, isInvalidated: false }, 50_000), false);
  assert.equal(shouldRefreshDashboardOnFocus({ dataUpdatedAt: 40_001, isInvalidated: false }, 50_000), false);
  assert.equal(shouldRefreshDashboardOnFocus({ dataUpdatedAt: 35_000, isInvalidated: false }, 50_000), true);
  assert.equal(shouldRefreshDashboardOnFocus({ dataUpdatedAt: 49_999, isInvalidated: true }, 50_000), true);
});
