import React from "react";
import { Image, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

export function BrandLockup({ markSize = 54, centered = false, showTagline = true }: { markSize?: number; centered?: boolean; showTagline?: boolean }) {
  return <View accessible accessibilityLabel="RePlate. Good Food. Shared Better." style={{ flexDirection: "row", alignItems: "center", justifyContent: centered ? "center" : "flex-start", marginBottom: spacing.xl }}>
    <Image source={require("../../assets/branding/replate-mark.png")} resizeMode="contain" accessibilityIgnoresInvertColors style={{ width: markSize, height: markSize, marginRight: spacing.sm }} />
    <View>
      <Text style={{ color: colors.ink, fontSize: typography.size.title, lineHeight: typography.line.title, fontWeight: typography.weight.heavy, letterSpacing: -0.6 }}>RePlate</Text>
      {showTagline && <Text style={{ color: colors.primary, fontSize: typography.size.caption, lineHeight: typography.line.caption, fontWeight: typography.weight.semibold, letterSpacing: 0.15 }}>Good Food. Shared Better.</Text>}
    </View>
  </View>;
}
