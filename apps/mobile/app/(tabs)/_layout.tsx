import React from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { theme } from "../../src/theme";
import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";
import { getRoleTabIcon, isTabVisibleForRole } from "../../src/navigation/tabIcons";

export default function TabsLayout() {
  const { user } = useAuth();
  const donor = user?.role === "DONOR";
  const donationIcon: LucideIconName = getRoleTabIcon(user?.role, "donations");

  return <Tabs screenOptions={{
    headerShown: true,
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.dark,
    headerTitleStyle: { color: theme.dark, fontSize: 17, fontWeight: "700" },
    headerShadowVisible: false,
    tabBarActiveTintColor: theme.green,
    tabBarInactiveTintColor: theme.muted,
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    tabBarIconStyle: { marginTop: 2 },
    tabBarStyle: { height: 66, paddingBottom: 8, paddingTop: 5, backgroundColor: theme.white, borderTopColor: theme.border, borderTopWidth: 1, elevation: 8 },
  }}>
    <Tabs.Screen name="index" options={{
      title: "Home", tabBarLabel: "Home",
      tabBarIcon: ({ color, focused }) => <Lucide name={getRoleTabIcon(user?.role, "home")} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
    <Tabs.Screen name="donations" options={{
      title: donor ? "My donations" : "Find food", tabBarLabel: donor ? "Donations" : "Browse",
      href: isTabVisibleForRole(user?.role, "donations") ? undefined : null,
      tabBarIcon: ({ color, focused }) => <Lucide name={donationIcon} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
    <Tabs.Screen name="requests" options={{
      title: "Requests", tabBarLabel: "Requests", href: isTabVisibleForRole(user?.role, "requests") ? undefined : null,
      tabBarIcon: ({ color, focused }) => <Lucide name={getRoleTabIcon(user?.role, "requests")} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
    <Tabs.Screen name="tasks" options={{
      title: "Volunteer tasks", tabBarLabel: "Tasks", href: isTabVisibleForRole(user?.role, "tasks") ? undefined : null,
      tabBarIcon: ({ color, focused }) => <Lucide name={getRoleTabIcon(user?.role, "tasks")} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
    <Tabs.Screen name="admin" options={{
      title: "Admin", tabBarLabel: "Admin", href: isTabVisibleForRole(user?.role, "admin") ? undefined : null,
      tabBarIcon: ({ color, focused }) => <Lucide name={getRoleTabIcon(user?.role, "admin")} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
    <Tabs.Screen name="profile" options={{
      title: "Profile", tabBarLabel: "Profile",
      tabBarIcon: ({ color, focused }) => <Lucide name={getRoleTabIcon(user?.role, "profile")} size={22} color={color} style={{ opacity: focused ? 1 : 0.78 }} accessibilityElementsHidden importantForAccessibility="no" />,
    }} />
  </Tabs>;
}
