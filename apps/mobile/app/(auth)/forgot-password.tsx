import React from "react";
import { Text } from "react-native";
import { Screen, Title } from "../../src/components/ui";
import { theme } from "../../src/theme";
export default function ForgotPassword() { return <Screen><Title>Account recovery</Title><Text style={{ color: theme.muted, lineHeight: 23 }}>Email recovery is not configured for this project yet. Please contact your RePlate administrator to regain access.</Text></Screen>; }
