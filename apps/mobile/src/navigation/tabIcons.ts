import type { Role } from "@replate/shared";
import type { LucideIconName } from "@react-native-vector-icons/lucide";

export type TabKey = "home" | "donations" | "requests" | "tasks" | "admin" | "profile";

const commonIcons = {
  home: "house",
  requests: "clipboard-list",
  tasks: "clipboard-check",
  admin: "layout-dashboard",
  profile: "user-round",
} satisfies Partial<Record<TabKey, LucideIconName>>;

export function getRoleTabIcon(role: Role | undefined, tab: TabKey): LucideIconName {
  if (tab === "donations") return role === "DONOR" ? "hand-heart" : "package-open";
  return commonIcons[tab] ?? "house";
}

export function isTabVisibleForRole(role: Role | undefined, tab: TabKey): boolean {
  if (tab === "home" || tab === "profile") return true;
  if (tab === "donations" || tab === "requests") return role === "DONOR" || role === "NGO" || role === "ADMIN";
  if (tab === "tasks") return role === "VOLUNTEER";
  return role === "ADMIN";
}
