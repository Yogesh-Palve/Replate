import React, { useRef, useState } from "react";
import { Link, router } from "expo-router";
import { Text } from "react-native";
import { Button, Field, Screen, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, validateLogin, type FormErrors } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { BrandLockup } from "../../src/components/BrandLockup";
import { theme, typography } from "../../src/theme";

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
    <BrandLockup markSize={48} />
    <Title sub="Welcome back to RePlate">Log in</Title>
    <Field label="Email" value={email} onChangeText={value => { setEmail(value); setErrors(current => clearFormError(current, "email")); }} keyboardType="email-address" error={errors.email} />
    <Field label="Password" value={password} onChangeText={value => { setPassword(value); setErrors(current => clearFormError(current, "password")); }} secureTextEntry error={errors.password} />
    <Link href="/(auth)/forgot-password"><Text style={{ color: theme.green, marginVertical: 8 }}>Forgot password?</Text></Link>
    <Button title="Log in" onPress={submit} disabled={busy} loading={busy} />
    <Text style={{ textAlign: "center", marginTop: 18, color: theme.muted }}>New to RePlate? <Link href="/(auth)/register" style={{ color: theme.green, fontWeight: typography.weight.bold }}>Create account</Link></Text>
  </Screen>;
}
