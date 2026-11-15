import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Button, Card, IconBadge, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

function DetailRow({ icon, label, value }: { icon: "mail" | "building-2" | "map-pin" | "truck"; label: string; value: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
    <Lucide name={icon} size={18} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
    <View style={{ flex: 1 }}><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>{label}</Text><Text style={{ color: colors.ink, fontSize: typography.size.small, fontWeight: typography.weight.medium, marginTop: spacing.xxs }}>{value}</Text></View>
  </View>;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const signOutGuard = useRef(createSubmissionGuard()).current;
  const logOut = () => {
    void signOutGuard(async () => {
      setBusy(true);
      try {
        await signOut();
        notify("success", "You are signed out.");
        router.replace("/(auth)/welcome");
      } catch {
        notify("error", "You could not be signed out securely. Please try again.", { duration: null });
      } finally { setBusy(false); }
    });
  };
  type ProfileUser = Omit<NonNullable<typeof user>, "organization"> & {
    organization?: { id: string; name: string; address: string; verified: boolean } | null;
    volunteerProfile?: { available?: boolean } | null;
  };
  const profile = user as ProfileUser | null;
  const roleName = user?.role === "NGO" ? "Community organization" : user?.role ? user.role[0] + user.role.slice(1).toLowerCase() : "RePlate member";
  const initials = (user?.name || "R").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  return <Screen>
    <Title eyebrow="YOUR ACCOUNT" sub="Your details and account status." >Profile</Title>
    <Card style={{ backgroundColor: colors.surfaceSoft, borderColor: "#E2EBDD", borderRadius: radii.xl, alignItems: "center", paddingVertical: spacing.xl }}>
      <View accessibilityLabel={`${user?.name ?? "Member"} profile avatar`} style={{ width: 76, height: 76, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
        <Text style={{ color: colors.white, fontSize: typography.size.title, fontWeight: typography.weight.heavy }}>{initials}</Text>
      </View>
      <Text style={{ color: colors.ink, fontSize: typography.size.heading, lineHeight: typography.line.heading, textAlign: "center", fontWeight: typography.weight.bold }}>{user?.name}</Text>
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs }}>{roleName}</Text>
      <View style={{ marginTop: spacing.sm }}><Status variant="success">{user?.role ?? "MEMBER"}</Status></View>
    </Card>

    <SectionHeading title="Account details" />
    <Card>
      {user?.email ? <DetailRow icon="mail" label="Email address" value={user.email} /> : null}
      {profile?.organization ? <>
        <DetailRow icon="building-2" label="Organization" value={profile.organization.name} />
        <DetailRow icon="map-pin" label="Organization address" value={profile.organization.address} />
        <View style={{ paddingTop: spacing.sm }}><Status variant={profile.organization.verified ? "success" : "warning"}>{profile.organization.verified ? "Organization verified" : "Awaiting organization verification"}</Status></View>
      </> : null}
      {user?.role === "VOLUNTEER" ? <>
        <DetailRow icon="truck" label="Assignment availability" value={profile?.volunteerProfile?.available ? "Available" : "Currently unavailable"} />
        <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, lineHeight: typography.line.caption }}>You can update availability from the Tasks tab.</Text>
      </> : null}
    </Card>

    <SectionHeading title="Session" subtitle="Keep your account secure on shared devices." />
    <Button title="Log out" secondary destructive icon="log-out" onPress={logOut} disabled={busy} loading={busy} />
  </Screen>;
}
