import React, { useRef, useState } from "react";
import { Link, router } from "expo-router";
import { Text, View } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { BrandLockup } from "../../src/components/BrandLockup";
import { Button, Card, Field, Screen, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, validateLogin, type FormErrors } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

export default function Login() {
  const { signIn } = useAuth();
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const submitGuard = useRef(createSubmissionGuard()).current;

  const submit = () => {
    const validationErrors = validateLogin({ email, password });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    void submitGuard(async () => {
      setBusy(true);
      try {
        await signIn(email.trim(), password);
        notify("success", "You are signed in.");
        router.replace("/(tabs)");
      } catch (e) {
        notify("error", getApiErrorMessage(e, "Could not connect to RePlate. Check your connection and try again."), { duration: null });
      } finally {
        setBusy(false);
      }
    });
  };

  return <Screen>
    <BrandLockup markSize={46} />
    <Title eyebrow="YOUR COMMUNITY, CONNECTED" sub="Sign in to continue sharing food and making an impact.">Welcome back</Title>
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg }}>
        <View style={{ width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surfaceSoft, alignItems: "center", justifyContent: "center" }}>
          <Lucide name="lock-keyhole" size={20} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold }}>Log in</Text>
          <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: 2 }}>Use your RePlate account details.</Text>
        </View>
      </View>
      <Field label="Email address" value={email} onChangeText={value => { setEmail(value); setErrors(current => clearFormError(current, "email")); }} keyboardType="email-address" autoComplete="email" icon="mail" placeholder="you@example.com" error={errors.email} />
      <Field label="Password" value={password} onChangeText={value => { setPassword(value); setErrors(current => clearFormError(current, "password")); }} secureTextEntry autoComplete="password" icon="lock-keyhole" placeholder="Enter your password" error={errors.password} />
      <View style={{ alignItems: "flex-end", marginBottom: spacing.sm }}>
        <Link href="/(auth)/forgot-password" accessibilityRole="link"><Text style={{ color: colors.primary, fontWeight: typography.weight.semibold, fontSize: typography.size.small }}>Forgot password?</Text></Link>
      </View>
      <Button title="Log in to RePlate" icon="arrow-right" onPress={submit} disabled={busy} loading={busy} />
    </Card>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: spacing.sm, paddingVertical: spacing.md }}>
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.small }}>New to RePlate? </Text>
      <Link href="/(auth)/register" accessibilityRole="link"><Text style={{ color: colors.primary, fontWeight: typography.weight.bold, fontSize: typography.size.small }}>Create an account</Text></Link>
    </View>
  </Screen>;
}
