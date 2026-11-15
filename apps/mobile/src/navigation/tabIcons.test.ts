import test from "node:test";
import assert from "node:assert/strict";
import { getRoleTabIcon, isTabVisibleForRole } from "./tabIcons.js";

test("role tab icons use recognizable Lucide icons", () => {
  const cases = [
    ["DONOR", "donations", "hand-heart"],
    ["NGO", "donations", "package-open"],
    ["VOLUNTEER", "tasks", "clipboard-check"],
    ["ADMIN", "admin", "layout-dashboard"],
  ] as const;
  for (const [role, tab, icon] of cases) assert.equal(getRoleTabIcon(role, tab), icon);
  assert.equal(getRoleTabIcon("DONOR", "home"), "house");
  assert.equal(getRoleTabIcon("NGO", "requests"), "clipboard-list");
  assert.equal(getRoleTabIcon("ADMIN", "profile"), "user-round");
});

test("tab visibility preserves the four role-specific navigation layouts", () => {
  const visibleTabs = (role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN") =>
    (["home", "donations", "requests", "tasks", "admin", "profile"] as const).filter(tab => isTabVisibleForRole(role, tab));

  assert.deepEqual(visibleTabs("DONOR"), ["home", "donations", "requests", "profile"]);
  assert.deepEqual(visibleTabs("NGO"), ["home", "donations", "requests", "profile"]);
  assert.deepEqual(visibleTabs("VOLUNTEER"), ["home", "tasks", "profile"]);
  assert.deepEqual(visibleTabs("ADMIN"), ["home", "donations", "requests", "admin", "profile"]);
});
