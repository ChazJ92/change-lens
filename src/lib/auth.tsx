import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; loading: boolean };
const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
      router.invalidate();
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, loading: false });
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);