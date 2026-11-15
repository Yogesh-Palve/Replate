import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { Link } from "expo-router";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, DateTimeField, EmptyState, Field, FilterChip, IconBadge, LoadingState, Message, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { applyDonationStatus, filterDonationsByBucket, getDonationCardState, type DonationBucket } from "../../src/donations/state";
import { invalidateDashboard } from "../../src/dashboard/cache";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, validateDonation, type DonationValues, type FormErrors } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

type Donation = {
  id: string; foodName: string; category: string; quantity: number; availableQuantity: number; unit: string;
  pickupAddress: string; collectionDeadline: string; status: string; description?: string; donor?: { name: string };
};

function DonationCard({ item, donor, requester, onCancel, cancelPending }: {
  item: Donation; donor: boolean; requester: boolean; onCancel: (id: string) => void; cancelPending: boolean;
}) {
  const donationCard = getDonationCardState(item.status);

  return <Card>
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
      <IconBadge icon="salad" tone="sage" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontSize: typography.size.subtitle, lineHeight: typography.line.heading, fontWeight: typography.weight.bold }}>{item.foodName}</Text>
        <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>{item.category}{item.donor?.name ? ` · Shared by ${item.donor.name}` : ""}</Text>
      </View>
      <Status>{donationCard.statusLabel}</Status>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.canvas }}>
      <Lucide name="package-check" size={19} color={colors.primary} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>{item.availableQuantity} {item.unit}</Text>
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>available of {item.quantity}</Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md }}>
      <Lucide name="map-pin" size={17} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={{ color: colors.ink, flex: 1, lineHeight: typography.line.small }}>{item.pickupAddress}</Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
      <Lucide name="calendar-clock" size={17} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.small }}>Collect by {new Date(item.collectionDeadline).toLocaleString()}</Text>
    </View>
    {item.description ? <Text style={{ color: colors.secondaryText, fontSize: typography.size.small, lineHeight: typography.line.small, marginTop: spacing.sm }}>{item.description}</Text> : null}
    {donor ? <>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
      <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Prepared quantity: {item.quantity} {item.unit}</Text>
      {donationCard.showCancelAction && <Button title="Cancel listing" secondary destructive icon="ban" onPress={() => onCancel(item.id)} disabled={cancelPending} loading={cancelPending} />}
    </> : requester ? <View style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Link href={{ pathname: "/donation/[id]", params: { id: item.id } }} asChild><Button title="View donation details" secondary icon="arrow-right" onPress={() => {}} /></Link>
    </View> : null}
  </Card>;
}

const emptyForm: DonationValues = {
  foodName: "", category: "Prepared meals", quantity: "", unit: "meal packets",
  preparedAt: null, collectionDeadline: null, pickupAddress: "", description: "",
};

