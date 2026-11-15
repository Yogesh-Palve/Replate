import React from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/context/AuthContext";
import { theme } from "../src/theme";
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } });
export default function Layout() { return <QueryClientProvider client={client}><AuthProvider><Stack screenOptions={{ headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.dark, contentStyle: { backgroundColor: theme.bg } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="(auth)" options={{ headerShown: false }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack></AuthProvider></QueryClientProvider>; }
