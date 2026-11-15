import test from "node:test";
import assert from "node:assert/strict";
import { assertDonationCanBeCancelled, donationStatusAfterReservation, reserveQuantity } from "./allocation.js";
import { HttpError } from "../utils/errors.js";
test("reservation decrements available quantity and sets partial/full state", () => {
  assert.equal(reserveQuantity(50, 30), 20);
  assert.equal(donationStatusAfterReservation(20, 50), "PARTIALLY_RESERVED");
  assert.equal(reserveQuantity(20, 20), 0);
  assert.equal(donationStatusAfterReservation(0, 50), "FULLY_RESERVED");
});
test("requests that exceed available stock fail without allocation", () => {
  assert.throws(() => reserveQuantity(20, 25), (error: unknown) => error instanceof HttpError && error.status === 409);
});
test("invalid quantity is rejected", () => {
  assert.throws(() => reserveQuantity(10, 0), (error: unknown) => error instanceof HttpError && error.status === 400);
});
test("available donations can be cancelled when no request is active", () => {
  assert.doesNotThrow(() => assertDonationCanBeCancelled("AVAILABLE", false));
  assert.doesNotThrow(() => assertDonationCanBeCancelled("PARTIALLY_RESERVED", false));
});
test("pending and other active requests block donation cancellation", () => {
  assert.throws(() => assertDonationCanBeCancelled("AVAILABLE", true), (error: unknown) => error instanceof HttpError && error.code === "ACTIVE_REQUESTS" && error.status === 409);
});
test("already cancelled, fully reserved, and expired donations cannot be cancelled", () => {
  for (const status of ["CANCELLED", "FULLY_RESERVED", "EXPIRED"]) {
    assert.throws(() => assertDonationCanBeCancelled(status, false), (error: unknown) => error instanceof HttpError && error.code === "INVALID_TRANSITION" && error.status === 409);
  }
});
