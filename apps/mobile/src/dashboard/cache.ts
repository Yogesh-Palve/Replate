import type { Role } from "@replate/shared";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const DASHBOARD_STALE_TIME = 15_000;
export const dashboardQueryKey = (role: Role) => ["home", role] as const;
export const impactQueryKey = (role: Role) => ["impact", role] as const;

export async function invalidateDashboard(queryClient: QueryClient, role?: Role): Promise<void> {
  const queryKey: QueryKey = role ? dashboardQueryKey(role) : ["home"];
  await queryClient.invalidateQueries({ queryKey });
}

export async function invalidateImpact(queryClient: QueryClient, role?: Role): Promise<void> {
  const queryKey: QueryKey = role ? impactQueryKey(role) : ["impact"];
  await queryClient.invalidateQueries({ queryKey });
}

export function shouldRefreshDashboardOnFocus(
  state: { dataUpdatedAt: number; isInvalidated: boolean } | undefined,
  now = Date.now(),
): boolean {
  if (!state) return false;
  return state.isInvalidated || (state.dataUpdatedAt > 0 && now - state.dataUpdatedAt >= DASHBOARD_STALE_TIME);
}
