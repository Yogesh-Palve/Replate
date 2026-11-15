import React, { useRef, useState } from "react";
import { Link, router } from "expo-router";
import { Text } from "react-native";
import { Button, Field, Message, Screen, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, validateLogin, type FormErrors } from "../../src/forms/validation";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitGuard = useRef(createSubmissionGuard()).current;

  const submit = () => {
    const validationErrors = validateLogin({ email, password });
    setErrors(validationErrors);
    setError("");
    if (Object.keys(validationErrors).length) return;
    void submitGuard(async () => {
      setBusy(true);
      try {
        await signIn(email.trim(), password);
        router.replace("/(tabs)");
      } catch (e) {
        setError(getApiErrorMessage(e, "Could not connect to RePlate. Check your connection and try again."));
      } finally {
        setBusy(false);
      }
    });
  };

  return <Screen>
    <Title sub="Welcome back to RePlate">Log in</Title>
    <Field label="Email" value={email} onChangeText={value => { setEmail(value); setErrors(current => clearFormError(current, "email")); }} keyboardType="email-address" error={errors.email} />
    <Field label="Password" value={password} onChangeText={value => { setPassword(value); setErrors(current => clearFormError(current, "password")); }} secureTextEntry error={errors.password} />
    <Link href="/(auth)/forgot-password"><Text style={{ color: "#16845B", marginVertical: 8 }}>Forgot password?</Text></Link>
    <Message text={error} error />
    <Button title="Log in" onPress={submit} disabled={busy} loading={busy} />
    <Text style={{ textAlign: "center", marginTop: 18, color: "#718078" }}>New to RePlate? <Link href="/(auth)/register" style={{ color: "#16845B", fontWeight: "700" }}>Create account</Link></Text>
  </Screen>;
}
