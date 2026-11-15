import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { applyDonationStatus, canCancelDonation, filterDonationsByBucket, getDonationBucket, getDonationCardState } from "./state.js";

test("only available or partially reserved listings expose cancellation", () => {
  assert.equal(canCancelDonation("AVAILABLE"), true);
  assert.equal(canCancelDonation("PARTIALLY_RESERVED"), true);
  for (const status of ["FULLY_RESERVED", "EXPIRED", "CANCELLED"]) assert.equal(canCancelDonation(status), false);
});

test("donation active and history views classify persisted statuses consistently", () => {
  assert.equal(getDonationBucket("PARTIALLY_RESERVED"), "ACTIVE");
  assert.equal(getDonationBucket("CANCELLED"), "HISTORY");
  assert.deepEqual(filterDonationsByBucket([
    { id: "a", status: "AVAILABLE" }, { id: "b", status: "FULLY_RESERVED" }, { id: "c", status: "CANCELLED" },
  ], "ACTIVE").map(item => item.id), ["a"]);
  assert.deepEqual(filterDonationsByBucket([
    { id: "a", status: "AVAILABLE" }, { id: "b", status: "FULLY_RESERVED" }, { id: "c", status: "CANCELLED" },
  ], "HISTORY").map(item => item.id), ["b", "c"]);
});

test("successful cancellation updates the matching cached donation and leaves other listings unchanged", () => {
  const donations = [{ id: "one", status: "AVAILABLE" }, { id: "two", status: "PARTIALLY_RESERVED" }];
  assert.deepEqual(applyDonationStatus(donations, "one", "CANCELLED"), [
    { id: "one", status: "CANCELLED" }, { id: "two", status: "PARTIALLY_RESERVED" },
  ]);
});

test("cancelled cards show the persisted status and no cancel action", () => {
  assert.deepEqual(getDonationCardState("CANCELLED"), { statusLabel: "CANCELLED", showCancelAction: false });
  assert.deepEqual(getDonationCardState("PARTIALLY_RESERVED"), { statusLabel: "Partially reserved", showCancelAction: true });
});

test("reproduces stale AVAILABLE data overwriting a cancellation patch when an old fetch is not cancelled", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ["donations", "", ""] as const;
  client.setQueryData(queryKey, [{ id: "one", status: "AVAILABLE" }]);
  let resolveFetch!: (value: { id: string; status: string }[]) => void;
  const inFlight = client.fetchQuery({
    queryKey,
    queryFn: () => new Promise<{ id: string; status: string }[]>(resolve => { resolveFetch = resolve; }),
  });
  await new Promise(resolve => setImmediate(resolve));
  client.setQueriesData<{ id: string; status: string }[]>({ queryKey: ["donations"] }, current => applyDonationStatus(current, "one", "CANCELLED"));
  resolveFetch([{ id: "one", status: "AVAILABLE" }]);
  await inFlight;
  assert.deepEqual(client.getQueryData(queryKey), [{ id: "one", status: "AVAILABLE" }]);
  client.clear();
});

test("a pre-cancellation list fetch cannot overwrite the confirmed cancelled state", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ["donations", "", ""] as const;
  client.setQueryData(queryKey, [{ id: "one", status: "AVAILABLE" }]);
  let resolveFetch!: (value: { id: string; status: string }[]) => void;
  const inFlight = client.fetchQuery({
    queryKey,
    queryFn: () => new Promise<{ id: string; status: string }[]>(resolve => { resolveFetch = resolve; }),
  });
  await new Promise(resolve => setImmediate(resolve));
  await client.cancelQueries({ queryKey: ["donations"] });
  client.setQueriesData<{ id: string; status: string }[]>({ queryKey: ["donations"] }, current => applyDonationStatus(current, "one", "CANCELLED"));
  resolveFetch([{ id: "one", status: "AVAILABLE" }]);
  await inFlight.catch(() => undefined);
  assert.deepEqual(client.getQueryData(queryKey), [{ id: "one", status: "CANCELLED" }]);
  client.clear();
});
