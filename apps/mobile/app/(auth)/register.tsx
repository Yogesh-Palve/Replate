import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";
import { BrandLockup } from "../../src/components/BrandLockup";
import { Button, Card, Field, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, getApiValidationErrors, validateRegistration, type FormErrors, type RegistrationValues } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

const roles = [
  { id: "DONOR", title: "Share surplus food", description: "Restaurants, kitchens and people", icon: "hand-heart" },
  { id: "NGO", title: "Request for an NGO", description: "Community organizations", icon: "building-2" },
  { id: "VOLUNTEER", title: "Deliver with care", description: "Volunteer to move food locally", icon: "truck" },
] as const satisfies ReadonlyArray<{ id: RegistrationValues["role"]; title: string; description: string; icon: LucideIconName }>;

export default function Register() {
  const { register } = useAuth();
  const notify = useToast();
  const [role, setRole] = useState<RegistrationValues["role"]>("DONOR");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const submitGuard = useRef(createSubmissionGuard()).current;

  const submit = () => {
    const values: RegistrationValues = { name, email, password, role, organizationName, address };
    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    void submitGuard(async () => {
      setBusy(true);
      try {
        await register({
          name: name.trim(), email: email.trim(), password, role,
          ...(role === "NGO" ? { organizationName: organizationName.trim(), address: address.trim() } : {}),
        });
        notify("success", "Your account is ready.");
        router.replace("/(tabs)");
      } catch (e) {
        const serverFieldErrors = getApiValidationErrors(e);
        if (Object.keys(serverFieldErrors).length) {
          setErrors(current => ({ ...current, ...serverFieldErrors }));
        } else {
          notify("error", getApiErrorMessage(e, "Registration could not be completed. Check your connection and try again."), { duration: null });
        }
      } finally {
        setBusy(false);
      }
    });
  };

  return <Screen>
    <BrandLockup markSize={46} />
    <Title eyebrow="JOIN YOUR LOCAL FOOD NETWORK" sub="Choose how you would like to help your community.">Create your account</Title>
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" }}>
          <Lucide name="users-round" size={20} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold }}>I’m joining as a</Text>
          <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: 2 }}>You can’t change your role later.</Text>
        </View>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Choose an account role">
        {roles.map(item => {
          const selected = role === item.id;
          return <Pressable
            key={item.id}
            onPress={() => { setRole(item.id); setErrors({}); }}
            accessibilityRole="radio"
            accessibilityLabel={`${item.title}. ${item.description}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.successSoft : colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, opacity: pressed ? 0.88 : 1 })}
          >
            <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: selected ? colors.surface : colors.surfaceSoft, alignItems: "center", justifyContent: "center" }}>
              <Lucide name={item.icon} size={20} color={selected ? colors.primary : colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: typography.size.small, fontWeight: typography.weight.bold }}>{item.title}</Text>
              <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: 3 }}>{item.description}</Text>
            </View>
            <Lucide name={selected ? "circle-check" : "circle"} size={21} color={selected ? colors.primary : colors.border} accessibilityElementsHidden importantForAccessibility="no" />
          </Pressable>;
        })}
      </View>
    </Card>

    <Card>
      <Text style={{ color: colors.ink, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold, marginBottom: spacing.md }}>A few details</Text>
      <Field label="Your name" value={name} onChangeText={value => { setName(value); setErrors(current => clearFormError(current, "name")); }} autoComplete="name" icon="user-round" placeholder="How should we greet you?" error={errors.name} />
      <Field label="Email address" value={email} onChangeText={value => { setEmail(value); setErrors(current => clearFormError(current, "email")); }} keyboardType="email-address" autoComplete="email" icon="mail" placeholder="you@example.com" error={errors.email} />
      <Field label="Password (8+ characters)" value={password} onChangeText={value => { setPassword(value); setErrors(current => clearFormError(current, "password")); }} secureTextEntry autoComplete="new-password" icon="lock-keyhole" placeholder="Create a secure password" error={errors.password} />
      {role === "NGO" && <>
        <View style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}><Status variant="warning">NGO verification is required before requesting food.</Status></View>
        <Field label="Organization name" value={organizationName} onChangeText={value => { setOrganizationName(value); setErrors(current => clearFormError(current, "organizationName")); }} icon="building-2" placeholder="Your registered organization" error={errors.organizationName} />
        <Field label="Organization address" value={address} onChangeText={value => { setAddress(value); setErrors(current => clearFormError(current, "address")); }} multiline icon="map-pin" placeholder="Street, city and area" error={errors.address} />
      </>}
      <Button title="Create account" icon="arrow-right" onPress={submit} disabled={busy} loading={busy} />
      <Pressable onPress={() => router.replace("/(auth)/login")} accessibilityRole="link" style={{ alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
        <Text style={{ color: colors.secondaryText, fontSize: typography.size.small }}>Already have an account? <Text style={{ color: colors.primary, fontWeight: typography.weight.bold }}>Log in</Text></Text>
      </Pressable>
    </Card>
  </Screen>;
}
