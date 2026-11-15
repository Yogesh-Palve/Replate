export type DonationListingState = { id: string; status: string };

export function canCancelDonation(status: string): boolean {
  return status === "AVAILABLE" || status === "PARTIALLY_RESERVED";
}

export function getDonationCardState(status: string): { statusLabel: string; showCancelAction: boolean } {
  return { statusLabel: status, showCancelAction: canCancelDonation(status) };
}

export function applyDonationStatus<T extends DonationListingState>(
  donations: T[] | undefined,
  id: string,
  status: string,
): T[] | undefined {
  if (!donations) return donations;
  return donations.map(donation => donation.id === id ? { ...donation, status } : donation);
}
