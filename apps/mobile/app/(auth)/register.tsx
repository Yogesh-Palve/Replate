import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Button, Field, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, getApiValidationErrors, validateRegistration, type FormErrors, type RegistrationValues } from "../../src/forms/validation";
import { theme } from "../../src/theme";
import { useToast } from "../../src/notifications/ToastProvider";

const roles = ["DONOR", "NGO", "VOLUNTEER"] as const;

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
    <Title sub="Join your local food-sharing community">Create account</Title>
    <Text style={{ color: theme.dark, fontWeight: "600", marginBottom: 8 }}>I am joining as</Text>
    {roles.map(item => <Pressable key={item} onPress={() => { setRole(item); setErrors({}); }} style={{ backgroundColor: role === item ? theme.pale : theme.white, borderColor: role === item ? theme.green : theme.border, borderWidth: 1, padding: 13, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: theme.dark, fontWeight: "600" }}>{item === "NGO" ? "Community organization (NGO)" : item[0] + item.slice(1).toLowerCase()}</Text>
    </Pressable>)}
    <Field label="Your name" value={name} onChangeText={value => { setName(value); setErrors(current => clearFormError(current, "name")); }} error={errors.name} />
    <Field label="Email" value={email} onChangeText={value => { setEmail(value); setErrors(current => clearFormError(current, "email")); }} keyboardType="email-address" error={errors.email} />
    <Field label="Password (8+ characters)" value={password} onChangeText={value => { setPassword(value); setErrors(current => clearFormError(current, "password")); }} secureTextEntry error={errors.password} />
    {role === "NGO" && <>
      <Field label="Organization name" value={organizationName} onChangeText={value => { setOrganizationName(value); setErrors(current => clearFormError(current, "organizationName")); }} error={errors.organizationName} />
      <Field label="Organization address" value={address} onChangeText={value => { setAddress(value); setErrors(current => clearFormError(current, "address")); }} multiline error={errors.address} />
      <Status>Account verification is required before requesting food.</Status>
    </>}
    <Button title="Create account" onPress={submit} disabled={busy} loading={busy} />
  </Screen>;
}
