import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, EmptyState, Field, IconBadge, LoadingState, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard, getApiErrorMessage, validateRequestQuantity } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, spacing, typography } from "../../src/theme";

type Donation = { id: string; foodName: string; category: string; quantity: number; availableQuantity: number; unit: string; pickupAddress: string; collectionDeadline: string; preparedAt: string; status: string; description?: string; donor?: { name: string } };

export default function DonationDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, signingOut } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState<string>();
  const guard = useRef(createSubmissionGuard()).current;
  const query = useQuery({ queryKey: ["donation", id], enabled: Boolean(id && user && !signingOut), queryFn: async ({ signal }) => (await api.get(`/donations/${id}`, { signal })).data.donation as Donation });
  const requestMutation = useMutation({
    mutationFn: async (amount: number) => api.post(`/requests/donations/${id}/requests`, { quantity: amount }),
    onSuccess: async () => {
      notify("success", "Request sent to the donor.");
      await Promise.all([qc.invalidateQueries({ queryKey: ["requests"] }), qc.invalidateQueries({ queryKey: ["donations"] }), qc.invalidateQueries({ queryKey: ["donation", id] })]);
      router.replace("/(tabs)/requests");
    },
  });
  useEffect(() => { if (query.isError && user && !signingOut) notify("error", getApiErrorMessage(query.error, "Could not load this donation. Try again."), { duration: null }); }, [notify, query.error, query.isError, signingOut, user]);
  const donation = query.data;
  const requestable = user?.role === "NGO" && donation && ["AVAILABLE", "PARTIALLY_RESERVED"].includes(donation.status) && donation.availableQuantity > 0 && new Date(donation.collectionDeadline) > new Date();
  const submitRequest = () => {
    if (!donation) return;
    const error = validateRequestQuantity(quantity, donation.availableQuantity);
    setQuantityError(error);
    if (error) return;
    void guard(async () => {
      try { await requestMutation.mutateAsync(Number(quantity)); }
      catch (failure) { notify("error", getApiErrorMessage(failure, "Your request could not be sent. Please try again."), { duration: null }); }
    });
  };

  return <Screen>
    {query.isLoading ? <Card><LoadingState label="Loading donation details" /></Card> : query.isError || !donation
      ? <Card><EmptyState icon="cloud-alert" title="Donation details unavailable" description="The listing may have changed or your connection may be offline." action={<Button title="Try again" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} />} /></Card>
      : <>
        <Title eyebrow="FOOD LISTING" sub={donation.category}>{donation.foodName}</Title>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}><IconBadge icon="package-check" /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: typography.size.heading, fontWeight: typography.weight.bold }}>{donation.availableQuantity} {donation.unit}</Text><Text style={{ color: colors.secondaryText }}>available of {donation.quantity} {donation.unit}</Text></View><Status>{donation.status.replaceAll("_", " ")}</Status></View>
          <SectionHeading title="Pickup information" />
          <Text style={{ color: colors.ink, lineHeight: typography.line.body }}>{donation.pickupAddress}</Text>
          <Text style={{ color: colors.secondaryText, marginTop: spacing.md }}>Collect by {new Date(donation.collectionDeadline).toLocaleString()}</Text>
          <Text style={{ color: colors.secondaryText, marginTop: spacing.xs }}>Prepared {new Date(donation.preparedAt).toLocaleString()}</Text>
          {donation.donor?.name ? <Text style={{ color: colors.secondaryText, marginTop: spacing.xs }}>Shared by {donation.donor.name}</Text> : null}
          {donation.description ? <><SectionHeading title="Donor notes" /><Text style={{ color: colors.ink, lineHeight: typography.line.body }}>{donation.description}</Text></> : null}
        </Card>
        {requestable ? <Card>
          <SectionHeading title="Request this food" subtitle="Your request will be reviewed by the donor." />
          <Field label={`Quantity (${donation.unit})`} value={quantity} onChangeText={value => { setQuantity(value); setQuantityError(undefined); }} keyboardType="number-pad" icon="hash" placeholder={`Up to ${donation.availableQuantity}`} error={quantityError} />
          <Button title="Send request" icon="send" onPress={submitRequest} loading={requestMutation.isPending} disabled={requestMutation.isPending} />
        </Card> : user?.role === "NGO" ? <Card><Text style={{ color: colors.secondaryText }}>This listing is no longer available to request.</Text></Card> : null}
      </>}
  </Screen>;
}
