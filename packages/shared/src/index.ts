export const roles = ["DONOR", "NGO", "VOLUNTEER", "ADMIN"] as const;
export type Role = (typeof roles)[number];
export const donationStatuses = ["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED", "EXPIRED", "CANCELLED"] as const;
export type DonationStatus = (typeof donationStatuses)[number];
export const requestStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "VOLUNTEER_ASSIGNED", "COLLECTED", "DELIVERED", "COMPLETED"] as const;
export type RequestStatus = (typeof requestStatuses)[number];
export type AuthUser = { id: string; name: string; email: string; role: Role; organization?: { id: string; name: string; verified: boolean } | null };
