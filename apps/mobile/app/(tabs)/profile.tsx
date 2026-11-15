import React, { useRef, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Card, Message, Screen, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard } from "../../src/forms/validation";
import { theme } from "../../src/theme";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signOutGuard = useRef(createSubmissionGuard()).current;
  const logOut = () => {
    setError("");
    void signOutGuard(async () => {
      setBusy(true);
      try {
        await signOut();
        router.replace("/(auth)/welcome");
      } catch {
        setError("You could not be signed out securely. Please try again.");
      } finally {
        setBusy(false);
      }
    });
  };

  return <Screen>
    <Title sub="Your RePlate account and preferences">Profile</Title>
    <Card>
      <Text style={{ fontSize: 20, fontWeight: "800", color: theme.dark }}>{user?.name}</Text>
      <Text style={{ color: theme.muted, marginTop: 5 }}>{user?.email}</Text>
      <Text style={{ color: theme.green, fontWeight: "700", marginTop: 12 }}>{user?.role}</Text>
      {user?.organization && <Text style={{ color: theme.muted, marginTop: 8 }}>{user.organization.name} · {user.organization.verified ? "Verified" : "Awaiting verification"}</Text>}
    </Card>
    <Message text={error} error />
    <Button title="Log out" secondary onPress={logOut} disabled={busy} loading={busy} />
  </Screen>;
}
