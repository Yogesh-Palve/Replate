import React from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Button, Screen, Title } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
export default function Welcome() { return <Screen><View style={{ flex: 1, minHeight: 650, justifyContent: "center" }}><View accessible={false} style={{ marginBottom: 18 }}><Lucide name="salad" size={64} color={theme.green} /></View><Title sub="Good food deserves a second plate.">Share more. Waste less.</Title><Text style={{ color: theme.muted, lineHeight: 24, marginBottom: 24 }}>RePlate connects surplus food with local organizations and the volunteers who get it there.</Text><Link href="/(auth)/login" asChild><Button title="Log in" onPress={() => {}} /></Link><Link href="/(auth)/register" asChild><Button title="Create an account" secondary onPress={() => {}} /></Link></View></Screen>; }
