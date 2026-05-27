import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthState = { user: User | null; loading: boolean };
const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;
    let cleanup: (() => void) | undefined;

    getSupabaseBrowserClient().then((supabase) => {
      if (!mounted) return;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setState({ user: session?.user ?? null, loading: false });
        router.invalidate();
        qc.invalidateQueries();
      });
      cleanup = () => subscription.unsubscribe();
      supabase.auth.getSession().then(({ data }) => {
        if (mounted) setState({ user: data.session?.user ?? null, loading: false });
      });
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [router, qc]);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);