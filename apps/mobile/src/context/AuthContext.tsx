import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";
import { persistAuthToken } from "./authSession";
import type { AuthUser } from "@replate/shared";
type AuthValue = { user: AuthUser | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; register: (payload: Record<string, string>) => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const token = await SecureStore.getItemAsync("accessToken"); if (token) { try { const { data } = await api.get("/auth/me"); setUser(data.user); } catch { await SecureStore.deleteItemAsync("accessToken"); } } setLoading(false); })(); }, []);
  const save = async (data: any, flow: "login" | "registration") => {
    await persistAuthToken(data.accessToken, value => SecureStore.setItemAsync("accessToken", value), flow);
    setUser(data.user);
  };
  const signIn = async (email: string, password: string) => { const { data } = await api.post("/auth/login", { email, password }); await save(data, "login"); };
  const register = async (payload: Record<string, string>) => { const { data } = await api.post("/auth/register", payload); await save(data, "registration"); };
  const signOut = async () => { await SecureStore.deleteItemAsync("accessToken"); setUser(null); };
  return <Context.Provider value={{ user, loading, signIn, register, signOut }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider missing"); return value; }
