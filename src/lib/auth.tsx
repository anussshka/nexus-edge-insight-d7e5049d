import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserSession } from "./api";

const AuthCtx = createContext<{
  user: UserSession | null;
  setUser: (u: UserSession | null) => void;
  logout: () => void;
}>({ user: null, setUser: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserSession | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewAs = localStorage.getItem("cnc_view_as");
    if (viewAs) {
      try { setUserState(JSON.parse(viewAs)); return; } catch {}
    }
    const raw = sessionStorage.getItem("cnc_user");
    if (raw) { try { setUserState(JSON.parse(raw)); } catch {} }
  }, []);

  const setUser = (u: UserSession | null) => {
    setUserState(u);
    if (typeof window === "undefined") return;
    if (u) sessionStorage.setItem("cnc_user", JSON.stringify(u));
    else sessionStorage.removeItem("cnc_user");
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("cnc_user");
      sessionStorage.removeItem("cnc_selected_machine");
      localStorage.removeItem("cnc_view_as");
    }
    setUserState(null);
  };

  return <AuthCtx.Provider value={{ user, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
