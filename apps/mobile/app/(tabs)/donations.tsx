import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, DateTimeField, Field, Message, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { clearFormError, createSubmissionGuard, getApiErrorMessage, validateDonation, validateRequestQuantity, type DonationValues, type FormErrors } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { theme } from "../../src/theme";

type Donation = {
  id: string;
  foodName: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  pickupAddress: string;
  collectionDeadline: string;
  status: string;
};

function DonationCard({
  item, donor, requester, onRequest, onCancel, requestPending, cancelPending,
}: {
  item: Donation; donor: boolean; requester: boolean; onRequest: (id: string, quantity: number) => void; onCancel: (id: string) => void;
  requestPending: boolean; cancelPending: boolean;
}) {
  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState("");
  const request = () => {
    const validationError = validateRequestQuantity(quantity, item.availableQuantity);
    setQuantityError(validationError ?? "");
    if (!validationError) onRequest(item.id, Number(quantity));
  };

  return <Card>
    <Text style={{ fontSize: 18, fontWeight: "800", color: theme.dark }}>{item.foodName}</Text>
    <Text style={{ color: theme.muted, marginTop: 5 }}>{item.category} · {item.availableQuantity} {item.unit} available</Text>
    <Text style={{ color: theme.text, marginTop: 8 }}>{item.pickupAddress}</Text>
    <Text style={{ color: theme.muted, marginTop: 5 }}>Collect by {new Date(item.collectionDeadline).toLocaleString()}</Text>
    <Status>{item.status}</Status>
    {donor
      ? <>
        <Text style={{ color: theme.muted }}>Prepared quantity: {item.quantity} {item.unit}</Text>
        <Button title="Cancel listing" secondary onPress={() => onCancel(item.id)} disabled={cancelPending} loading={cancelPending} />
      </>
      : requester ? <View style={{ marginTop: 8 }}>
        <Field label={`How many ${item.unit}?`} value={quantity} onChangeText={value => { setQuantity(value); setQuantityError(""); }} keyboardType="number-pad" error={quantityError} />
        <Button title="Request food" onPress={request} disabled={requestPending} loading={requestPending} />
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
  const { user } = useAuth();
  const donor = user?.role === "DONOR";
  const requester = user?.role === "NGO";
  const notify = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const query = useQuery({
    queryKey: ["donations", search, categoryFilter],
    queryFn: async () => (await api.get("/donations", { params: { search, category: categoryFilter || undefined } })).data.donations as Donation[],
  });

  const requestMutation = useMutation({ mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => api.post(`/donations/${id}/requests`, { quantity }) });
  const cancelMutation = useMutation({ mutationFn: (id: string) => api.patch(`/donations/${id}/cancel`) });
  const requestGuard = useRef(createSubmissionGuard()).current;
  const cancelGuard = useRef(createSubmissionGuard()).current;
  useEffect(() => {
    if (query.isError) notify("error", getApiErrorMessage(query.error, "Could not load donations. Check the API connection."), { duration: null });
  }, [notify, query.error, query.isError]);

  const runRequest = (id: string, quantity: number) => {
    void requestGuard(async () => {
      try {
        await requestMutation.mutateAsync({ id, quantity });
        notify("success", "Request sent to the donor.");
        void qc.invalidateQueries({ queryKey: ["donations"] });
        void qc.invalidateQueries({ queryKey: ["requests"] });
      } catch (error) {
        notify("error", getApiErrorMessage(error, "Your request could not be sent. Check your connection and try again."), { duration: null });
      }
    });
  };

  const runCancel = (id: string) => Alert.alert("Cancel donation?", "This listing will no longer be available.", [
    { text: "Keep listing", style: "cancel" },
    { text: "Cancel listing", style: "destructive", onPress: () => {
      void cancelGuard(async () => {
        try {
          await cancelMutation.mutateAsync(id);
          notify("success", "Donation listing cancelled.");
          void qc.invalidateQueries({ queryKey: ["donations"] });
        } catch (error) {
          notify("error", getApiErrorMessage(error, "The listing could not be cancelled. Try again."), { duration: null });
        }
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
      ...values,
      foodName: values.foodName.trim(),
      category: values.category.trim(),
      quantity: Number(values.quantity),
      unit: values.unit.trim(),
      pickupAddress: values.pickupAddress.trim(),
      description: values.description.trim() || undefined,
      preparedAt: values.preparedAt!.toISOString(),
      collectionDeadline: values.collectionDeadline!.toISOString(),
    }),
    onSuccess: () => {
      setForm(false);
      notify("success", "Donation published successfully.");
      setFields(emptyForm);
      setPreparedDate(null); setPreparedTime(null); setDeadlineDate(null); setDeadlineTime(null);
      setFormErrors({});
      void qc.invalidateQueries({ queryKey: ["donations"] });
    },
  });

  const submitDonation = () => {
    const values = { ...fields, preparedAt: combineDateAndTime(preparedDate, preparedTime), collectionDeadline: combineDateAndTime(deadlineDate, deadlineTime) };
    const validationErrors = validateDonation(values);
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setFields(values);
    void createGuard(async () => {
      try {
        // Use validated values directly so the request cannot race state updates.
        await createMutation.mutateAsync(values);
      } catch (error) {
        notify("error", getApiErrorMessage(error, "The donation could not be published. Check your connection and try again."), { duration: null });
      }
    });
  };

  return <Screen>
    <Title sub={donor ? "Food you are sharing with your community" : "Find fresh surplus food near you"}>{donor ? "My donations" : "Available food"}</Title>
    {donor && <Button title={form ? "Close form" : "+ Share a donation"} onPress={() => { setForm(value => !value); setFormErrors({}); }} />}
    {donor && form && <Card>
      <Field label="Food name" value={fields.foodName} onChangeText={value => setField("foodName", value)} error={formErrors.foodName} />
      <Field label="Category" value={fields.category} onChangeText={value => setField("category", value)} error={formErrors.category} />
      <Field label="Quantity" value={fields.quantity} onChangeText={value => setField("quantity", value)} keyboardType="number-pad" error={formErrors.quantity} />
      <Field label="Unit" value={fields.unit} onChangeText={value => setField("unit", value)} error={formErrors.unit} />
      <DateTimeField label="Preparation date" mode="date" value={preparedDate} onChange={value => { setPreparedDate(value); setFields(current => ({ ...current, preparedAt: combineDateAndTime(value, preparedTime) })); setFormErrors(current => clearFormError(clearFormError(current, "preparedAt"), "collectionDeadline")); }} error={!preparedDate ? formErrors.preparedAt : undefined} />
      <DateTimeField label="Preparation time" mode="time" value={preparedTime} onChange={value => { setPreparedTime(value); setFields(current => ({ ...current, preparedAt: combineDateAndTime(preparedDate, value) })); setFormErrors(current => clearFormError(clearFormError(current, "preparedAt"), "collectionDeadline")); }} error={preparedDate && !preparedTime ? formErrors.preparedAt : undefined} />
      <DateTimeField label="Collection date" mode="date" value={deadlineDate} onChange={value => { setDeadlineDate(value); setFields(current => ({ ...current, collectionDeadline: combineDateAndTime(value, deadlineTime) })); setFormErrors(current => clearFormError(current, "collectionDeadline")); }} error={!deadlineDate ? formErrors.collectionDeadline : undefined} />
      <DateTimeField label="Collection time" mode="time" value={deadlineTime} onChange={value => { setDeadlineTime(value); setFields(current => ({ ...current, collectionDeadline: combineDateAndTime(deadlineDate, value) })); setFormErrors(current => clearFormError(current, "collectionDeadline")); }} error={deadlineDate && !deadlineTime ? formErrors.collectionDeadline : undefined} />
      {deadlineDate && deadlineTime && formErrors.collectionDeadline ? <Message text={formErrors.collectionDeadline} error /> : null}
      <Field label="Pickup address" value={fields.pickupAddress} onChangeText={value => setField("pickupAddress", value)} multiline error={formErrors.pickupAddress} />
      <Field label="Notes (optional)" value={fields.description} onChangeText={value => setField("description", value)} multiline error={formErrors.description} />
      <Button title="Publish donation" onPress={submitDonation} disabled={createMutation.isPending} loading={createMutation.isPending} />
    </Card>}
    {!donor && <>
      <Field label="Search food" value={search} onChangeText={setSearch} />
      <Field label="Filter by category" value={categoryFilter} onChangeText={setCategoryFilter} placeholder="For example, prepared meals" />
    </>}
    {query.isLoading ? <ActivityIndicator color={theme.green} /> : query.isError
      ? <Card><Button title="Retry" onPress={() => query.refetch()} /></Card>
      : (query.data || []).length === 0
        ? <Card><Text style={{ color: theme.muted }}>{donor ? "You have not shared a donation yet." : "No available donations found."}</Text></Card>
        : (query.data || []).map(item => <DonationCard
          key={item.id} item={item} donor={Boolean(donor)} requester={Boolean(requester)} onRequest={runRequest} onCancel={runCancel}
          requestPending={requestMutation.isPending} cancelPending={cancelMutation.isPending}
        />)}
  </Screen>;
}
