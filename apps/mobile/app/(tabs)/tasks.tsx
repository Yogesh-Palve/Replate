import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Switch, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, Screen, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { theme } from "../../src/theme";

type TaskAction = { id: string; op: "accept" | "collect" | "decline" | "deliver" };

export default function Tasks() {
  const { user } = useAuth();
  const notify = useToast();
  const qc = useQueryClient();
  const profile = (user as any)?.volunteerProfile;
  const [available, setAvailable] = useState(profile?.available ?? true);
  const actionGuard = useRef(createSubmissionGuard()).current;
  const availabilityGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({ queryKey: ["tasks"], queryFn: async () => (await api.get("/volunteer/tasks")).data.tasks });
  const availability = useMutation({ mutationFn: (value: boolean) => api.patch("/volunteer/availability", { available: value }) });
  const action = useMutation({
    mutationFn: ({ id, op }: TaskAction) => api.patch(`/assignments/${id}/${op}`),
    onSuccess: (_result, variables) => {
      const successMessages = {
        accept: "Assignment accepted.",
        collect: "Collection recorded.",
        decline: "Assignment declined.",
        deliver: "Delivery marked complete.",
      };
      notify("success", successMessages[variables.op]);
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
  useEffect(() => {
    if (query.isError) notify("error", getApiErrorMessage(query.error, "Could not load tasks. Check your API connection."), { duration: null });
  }, [notify, query.error, query.isError]);
  const setAvailability = (value: boolean) => {
    void availabilityGuard(async () => {
      try {
        await availability.mutateAsync(value);
        setAvailable(value);
        notify("success", value ? "You are available for assignments." : "You are unavailable for assignments.");
      } catch (error) {
        notify("error", getApiErrorMessage(error, "Availability could not be updated. Try again."), { duration: null });
      }
    });
  };
  const runAction = (variables: TaskAction) => {
    void actionGuard(async () => {
      try { await action.mutateAsync(variables); }
      catch (error) { notify("error", getApiErrorMessage(error, "This task could not be updated. Check your connection and try again."), { duration: null }); }
    });
  };
  const buttonBusy = (id: string, op: TaskAction["op"]) => action.isPending && action.variables?.id === id && action.variables.op === op;

  return <Screen>
    <Title sub="Help food reach the people who need it">Volunteer tasks</Title>
    <Card>
      <Text style={{ color: theme.dark, fontWeight: "700" }}>Available for assignments</Text>
      <Switch value={available} onValueChange={setAvailability} disabled={availability.isPending} trackColor={{ true: theme.green }} />
      {availability.isPending && <ActivityIndicator color={theme.green} />}
    </Card>
    {query.isLoading ? <ActivityIndicator color={theme.green} /> : query.isError
      ? <Card><Button title="Retry" onPress={() => query.refetch()} /></Card>
      : (query.data || []).length === 0
        ? <Card><Text style={{ color: theme.muted }}>No open or assigned tasks right now.</Text></Card>
        : query.data.map((task: any) => <Card key={task.id}>
          <Text style={{ color: theme.dark, fontWeight: "800", fontSize: 18 }}>{task.request.donation.foodName}</Text>
          <Text style={{ color: theme.muted, marginTop: 5 }}>Deliver to {task.request.organization.name}</Text>
          <Text style={{ color: theme.text, marginTop: 7 }}>Pickup: {task.request.donation.pickupAddress}</Text>
          <Text style={{ color: theme.muted }}>Quantity: {task.request.quantity} {task.request.donation.unit}</Text>
          <Status>{task.status}</Status>
          {task.status === "OPEN" && <Button title="Accept task" onPress={() => runAction({ id: task.id, op: "accept" })} disabled={action.isPending} loading={buttonBusy(task.id, "accept")} />}
          {task.status === "ACCEPTED" && <>
            <Button title="Mark food collected" onPress={() => runAction({ id: task.id, op: "collect" })} disabled={action.isPending} loading={buttonBusy(task.id, "collect")} />
            <Button title="Decline task" secondary onPress={() => runAction({ id: task.id, op: "decline" })} disabled={action.isPending} loading={buttonBusy(task.id, "decline")} />
          </>}
          {task.status === "COLLECTED" && <Button title="Mark delivered" onPress={() => runAction({ id: task.id, op: "deliver" })} disabled={action.isPending} loading={buttonBusy(task.id, "deliver")} />}
        </Card>)}
  </Screen>;
}
