import React, { useEffect, useMemo, useRef, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, EmptyState, FilterChip, IconBadge, LoadingState, Screen, SectionHeading, Status, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { useToast } from "../../src/notifications/ToastProvider";
import { filterTasks, type TaskFilter } from "../../src/tasks/state";
import { colors, spacing, theme, typography } from "../../src/theme";

type TaskAction = { id: string; op: "accept" | "collect" | "decline" | "deliver" };

export default function Tasks() {
  const { user } = useAuth();
  const notify = useToast();
  const qc = useQueryClient();
  const profile = (user as any)?.volunteerProfile;
  const [available, setAvailable] = useState(profile?.available ?? true);
  const [filter, setFilter] = useState<TaskFilter>("ALL");
  const actionGuard = useRef(createSubmissionGuard()).current;
  const availabilityGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({ queryKey: ["tasks"], queryFn: async () => (await api.get("/volunteer/tasks")).data.tasks });
  const tasks = query.data ?? [];
  const shownTasks = useMemo(() => filterTasks(tasks, filter), [filter, tasks]);
  const availabilityMutation = useMutation({ mutationFn: (value: boolean) => api.patch("/volunteer/availability", { available: value }) });
  const action = useMutation({
    mutationFn: ({ id, op }: TaskAction) => api.patch(`/assignments/${id}/${op}`),
    onSuccess: (_result, variables) => {
      const successMessages = { accept: "Assignment accepted.", collect: "Collection recorded.", decline: "Assignment declined.", deliver: "Delivery marked complete." };
      notify("success", successMessages[variables.op]);
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["requests"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
  useEffect(() => { if (query.isError) notify("error", getApiErrorMessage(query.error, "Could not load tasks. Check your API connection."), { duration: null }); }, [notify, query.error, query.isError]);
  useEffect(() => { if (profile?.available !== undefined) setAvailable(profile.available); }, [profile?.available]);

  const setAvailability = (value: boolean) => {
    void availabilityGuard(async () => {
      try {
        await availabilityMutation.mutateAsync(value);
        setAvailable(value);
        notify("success", value ? "You are available for assignments." : "You are unavailable for assignments.");
        await qc.invalidateQueries({ queryKey: ["profile"] });
      } catch (error) { notify("error", getApiErrorMessage(error, "Availability could not be updated. Try again."), { duration: null }); }
    });
  };
  const runAction = (variables: TaskAction) => { void actionGuard(async () => {
    try { await action.mutateAsync(variables); }
    catch (error) { notify("error", getApiErrorMessage(error, "This task could not be updated. Check your connection and try again."), { duration: null }); }
  }); };
  const buttonBusy = (id: string, op: TaskAction["op"]) => action.isPending && action.variables?.id === id && action.variables.op === op;
  const filters: { key: TaskFilter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: tasks.length },
    { key: "OPEN", label: "Open", count: filterTasks(tasks, "OPEN").length },
    { key: "ACTIVE", label: "In progress", count: filterTasks(tasks, "ACTIVE").length },
    { key: "COMPLETED", label: "Completed", count: filterTasks(tasks, "COMPLETED").length },
  ];

  return <Screen>
    <Title eyebrow="LAST MILE, BIG IMPACT" sub="Manage your assignments from pickup through delivery.">Volunteer tasks</Title>
    <Card style={{ backgroundColor: colors.surfaceSoft, borderColor: "#E2EBDD" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <IconBadge icon="truck" tone={available ? "green" : "sage"} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: typography.weight.bold }}>Available for assignments</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.caption, marginTop: spacing.xxs }}>{available ? "You can receive new delivery tasks." : "You will not receive new tasks."}</Text></View>
        <Switch value={available} onValueChange={setAvailability} disabled={availabilityMutation.isPending} trackColor={{ true: theme.green }} accessibilityLabel="Available for assignments" />
      </View>
    </Card>
    {query.isSuccess && tasks.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md }}>{filters.map(item => <FilterChip key={item.key} label={item.label} count={item.count} selected={filter === item.key} onPress={() => setFilter(item.key)} />)}</View> : null}
    {query.isLoading ? <Card><LoadingState label="Loading assignments" /></Card> : query.isError
      ? <Card><EmptyState icon="cloud-alert" title="Assignments could not load" description="Check your connection, then try again." action={<Button title="Retry" secondary icon="refresh-cw" onPress={() => { void query.refetch(); }} />} /></Card>
      : shownTasks.length === 0
        ? <Card><EmptyState icon={filter === "COMPLETED" ? "circle-check" : "package-open"} title={filter === "COMPLETED" ? "No completed tasks yet" : filter === "OPEN" ? "No open assignments" : filter === "ACTIVE" ? "Nothing in progress" : "No assignments right now"} description={filter === "ALL" ? "New delivery opportunities will appear here when available." : "Try another filter or check back later."} /></Card>
        : <>
          <SectionHeading title={filter === "COMPLETED" ? "Completed tasks" : filter === "OPEN" ? "Open assignments" : filter === "ACTIVE" ? "In progress" : "Your assignments"} subtitle={`${shownTasks.length} ${shownTasks.length === 1 ? "task" : "tasks"}`} />
          {shownTasks.map((task: any) => <Card key={task.id}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}><IconBadge icon="package-check" /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: typography.size.subtitle, lineHeight: typography.line.heading, fontWeight: typography.weight.bold }}>{task.request.donation.foodName}</Text><Text style={{ color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs }}>Deliver to {task.request.organization.name}</Text></View><Status>{task.status}</Status></View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md }}><Lucide name="map-pin" size={17} color={colors.secondaryText} accessibilityElementsHidden importantForAccessibility="no" /><Text style={{ color: colors.ink, flex: 1, lineHeight: typography.line.small }}>{task.request.donation.pickupAddress}</Text></View>
            <Text style={{ color: colors.secondaryText, marginTop: spacing.sm }}>Quantity: {task.request.quantity} {task.request.donation.unit}</Text>
            {task.status === "OPEN" && <Button title="Accept task" icon="handshake" onPress={() => runAction({ id: task.id, op: "accept" })} disabled={action.isPending} loading={buttonBusy(task.id, "accept")} />}
            {task.status === "ACCEPTED" && <><Button title="Mark food collected" icon="package-check" onPress={() => runAction({ id: task.id, op: "collect" })} disabled={action.isPending} loading={buttonBusy(task.id, "collect")} /><Button title="Decline task" secondary icon="x" onPress={() => runAction({ id: task.id, op: "decline" })} disabled={action.isPending} loading={buttonBusy(task.id, "decline")} /></>}
            {task.status === "COLLECTED" && <Button title="Mark delivered" icon="truck" onPress={() => runAction({ id: task.id, op: "deliver" })} disabled={action.isPending} loading={buttonBusy(task.id, "deliver")} />}
          </Card>)}
        </>}
  </Screen>;
}
