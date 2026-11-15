import React from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Button, Screen, Title } from "../../src/components/ui";
import { theme } from "../../src/theme";
export default function Welcome() { return <Screen><View style={{ flex: 1, minHeight: 650, justifyContent: "center" }}><Text style={{ fontSize: 62, marginBottom: 18 }}>🥗</Text><Title sub="Good food deserves a second plate.">Share more. Waste less.</Title><Text style={{ color: theme.muted, lineHeight: 24, marginBottom: 24 }}>RePlate connects surplus food with local organizations and the volunteers who get it there.</Text><Link href="/(auth)/login" asChild><Button title="Log in" onPress={() => {}} /></Link><Link href="/(auth)/register" asChild><Button title="Create an account" secondary onPress={() => {}} /></Link></View></Screen>; }
