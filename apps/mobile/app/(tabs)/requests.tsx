import React, { useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, Message, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { theme } from "../../src/theme";

type RequestAction = { id: string; op: "approve" | "reject" | "cancel" | "confirm" };

export default function Requests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const donor = user?.role === "DONOR";
  const ngo = user?.role === "NGO";
  const [actionError, setActionError] = useState("");
  const actionGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({ queryKey: ["requests"], queryFn: async () => (await api.get("/requests")).data.requests });
  const action = useMutation({
    mutationFn: ({ id, op }: RequestAction) => op === "confirm"
      ? api.patch(`/requests/${id}/confirm-delivery`)
      : op === "cancel" ? api.patch(`/requests/${id}/cancel`) : api.patch(`/requests/${id}/${op}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["requests"] });
      void qc.invalidateQueries({ queryKey: ["donations"] });
    },
  });
  const runAction = (variables: RequestAction) => {
    setActionError("");
    void actionGuard(async () => {
      try { await action.mutateAsync(variables); }
      catch (error) { setActionError(getApiErrorMessage(error, "That request could not be updated. Check your connection and try again.")); }
    });
  };
  const buttonBusy = (id: string, op: RequestAction["op"]) => action.isPending && action.variables?.id === id && action.variables.op === op;

  return <Screen>
    <Title sub={donor ? "Review incoming food requests" : "Follow your requested donations"}>Requests</Title>
    <Message text={actionError} error />
    {query.isLoading ? <ActivityIndicator color={theme.green} /> : query.isError
      ? <Card><Text style={{ color: theme.red }}>{getApiErrorMessage(query.error, "Could not load requests. Check your API connection.")}</Text><Button title="Retry" onPress={() => query.refetch()} /></Card>
      : (query.data || []).length === 0
        ? <Card><Text style={{ color: theme.muted }}>No requests yet. They will appear here when there is activity.</Text></Card>
        : query.data.map((request: any) => <Card key={request.id}>
          <Text style={{ fontSize: 18, color: theme.dark, fontWeight: "800" }}>{request.donation.foodName}</Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>{request.quantity} {request.donation.unit} · {donor ? request.organization.name : `Pickup: ${request.donation.pickupAddress}`}</Text>
          <Status>{request.status}</Status>
          {request.note ? <Text style={{ color: theme.muted, marginBottom: 7 }}>{request.note}</Text> : null}
          {donor && request.status === "PENDING" && <>
            <Button title="Approve request" onPress={() => runAction({ id: request.id, op: "approve" })} disabled={action.isPending} loading={buttonBusy(request.id, "approve")} />
            <Button title="Reject" secondary onPress={() => runAction({ id: request.id, op: "reject" })} disabled={action.isPending} loading={buttonBusy(request.id, "reject")} />
          </>}
          {ngo && ["PENDING", "APPROVED"].includes(request.status) && <Button title="Cancel request" secondary onPress={() => runAction({ id: request.id, op: "cancel" })} disabled={action.isPending} loading={buttonBusy(request.id, "cancel")} />}
          {ngo && request.status === "DELIVERED" && <Button title="Confirm successful delivery" onPress={() => runAction({ id: request.id, op: "confirm" })} disabled={action.isPending} loading={buttonBusy(request.id, "confirm")} />}
          {request.assignment?.volunteer && <Text style={{ color: theme.muted }}>Volunteer: {request.assignment.volunteer.name}</Text>}
        </Card>)}
  </Screen>;
}
