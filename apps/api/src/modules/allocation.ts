import { HttpError } from "../utils/errors.js";
export function reserveQuantity(available: number, requested: number): number {
  if (!Number.isInteger(requested) || requested <= 0) throw new HttpError(400, "INVALID_QUANTITY", "Requested quantity must be a positive whole number");
  if (available < requested) throw new HttpError(409, "INSUFFICIENT_QUANTITY", "Not enough quantity remains for this request");
  return available - requested;
}
export function donationStatusAfterReservation(available: number, original: number) {
  return available === 0 ? "FULLY_RESERVED" as const : available === original ? "AVAILABLE" as const : "PARTIALLY_RESERVED" as const;
}

export function assertDonationCanBeCancelled(status: string, hasOpenRequests: boolean): void {
  if (status !== "AVAILABLE" && status !== "PARTIALLY_RESERVED") {
    throw new HttpError(409, "INVALID_TRANSITION", "Only available donation listings can be cancelled");
  }
  if (hasOpenRequests) {
    throw new HttpError(409, "ACTIVE_REQUESTS", "Resolve open requests before cancelling this donation");
  }
}
