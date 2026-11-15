import React, { useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api/client";
import { Button, Card, Message, Screen, Status, Title } from "../../src/components/ui";
import { createSubmissionGuard, getApiErrorMessage } from "../../src/forms/validation";
import { theme } from "../../src/theme";

type DashboardData = { stats: Record<string, number>; organizations: any[]; requests: any[]; users: any[]; donations: any[] };

export default function Admin() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState("");
  const actionGuard = useRef(createSubmissionGuard()).current;
  const query = useQuery({
    queryKey: ["admin"],
    queryFn: async (): Promise<DashboardData> => {
      const [stats, orgs, requests, users, donations] = await Promise.all([
        api.get("/admin/stats"), api.get("/admin/organizations"), api.get("/admin/requests"), api.get("/admin/users"), api.get("/admin/donations"),
      ]);
      return { stats: stats.data.stats, organizations: orgs.data.organizations, requests: requests.data.requests, users: users.data.users, donations: donations.data.donations };
    },
  });
  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/organizations/${id}/verify`, { verified: true }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin"] }); },
  });
  const verifyOrganization = (id: string) => {
    setActionError("");
    void actionGuard(async () => {
      try { await verify.mutateAsync(id); }
      catch (error) { setActionError(getApiErrorMessage(error, "Organization verification could not be saved. Try again.")); }
    });
  };

  return <Screen>
    <Title sub="Review organizations and monitor the platform">Admin dashboard</Title>
    <Message text={actionError} error />
    {query.isLoading ? <ActivityIndicator color={theme.green} /> : query.isError
      ? <Card><Text style={{ color: theme.red }}>{getApiErrorMessage(query.error, "Admin data could not be loaded. Confirm this account has admin access.")}</Text><Button title="Retry" onPress={() => query.refetch()} /></Card>
      : <>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "800", color: theme.dark }}>Platform statistics</Text>
          {Object.entries(query.data!.stats).map(([key, value]) => <Text key={key} style={{ color: theme.text, marginTop: 8 }}>{key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)}: {String(value)}</Text>)}
        </Card>
        <Text style={{ fontSize: 19, fontWeight: "800", color: theme.dark, marginVertical: 10 }}>NGO verification</Text>
        {query.data!.organizations.length === 0
          ? <Card><Text style={{ color: theme.muted }}>No organizations registered.</Text></Card>
          : query.data!.organizations.map(organization => <Card key={organization.id}>
            <Text style={{ fontWeight: "700", color: theme.dark }}>{organization.name}</Text>
            <Text style={{ color: theme.muted }}>{organization.address}</Text>
            <Status>{organization.verified ? "VERIFIED" : "PENDING"}</Status>
            {!organization.verified && <Button title="Verify organization" onPress={() => verifyOrganization(organization.id)} disabled={verify.isPending} loading={verify.isPending && verify.variables === organization.id} />}
          </Card>)}
        <Text style={{ fontSize: 19, fontWeight: "800", color: theme.dark, marginVertical: 10 }}>Recent donations</Text>
        {query.data!.donations.slice(0, 25).map(donation => <Card key={donation.id}>
          <Text style={{ fontWeight: "700", color: theme.dark }}>{donation.foodName} · {donation.donor.name}</Text>
          <Text style={{ color: theme.muted }}>{donation.availableQuantity}/{donation.quantity} {donation.unit} available</Text>
          <Status>{donation.status}</Status>
        </Card>)}
        <Text style={{ fontSize: 19, fontWeight: "800", color: theme.dark, marginVertical: 10 }}>Users</Text>
        {query.data!.users.slice(0, 25).map(member => <Card key={member.id}>
          <Text style={{ fontWeight: "700", color: theme.dark }}>{member.name}</Text>
          <Text style={{ color: theme.muted }}>{member.email} · {member.role}</Text>
        </Card>)}
        <Text style={{ fontSize: 19, fontWeight: "800", color: theme.dark, marginVertical: 10 }}>Recent requests</Text>
        {query.data!.requests.slice(0, 30).map(request => <Card key={request.id}>
          <Text style={{ fontWeight: "700", color: theme.dark }}>{request.donation.foodName} · {request.organization.name}</Text>
          <Status>{request.status}</Status>
        </Card>)}
      </>}
  </Screen>;
}
