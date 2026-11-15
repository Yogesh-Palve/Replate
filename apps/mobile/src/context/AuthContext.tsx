import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";
import { endLocalSession, persistAuthToken } from "./authSession";
import type { AuthUser } from "@replate/shared";
type AuthValue = { user: AuthUser | null; loading: boolean; signingOut: boolean; signIn: (email: string, password: string) => Promise<void>; register: (payload: Record<string, string>) => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { (async () => { const token = await SecureStore.getItemAsync("accessToken"); if (token) { try { const { data } = await api.get("/auth/me"); setUser(data.user); } catch { await SecureStore.deleteItemAsync("accessToken"); } } setLoading(false); })(); }, []);
  const save = async (data: any, flow: "login" | "registration") => {
    await persistAuthToken(data.accessToken, value => SecureStore.setItemAsync("accessToken", value), flow);
    setUser(data.user);
  };
  const signIn = async (email: string, password: string) => { const { data } = await api.post("/auth/login", { email, password }); await save(data, "login"); };
  const register = async (payload: Record<string, string>) => { const { data } = await api.post("/auth/register", payload); await save(data, "registration"); };
  const signOut = async () => {
    setSigningOut(true);
    try {
      await endLocalSession({
        cancelPendingQueries: () => queryClient.cancelQueries(),
        removeToken: () => SecureStore.deleteItemAsync("accessToken"),
        clearUserData: () => { setUser(null); queryClient.clear(); },
      });
    } finally { setSigningOut(false); }
  };
  return <Context.Provider value={{ user, loading, signingOut, signIn, register, signOut }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider missing"); return value; }
