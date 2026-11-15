import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, EmptyState, FilterChip, IconBadge, LoadingState, MetricCard, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { invalidateDashboard } from "../../src/dashboard/cache";
import { useToast } from "../../src/notifications/ToastProvider";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing, typography } from "../../src/theme";

type AdminData = {
  stats: { users: number; donations: number; requests: number; pendingNgos: number; completedDeliveries: number };
  organizations: any[]; requests: any[]; users: any[]; donations: any[];
};
type UserRole = "ALL" | "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";

export default function Admin() {
  const { user, signingOut } = useAuth();
  const notify = useToast();
  const qc = useQueryClient();
  const [userRole, setUserRole] = useState<UserRole>("ALL");
  const actionGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({
    queryKey: ["admin"],
    enabled: Boolean(user && !signingOut),
    queryFn: async ({ signal }): Promise<AdminData> => {
      const [stats, orgs, requests, users, donations] = await Promise.all([
        api.get("/admin/stats", { signal }), api.get("/admin/organizations", { signal }), api.get("/admin/requests", { signal }), api.get("/admin/users", { signal }), api.get("/admin/donations", { signal }),
      ]);
      return { stats: stats.data.stats, organizations: orgs.data.organizations, requests: requests.data.requests, users: users.data.users, donations: donations.data.donations };
    },
  });
  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/organizations/${id}/verify`, { verified: true }),
    onSuccess: async () => { notify("success", "Organization verified."); await Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), invalidateDashboard(qc, "ADMIN")]); },
  });
  useEffect(() => { if (query.isError && user && !signingOut) notify("error", getApiErrorMessage(query.error, "Admin data could not be loaded. Confirm this account has admin access."), { duration: null }); }, [notify, query.error, query.isError, signingOut, user]);
  const verifyOrganization = (id: string) => { void actionGuard(async () => {
    try { await verify.mutateAsync(id); }
    catch (error) { notify("error", getApiErrorMessage(error, "Organization verification could not be saved. Try again."), { duration: null }); }
  }); };
  const data = query.data;
  const users = useMemo(() => (data?.users ?? []).filter(member => userRole === "ALL" || member.role === userRole), [data?.users, userRole]);
  const pendingOrganizations = data?.organizations.filter(org => !org.verified) ?? [];
  const metrics = data ? [
    { label: "Platform users", value: data.stats.users, icon: "users-round" as const },
    { label: "Food listings", value: data.stats.donations, icon: "salad" as const },
    { label: "Requests", value: data.stats.requests, icon: "clipboard-list" as const },
    { label: "NGOs to review", value: data.stats.pendingNgos, icon: "building-2" as const },
  ] : [];

  return <Screen>
    <Title eyebrow="REPLATE OPERATIONS" sub="Keep an eye on the network and review organizations." >Admin</Title>
    {query.isLoading ? <Card><LoadingState label="Loading platform activity" /></Card> : query.isError
      ? <Card><EmptyState icon="cloud-alert" title="Admin data unavailable" description="Confirm this account has admin access and check the API connection." action={<Button title="Retry" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} />} /></Card>
      : data ? <>
        <SectionHeading title="Platform overview" subtitle="Current totals from RePlate." />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{metrics.map(metric => <View key={metric.label} style={{ width: "48%", flexGrow: 1, minWidth: 130 }}><MetricCard {...metric} /></View>)}</View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
          <Card style={{ flex: 1, minWidth: 135, flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 0 }}><IconBadge icon="truck" tone="gold" /><View><Text style={{ color: colors.ink, fontSize: typography.size.heading, fontWeight: typography.weight.bold }}>{data.stats.completedDeliveries}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Completed deliveries</Text></View></Card>
          <Card style={{ flex: 1, minWidth: 135, flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 0 }}><IconBadge icon="building-2" tone="gold" /><View><Text style={{ color: colors.ink, fontSize: typography.size.heading, fontWeight: typography.weight.bold }}>{pendingOrganizations.length}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Organizations to review</Text></View></Card>
        </View>

        <SectionHeading title="NGO verification" subtitle="Review registered organizations and approve eligible accounts." />
        {data.organizations.length === 0 ? <Card><EmptyState icon="building-2" title="No organizations registered" description="New organizations will appear here for review." /></Card> : data.organizations.map(org => <Card key={org.id}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}><IconBadge icon="building-2" /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold }}>{org.name}</Text><Text style={{ color: colors.secondaryText, marginTop: spacing.xxs }}>{org.user?.name} · {org.user?.email}</Text></View><Status variant={org.verified ? "success" : "warning"}>{org.verified ? "VERIFIED" : "PENDING"}</Status></View>
          <Text style={{ color: colors.secondaryText, marginTop: spacing.md, lineHeight: typography.line.small }}>{org.address}</Text>
          {!org.verified ? <Button title="Verify organization" icon="badge-check" onPress={() => verifyOrganization(org.id)} disabled={verify.isPending} loading={verify.isPending && verify.variables === org.id} /> : null}
        </Card>)}

        <SectionHeading title="User management" subtitle={`${users.length} ${users.length === 1 ? "account" : "accounts"}`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md }}>{(["ALL", "DONOR", "NGO", "VOLUNTEER", "ADMIN"] as UserRole[]).map(role => <FilterChip key={role} label={role === "ALL" ? "All" : role[0] + role.slice(1).toLowerCase()} selected={userRole === role} count={role === "ALL" ? data.users.length : data.users.filter(member => member.role === role).length} onPress={() => setUserRole(role)} />)}</View>
        {users.length === 0 ? <Card><EmptyState icon="users-round" title="No users in this group" description="Try another role filter." /></Card> : users.slice(0, 50).map(member => <Card key={member.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <IconBadge icon={member.role === "NGO" ? "building-2" : member.role === "VOLUNTEER" ? "truck" : member.role === "ADMIN" ? "shield-check" : "user-round"} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>{member.name}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>{member.email}</Text></View><Status>{member.role}</Status>
        </Card>)}

        <SectionHeading title="Donation monitoring" subtitle={`${data.donations.length} recent listings · showing up to 25`} />
        {data.donations.slice(0, 25).map(donation => <Card key={donation.id}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}><IconBadge icon="salad" /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>{donation.foodName}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>Shared by {donation.donor.name}</Text></View><Status>{donation.status}</Status></View>
          <Text style={{ color: colors.secondaryText, marginTop: spacing.sm }}>{donation.availableQuantity} of {donation.quantity} {donation.unit} available</Text>
        </Card>)}
        {data.donations.length === 0 ? <Card><EmptyState icon="package-open" title="No listings to monitor" description="Donor activity will appear here." /></Card> : null}

        <SectionHeading title="Request monitoring" subtitle={`${data.requests.length} recent requests · showing up to 30`} />
        {data.requests.slice(0, 30).map(request => <Card key={request.id}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}><IconBadge icon="clipboard-list" /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>{request.donation.foodName}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>{request.organization.name}</Text></View><Status>{request.status}</Status></View>
          <Text style={{ color: colors.secondaryText, marginTop: spacing.sm }}>Requested: {request.quantity} {request.donation.unit}{request.assignment ? ` · Volunteer: ${request.assignment.volunteer?.name ?? "Assigned"}` : ""}</Text>
        </Card>)}
        {data.requests.length === 0 ? <Card><EmptyState icon="clipboard-list" title="No requests to monitor" description="Food requests will appear here as organizations browse listings." /></Card> : null}
      </> : null}
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md }}><Lucide name="shield-check" size={16} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" /><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Administrative actions are recorded by the platform.</Text></View>
  </Screen>;
}
