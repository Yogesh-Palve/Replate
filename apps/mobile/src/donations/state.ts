import { getStatusLabel } from "../theme/index";

export type DonationListingState = { id: string; status: string };
export type DonationBucket = "ACTIVE" | "HISTORY";

export function canCancelDonation(status: string): boolean {
  return status === "AVAILABLE" || status === "PARTIALLY_RESERVED";
}

export function getDonationBucket(status: string): DonationBucket {
  return canCancelDonation(status) ? "ACTIVE" : "HISTORY";
}

export function filterDonationsByBucket<T extends { status: string }>(donations: T[] | undefined, bucket: DonationBucket): T[] {
  return (donations ?? []).filter(donation => getDonationBucket(donation.status) === bucket);
}

export function getDonationCardState(status: string): { statusLabel: string; showCancelAction: boolean } {
  return { statusLabel: getStatusLabel(status), showCancelAction: canCancelDonation(status) };
}

export function applyDonationStatus<T extends DonationListingState>(
  donations: T[] | undefined,
  id: string,
  status: string,
): T[] | undefined {
  if (!donations) return donations;
  return donations.map(donation => donation.id === id ? { ...donation, status } : donation);
}
