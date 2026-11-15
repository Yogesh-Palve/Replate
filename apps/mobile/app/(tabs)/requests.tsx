import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { api } from "../../src/api/client";
import { Button, Card, EmptyState, FilterChip, IconBadge, LoadingState, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { invalidateDashboard, invalidateImpact } from "../../src/dashboard/cache";
import { useToast } from "../../src/notifications/ToastProvider";
import { theme } from "../../src/theme";
import { colors, radii, spacing, typography } from "../../src/theme";

type RequestAction = { id: string; op: "approve" | "reject" | "cancel" | "confirm" };
type RequestFilter = "ALL" | "REVIEW" | "ACTIVE" | "HISTORY" | "RECEIVED";
const activeStatuses = ["PENDING", "APPROVED", "VOLUNTEER_ASSIGNED", "COLLECTED", "DELIVERED"];

function filterRequestList(requests: any[], filter: RequestFilter, donor: boolean) {
  if (filter === "ALL") return requests;
  if (filter === "REVIEW") return requests.filter(request => request.status === "PENDING");
  if (filter === "RECEIVED") return requests.filter(request => request.status === "COMPLETED");
  if (filter === "ACTIVE") return requests.filter(request => activeStatuses.includes(request.status));
  return requests.filter(request => ["COMPLETED", "REJECTED", "CANCELLED"].includes(request.status) || (!donor && request.status === "COMPLETED"));
}

export default function Requests() {
  const { user, signingOut } = useAuth();
  const notify = useToast();
  const qc = useQueryClient();
  const donor = user?.role === "DONOR";
  const ngo = user?.role === "NGO";
  const [filter, setFilter] = useState<RequestFilter>("ALL");
  const [activeQr, setActiveQr] = useState<{ assignmentId: string; payload: string; expiresAt: string } | null>(null);
  const actionGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({ queryKey: ["requests"], enabled: Boolean(user && !signingOut), queryFn: async ({ signal }) => (await api.get("/requests", { signal })).data.requests });
  const action = useMutation({
    mutationFn: ({ id, op }: RequestAction) => op === "confirm"
      ? api.patch(`/requests/${id}/confirm-delivery`)
      : op === "cancel" ? api.patch(`/requests/${id}/cancel`) : api.patch(`/requests/${id}/${op}`),
    onSuccess: async (_result, variables) => {
      const successMessages = {
        approve: "Request approved; donation quantity reserved.",
        reject: "Request rejected; donation availability was unchanged.",
        cancel: "Request cancelled.",
        confirm: "Delivery confirmed. Thank you for receiving the donation.",
      };
      notify("success", successMessages[variables.op]);
      await Promise.all([qc.invalidateQueries({ queryKey: ["requests"] }), qc.invalidateQueries({ queryKey: ["donations"] }), invalidateDashboard(qc, user?.role), invalidateImpact(qc, user?.role)]);
    },
  });
  const collectionQr = useMutation({
    mutationFn: async (assignmentId: string) => (await api.post(`/assignments/${assignmentId}/collection-qr`)).data as { qrPayload: string; expiresAt: string },
    onSuccess: (result, assignmentId) => {
      setActiveQr({ assignmentId, payload: result.qrPayload, expiresAt: result.expiresAt });
      notify("success", "Collection QR generated. It expires in 10 minutes.");
    },
    onError: error => notify("error", getApiErrorMessage(error, "Collection QR could not be generated. Try again."), { duration: null }),
  });
  useEffect(() => {
    if (query.isError && user && !signingOut) notify("error", getApiErrorMessage(query.error, "Could not load requests. Check your API connection."), { duration: null });
  }, [notify, query.error, query.isError, signingOut, user]);
  const runAction = (variables: RequestAction) => {
    void actionGuard(async () => {
      try { await action.mutateAsync(variables); }
      catch (error) { notify("error", getApiErrorMessage(error, "That request could not be updated. Check your connection and try again."), { duration: null }); }
    });
  };
  const buttonBusy = (id: string, op: RequestAction["op"]) => action.isPending && action.variables?.id === id && action.variables.op === op;
  const requests = query.data || [];
  const visibleRequests = useMemo(() => filterRequestList(requests, filter, Boolean(donor)), [donor, filter, requests]);
  const filters = donor
    ? [{ key: "ALL" as const, label: "All", count: requests.length }, { key: "REVIEW" as const, label: "Needs review", count: requests.filter((item: any) => item.status === "PENDING").length }, { key: "ACTIVE" as const, label: "In progress", count: requests.filter((item: any) => activeStatuses.includes(item.status) && item.status !== "PENDING").length }, { key: "HISTORY" as const, label: "History" }]
    : [{ key: "ALL" as const, label: "All", count: requests.length }, { key: "ACTIVE" as const, label: "In progress", count: requests.filter((item: any) => activeStatuses.includes(item.status)).length }, { key: "RECEIVED" as const, label: "Received", count: requests.filter((item: any) => item.status === "COMPLETED").length }];

  return <Screen>
    <Title eyebrow={donor ? "DONOR SPACE" : "COMMUNITY INBOX"} sub={donor ? "Review requests and follow each handover." : "Track your requests from approval through delivery."}>{donor ? "Requests" : "My requests"}</Title>
    {!query.isLoading && !query.isError && requests.length > 0 ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md }}>
      {filters.map(item => <FilterChip key={item.key} label={item.label} count={item.count} selected={filter === item.key} onPress={() => setFilter(item.key)} />)}
    </View> : null}
    {query.isLoading ? <Card><LoadingState label="Loading requests" /></Card> : query.isError
      ? <Card><EmptyState icon="cloud-alert" title="Requests could not load" description="Check your connection, then try again." action={<Button title="Retry" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} />} /></Card>
      : requests.length === 0
        ? <Card><EmptyState icon={donor ? "inbox" : "clipboard-list"} title={donor ? "No requests yet" : "Your request list is empty"} description={donor ? "When an organization requests your food, you can review it here." : "Browse available food to send your first request."} /></Card>
        : visibleRequests.length === 0
          ? <Card><EmptyState icon={filter === "HISTORY" || filter === "RECEIVED" ? "archive" : "clipboard-check"} title={filter === "HISTORY" || filter === "RECEIVED" ? "Nothing in this history yet" : "You’re all caught up"} description="Requests will appear here as their status changes." /></Card>
          : <>
            <SectionHeading title={filter === "RECEIVED" ? "Received donations" : filter === "HISTORY" ? "Request history" : filter === "REVIEW" ? "Waiting for your decision" : "Recent activity"} subtitle={`${visibleRequests.length} ${visibleRequests.length === 1 ? "request" : "requests"}`} />
            {visibleRequests.map((request: any) => <Card key={request.id}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                <IconBadge icon={request.status === "COMPLETED" ? "circle-check" : "package-open"} tone={request.status === "PENDING" ? "gold" : "sage"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: typography.size.subtitle, lineHeight: typography.line.heading, fontWeight: typography.weight.bold }}>{request.donation.foodName}</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>{request.quantity} {request.donation.unit} · {donor ? request.organization.name : `Pickup: ${request.donation.pickupAddress}`}</Text>
                </View>
                <Status>{request.status}</Status>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.canvas }}>
                <Lucide name="calendar-clock" size={17} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Collect by {new Date(request.donation.collectionDeadline).toLocaleString()}</Text>
              </View>
              {request.note ? <Text style={{ color: colors.secondaryText, fontSize: typography.size.small, lineHeight: typography.line.small, marginTop: spacing.sm }}>{request.note}</Text> : null}
              {donor && request.status === "PENDING" && <View style={{ marginTop: spacing.sm }}>
                <Button title="Approve request" icon="circle-check" onPress={() => runAction({ id: request.id, op: "approve" })} disabled={action.isPending} loading={buttonBusy(request.id, "approve")} />
                <Button title="Decline request" secondary destructive icon="circle-x" onPress={() => runAction({ id: request.id, op: "reject" })} disabled={action.isPending} loading={buttonBusy(request.id, "reject")} />
              </View>}
              {ngo && ["PENDING", "APPROVED"].includes(request.status) && <Button title="Cancel request" secondary destructive icon="ban" onPress={() => runAction({ id: request.id, op: "cancel" })} disabled={action.isPending} loading={buttonBusy(request.id, "cancel")} />}
              {ngo && request.status === "DELIVERED" && <Button title="Confirm delivery" icon="package-check" onPress={() => runAction({ id: request.id, op: "confirm" })} disabled={action.isPending} loading={buttonBusy(request.id, "confirm")} />}
              {donor && request.status === "VOLUNTEER_ASSIGNED" && request.assignment?.id && <Button title="Show collection QR" icon="qr-code" onPress={() => collectionQr.mutate(request.assignment.id)} disabled={collectionQr.isPending} loading={collectionQr.isPending && collectionQr.variables === request.assignment.id} />}
              {activeQr && activeQr.assignmentId === request.assignment?.id ? <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: radii.md }}>
                <Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>Show this QR to the assigned volunteer</Text>
                <QRCode value={activeQr.payload} size={220} backgroundColor={colors.white} color={colors.ink} />
                <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Expires {new Date(activeQr.expiresAt).toLocaleTimeString()}</Text>
                <Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, textAlign: "center" }}>For your accepted assignment only. Generate a new QR if this one expires.</Text>
              </View> : null}
              {request.assignment?.volunteer ? <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md }}><Lucide name="truck" size={16} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" /><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption }}>Volunteer: {request.assignment.volunteer.name}</Text></View> : null}
            </Card>)}
          </>}
  </Screen>;
}