function combineDateAndTime(date: Date | null, time: Date | null): Date | null {
  if (!date || !time) return null;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

export default function Donations() {
  const { user, signingOut } = useAuth();
  const donor = user?.role === "DONOR";
  const requester = user?.role === "NGO";
  const notify = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bucket, setBucket] = useState<DonationBucket>("ACTIVE");
  const query = useQuery({
    queryKey: ["donations", search, categoryFilter],
    enabled: Boolean(user && !signingOut),
    queryFn: async ({ signal }) => (await api.get("/donations", { params: { search, category: categoryFilter || undefined }, signal })).data.donations as Donation[],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/donations/${id}/cancel`);
      const cancelled = response.data?.donation as Donation | undefined;
      if (cancelled?.id !== id || cancelled.status !== "CANCELLED") throw new Error("The server did not confirm that this donation was cancelled. Refresh the list and try again.");
      return cancelled;
    },
    onSuccess: async cancelled => {
      await qc.cancelQueries({ queryKey: ["donations"] });
      qc.setQueriesData<Donation[]>({ queryKey: ["donations"] }, current => applyDonationStatus(current, cancelled.id, cancelled.status));
      await Promise.all([qc.invalidateQueries({ queryKey: ["donations"] }), qc.invalidateQueries({ queryKey: ["requests"] }), qc.invalidateQueries({ queryKey: ["admin"] }), invalidateDashboard(qc, "DONOR")]);
    },
  });
  const cancelGuard = useRef(createSubmissionGuard()).current;
  useEffect(() => {
    if (query.isError && user && !signingOut) notify("error", getApiErrorMessage(query.error, "Could not load donations. Check the API connection."), { duration: null });
  }, [notify, query.error, query.isError, signingOut, user]);

  const runCancel = (id: string) => Alert.alert("Cancel donation?", "This listing will no longer be available.", [
    { text: "Keep listing", style: "cancel" },
    { text: "Cancel listing", style: "destructive", onPress: () => {
      void cancelGuard(async () => {
        try { await cancelMutation.mutateAsync(id); notify("success", "Donation listing cancelled successfully."); }
        catch (error) { notify("error", getApiErrorMessage(error, "The listing could not be cancelled. Try again."), { duration: null }); }
      });
    } },
  ]);

  const [form, setForm] = useState(false);
  const [fields, setFields] = useState<DonationValues>(emptyForm);
  const [preparedDate, setPreparedDate] = useState<Date | null>(null);
  const [preparedTime, setPreparedTime] = useState<Date | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<Date | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const createGuard = useRef(createSubmissionGuard()).current;
  const setField = (key: "foodName" | "category" | "quantity" | "unit" | "pickupAddress" | "description", value: string) => {
    setFields(current => ({ ...current, [key]: value }));
    setFormErrors(current => clearFormError(current, key));
  };
  const createMutation = useMutation({
    mutationFn: (values: DonationValues) => api.post("/donations", {
      ...values, foodName: values.foodName.trim(), category: values.category.trim(), quantity: Number(values.quantity), unit: values.unit.trim(),
      pickupAddress: values.pickupAddress.trim(), description: values.description.trim() || undefined,
      preparedAt: values.preparedAt!.toISOString(), collectionDeadline: values.collectionDeadline!.toISOString(),
    }),
    onSuccess: async () => {
      setForm(false); notify("success", "Donation published successfully."); setFields(emptyForm);
      setPreparedDate(null); setPreparedTime(null); setDeadlineDate(null); setDeadlineTime(null); setFormErrors({});
      await Promise.all([qc.invalidateQueries({ queryKey: ["donations"] }), invalidateDashboard(qc, "DONOR")]);
    },
  });
  const submitDonation = () => {
    const values = { ...fields, preparedAt: combineDateAndTime(preparedDate, preparedTime), collectionDeadline: combineDateAndTime(deadlineDate, deadlineTime) };
    const validationErrors = validateDonation(values);
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setFields(values);
    void createGuard(async () => {
      try { await createMutation.mutateAsync(values); }
      catch (error) { notify("error", getApiErrorMessage(error, "The donation could not be published. Check your connection and try again."), { duration: null }); }
    });
  };

  const allDonations = query.data ?? [];
  const activeCount = filterDonationsByBucket(allDonations, "ACTIVE").length;
  const historyCount = filterDonationsByBucket(allDonations, "HISTORY").length;
  const visibleDonations = donor ? filterDonationsByBucket(allDonations, bucket) : allDonations;

  return <Screen>
    <Title eyebrow={donor ? "DONOR SPACE" : "LOCAL FOOD NETWORK"} sub={donor ? "Everything you have shared with your community." : "Browse food listings shared on RePlate."}>{donor ? "My donations" : "Discover food"}</Title>
    {donor ? <>
      {!form ? <Button title="Share a donation" icon="plus" onPress={() => { setForm(true); setFormErrors({}); }} /> : null}
      {query.isSuccess ? <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md }}>
        <FilterChip label="Active" selected={bucket === "ACTIVE"} count={activeCount} onPress={() => setBucket("ACTIVE")} />
        <FilterChip label="History" selected={bucket === "HISTORY"} count={historyCount} onPress={() => setBucket("HISTORY")} />
      </View> : null}
    </> : <>
      <Field label="Search food" value={search} onChangeText={setSearch} icon="search" placeholder="Search by food or details" />
      <Field label="Filter by category" value={categoryFilter} onChangeText={setCategoryFilter} icon="list-filter" placeholder="For example, prepared meals" />
    </>}

    {donor && form ? <Card style={{ marginTop: spacing.lg }}>
      <SectionHeading title="Create a listing" subtitle="Add clear details so your food can find a home." action={<Button title="Close" secondary icon="x" onPress={() => { setForm(false); setFormErrors({}); }} />} />
      <Field label="Food name" value={fields.foodName} onChangeText={value => setField("foodName", value)} icon="salad" placeholder="For example, vegetable curry" error={formErrors.foodName} />
      <Field label="Category" value={fields.category} onChangeText={value => setField("category", value)} icon="tags" error={formErrors.category} />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Field label="Quantity" value={fields.quantity} onChangeText={value => setField("quantity", value)} keyboardType="number-pad" icon="hash" error={formErrors.quantity} /></View>
        <View style={{ flex: 1 }}><Field label="Unit" value={fields.unit} onChangeText={value => setField("unit", value)} icon="scale" error={formErrors.unit} /></View>
      </View>
      <SectionHeading title="Timing" subtitle="Set when it was prepared and when it must be collected." />
      <DateTimeField label="Preparation date" mode="date" value={preparedDate} onChange={value => { setPreparedDate(value); setFields(current => ({ ...current, preparedAt: combineDateAndTime(value, preparedTime) })); setFormErrors(current => clearFormError(clearFormError(current, "preparedAt"), "collectionDeadline")); }} error={!preparedDate ? formErrors.preparedAt : undefined} />
      <DateTimeField label="Preparation time" mode="time" value={preparedTime} onChange={value => { setPreparedTime(value); setFields(current => ({ ...current, preparedAt: combineDateAndTime(preparedDate, value) })); setFormErrors(current => clearFormError(clearFormError(current, "preparedAt"), "collectionDeadline")); }} error={preparedDate && !preparedTime ? formErrors.preparedAt : undefined} />
      <DateTimeField label="Collection date" mode="date" value={deadlineDate} onChange={value => { setDeadlineDate(value); setFields(current => ({ ...current, collectionDeadline: combineDateAndTime(value, deadlineTime) })); setFormErrors(current => clearFormError(current, "collectionDeadline")); }} error={!deadlineDate ? formErrors.collectionDeadline : undefined} />
      <DateTimeField label="Collection time" mode="time" value={deadlineTime} onChange={value => { setDeadlineTime(value); setFields(current => ({ ...current, collectionDeadline: combineDateAndTime(deadlineDate, value) })); setFormErrors(current => clearFormError(current, "collectionDeadline")); }} error={deadlineDate && !deadlineTime ? formErrors.collectionDeadline : undefined} />
      {deadlineDate && deadlineTime && formErrors.collectionDeadline ? <Message text={formErrors.collectionDeadline} error /> : null}
      <SectionHeading title="Pickup details" />
      <Field label="Pickup address" value={fields.pickupAddress} onChangeText={value => setField("pickupAddress", value)} multiline icon="map-pin" placeholder="Where should the volunteer collect it?" error={formErrors.pickupAddress} />
      <Field label="Notes (optional)" value={fields.description} onChangeText={value => setField("description", value)} multiline icon="notebook-pen" placeholder="Allergen, storage or handover notes" error={formErrors.description} />
      <Button title="Publish donation" icon="arrow-right" onPress={submitDonation} disabled={createMutation.isPending} loading={createMutation.isPending} />
    </Card> : null}

    <SectionHeading title={donor ? bucket === "ACTIVE" ? "Active listings" : "Donation history" : "Available listings"} subtitle={donor ? "Status and pickup details for each listing." : "Check quantity and collection details before requesting."} />
    {query.isLoading ? <Card><LoadingState label="Loading donations" /></Card> : query.isError
      ? <Card><EmptyState icon="cloud-alert" title="Donations could not load" description="Check your connection, then try again." action={<Button title="Retry" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} />} /></Card>
      : visibleDonations.length === 0
        ? <Card><EmptyState icon={donor ? bucket === "ACTIVE" ? "package-plus" : "archive" : "search-x"} title={donor ? bucket === "ACTIVE" ? "No active listings yet" : "Your history is clear" : "No matching food found"} description={donor ? bucket === "ACTIVE" ? "Share surplus food when you are ready. Your listing will appear here." : "Cancelled, expired and fully reserved listings will appear here." : "Try another search or category, or check back soon."} action={donor && bucket === "ACTIVE" ? <Button title="Create a donation" secondary icon="plus" onPress={() => setForm(true)} /> : undefined} /></Card>
        : visibleDonations.map(item => <DonationCard key={item.id} item={item} donor={Boolean(donor)} requester={Boolean(requester)} onCancel={runCancel} cancelPending={cancelMutation.isPending} />)}
  </Screen>;
}
