import React from "react";
import { Image, Text, View } from "react-native";
import { Link } from "expo-router";
import { Lucide } from "@react-native-vector-icons/lucide";
import { BrandLockup } from "../../src/components/BrandLockup";
import { Button, Screen } from "../../src/components/ui";
import { colors, radii, spacing, typography } from "../../src/theme";

export default function Welcome() {
  return <Screen>
    <BrandLockup markSize={48} />
    <View style={{ backgroundColor: colors.surfaceSoft, borderRadius: radii.xl, padding: spacing.xl, minHeight: 300, justifyContent: "space-between", overflow: "hidden", marginBottom: spacing.xl }}>
      <View style={{ position: "absolute", width: 210, height: 210, borderRadius: 110, backgroundColor: "#E4EDE0", right: -62, top: -60 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface }}>
        <Lucide name="sparkles" size={14} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={{ color: colors.primary, fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: 0.8 }}>FOOD RESCUE, MADE EASY</Text>
      </View>
      <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
        <Image source={require("../../assets/branding/replate-mark.png")} resizeMode="contain" accessibilityLabel="RePlate plate and leaf logo" style={{ width: 132, height: 132 }} />
      </View>
      <View>
        <Text style={{ color: colors.ink, fontSize: typography.size.display, lineHeight: 40, fontWeight: typography.weight.heavy, letterSpacing: -1.1 }}>Good Food.{"\n"}Shared Better.</Text>
        <Text style={{ color: colors.secondaryText, fontSize: typography.size.body, lineHeight: typography.line.body, marginTop: spacing.sm }}>Help good food reach the people and communities who need it.</Text>
      </View>
    </View>
    <Link href="/(auth)/login" asChild><Button title="Log in" icon="arrow-right" onPress={() => {}} /></Link>
    <Link href="/(auth)/register" asChild><Button title="Create an account" secondary icon="user-round-plus" onPress={() => {}} /></Link>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.md }}>
      <Lucide name="shield-check" size={16} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>A community powered by care and less waste.</Text>
    </View>
  </Screen>;
}
