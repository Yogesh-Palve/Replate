import React, { useRef, useState } from "react";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../src/api/client";
import { Button, Card, Screen, Title } from "../src/components/ui";
import { getCollectionToken } from "../src/collection/qr";
import { invalidateDashboard, invalidateImpact } from "../src/dashboard/cache";
import { getApiErrorMessage } from "../src/forms/validation";
import { useToast } from "../src/notifications/ToastProvider";
import { colors, spacing, typography } from "../src/theme";

export default function ScanCollection() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const notify = useToast();
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  const onBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (lock.current || !assignmentId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const token = getCollectionToken(data, assignmentId);
    if (!token) {
      setError("This QR code does not match the selected assignment. Scan the donor’s collection QR.");
      setBusy(false);
      return;
    }
    try {
      await api.patch(`/assignments/${assignmentId}/collect`, { token });
      notify("success", "Collection verified. Food collected.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["requests"] }),
        invalidateDashboard(qc, "VOLUNTEER"),
        invalidateImpact(qc, "VOLUNTEER"),
      ]);
      router.back();
    } catch (cause) {
      const message = getApiErrorMessage(cause, "Collection could not be verified. Try scanning again.");
      setError(message);
      notify("error", message, { duration: null });
      setBusy(false);
    }
  };

  if (!assignmentId) return <Screen><Title>Collection QR</Title><Card><Text style={{ color: colors.error }}>No assignment was selected. Return to Volunteer tasks and open Scan collection QR.</Text></Card></Screen>;
  return <Screen>
    <Title eyebrow="VOLUNTEER COLLECTION" sub="Ask the donor to display the QR for this accepted assignment, then scan it here.">Verify collection</Title>
    <Card>
      {!permission ? <Text style={{ color: colors.secondaryText }}>Checking camera permission…</Text>
        : !permission.granted ? <>
          <Text style={{ color: colors.secondaryText, lineHeight: typography.line.body }}>RePlate needs camera access to read the donor’s one-time collection code.</Text>
          <Button title="Allow camera access" icon="camera" onPress={() => { void requestPermission(); }} />
        </>
          : <View style={{ overflow: "hidden", borderRadius: 16, height: 360, backgroundColor: colors.ink }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={busy ? undefined : onBarcodeScanned}
            />
          </View>}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error, marginTop: spacing.md }}>{error}</Text> : null}
      {busy ? <Text accessibilityRole="text" style={{ color: colors.secondaryText, marginTop: spacing.md }}>Verifying collection…</Text> : null}
      {error ? <Button title="Scan again" secondary icon="scan-line" onPress={() => { setError(""); lock.current = false; }} /> : null}
      {permission?.granted ? <Text style={{ color: colors.secondaryText, marginTop: spacing.md, fontSize: typography.size.caption }}>QR codes expire after 10 minutes and can be used once.</Text> : null}
    </Card>
  </Screen>;
}
