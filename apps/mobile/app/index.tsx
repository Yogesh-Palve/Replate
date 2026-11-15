import React from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { theme } from "../src/theme";
export default function Index() { const { user, loading } = useAuth(); if (loading) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={theme.green} size="large" /></View>; return <Redirect href={user ? "/(tabs)" : "/(auth)/welcome"} />; }
