import React from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/context/AuthContext";
import { theme } from "../src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../src/notifications/ToastProvider";
import { StatusBar } from "expo-status-bar";
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } });
export default function Layout() { return <SafeAreaProvider><StatusBar style="dark" /><ToastProvider><QueryClientProvider client={client}><AuthProvider><Stack screenOptions={{ headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.dark, contentStyle: { backgroundColor: theme.bg } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="(auth)" options={{ headerShown: false }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="donation/[id]" options={{ title: "Donation details", headerBackTitle: "Discover" }} /></Stack></AuthProvider></QueryClientProvider></ToastProvider></SafeAreaProvider>; }
