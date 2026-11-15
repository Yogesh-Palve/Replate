import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, LoadingState, MetricCard, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { getDashboardMetrics } from "../../src/dashboard/summary";
import { getApiErrorMessage } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

const welcomeCopy = {
  DONOR: { kicker: "YOUR FOOD CAN GO FURTHER", title: "Share the good stuff.", body: "List surplus food and help your neighborhood put it to good use.", action: "Manage donations", route: "/(tabs)/donations" as const, icon: "hand-heart" as const },
  NGO: { kicker: "FRESH FOOD, CLOSER", title: "Find what your community needs.", body: "Browse local listings and keep your requests moving in one place.", action: "Discover food", route: "/(tabs)/donations" as const, icon: "package-open" as const },
  VOLUNTEER: { kicker: "MAKE THE LAST MILE MATTER", title: "Good food needs a ride.", body: "Pick up an assignment and help deliver it to a local organization.", action: "View assignments", route: "/(tabs)/tasks" as const, icon: "truck" as const },
  ADMIN: { kicker: "REPLATE OPERATIONS", title: "The network at a glance.", body: "Review platform activity and keep community organizations verified.", action: "Open admin tools", route: "/(tabs)/admin" as const, icon: "layout-dashboard" as const },
};

export default function Home() {
  const { user } = useAuth();
  const notify = useToast();
  const role = user?.role ?? "DONOR";
  const query = useQuery({
    queryKey: ["home", role],
    queryFn: async () => {
      if (role === "ADMIN") return { admin: (await api.get("/admin/stats")).data.stats };
      if (role === "VOLUNTEER") return { tasks: (await api.get("/volunteer/tasks")).data.tasks };
      const [donationResponse, requestResponse] = await Promise.all([api.get("/donations"), api.get("/requests")]);
      return { donations: donationResponse.data.donations, requests: requestResponse.data.requests };
    },
  });
  useEffect(() => {
    if (query.isError) notify("error", getApiErrorMessage(query.error, "We could not load your latest activity."), { duration: null });
  }, [notify, query.error, query.isError]);

  const copy = welcomeCopy[role];
  const metrics = getDashboardMetrics(role, query.data?.donations, query.data?.requests, query.data?.tasks, query.data?.admin);
  const roleName = role === "NGO" ? "Community organization" : role[0] + role.slice(1).toLowerCase();

  return <Screen>
    <Text style={{ color: colors.primary, fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: 1.15, marginBottom: spacing.xs }}>REPLATE  /  {roleName.toUpperCase()}</Text>
    <Title sub={`Good to see you${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`}>Home</Title>

    <Card style={{ backgroundColor: colors.surfaceSoft, borderColor: "#E2EBDD", borderRadius: radii.xl, padding: spacing.xl, overflow: "hidden" }}>
      <View style={{ position: "absolute", width: 150, height: 150, borderRadius: 80, backgroundColor: "#E3EDE0", right: -50, top: -52 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.md }}>
        <Lucide name={copy.icon} size={16} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={{ color: colors.primary, fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: 0.8 }}>{copy.kicker}</Text>
      </View>
      <Text style={{ color: colors.ink, fontSize: typography.size.title, lineHeight: typography.line.title, fontWeight: typography.weight.heavy, letterSpacing: -0.7 }}>{copy.title}</Text>
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.small, lineHeight: typography.line.small, marginTop: spacing.xs, marginBottom: spacing.md }}>{copy.body}</Text>
      {role === "NGO" && user?.organization?.verified === false ? <View style={{ marginBottom: spacing.sm }}><Status variant="warning">Organization verification required to request food</Status></View> : null}
      <Link href={copy.route} asChild><Button title={copy.action} icon="arrow-right" onPress={() => {}} /></Link>
      {role === "DONOR" ? <Link href="/(tabs)/requests" asChild><Button title="Review incoming requests" secondary icon="clipboard-list" onPress={() => {}} /></Link> : null}
      {role === "NGO" ? <Link href="/(tabs)/requests" asChild><Button title="Track my requests" secondary icon="clipboard-list" onPress={() => {}} /></Link> : null}
    </Card>

    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.md }}>
      <Text style={{ color: colors.ink, fontSize: typography.size.heading, fontWeight: typography.weight.bold }}>At a glance</Text>
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Live account data</Text>
    </View>
    {query.isLoading ? <Card><LoadingState label="Loading your latest activity" /></Card> : query.isError
      ? <Card>
        <View style={{ alignItems: "center", paddingVertical: spacing.md }}><Lucide name="cloud-alert" size={25} color={colors.error} accessibilityElementsHidden importantForAccessibility="no" /><Text style={{ color: colors.ink, fontWeight: typography.weight.semibold, marginTop: spacing.sm }}>Your activity could not be loaded</Text><Text style={{ color: colors.secondaryText, textAlign: "center", marginTop: spacing.xs }}>Check your connection and try again.</Text><Button title="Try again" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} /></View>
      </Card>
      : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {metrics.map(metric => <View key={metric.label} style={{ width: "48%", flexGrow: 1, minWidth: 120 }}><MetricCard {...metric} /></View>)}
      </View>}

    {role === "ADMIN" ? <Link href="/(tabs)/admin" asChild><Button title="Review organizations and activity" secondary icon="shield-check" onPress={() => {}} /></Link> : null}
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Lucide name="leaf" size={15} color={colors.sage} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Good Food. Shared Better.</Text>
    </View>
  </Screen>;
}
