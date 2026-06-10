import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getBrowserDataClient } from "@/lib/local-data";
import type { AppUser } from "@/lib/data";

type LocalSessionState = { user: AppUser | null; loading: boolean };
const LocalSessionCtx = createContext<LocalSessionState>({ user: null, loading: true });

/**
 * Provides the seeded browser-only demo user. This is not authentication; it is
 * just enough identity for local product flows, audit rows and ownership labels.
 */
export function LocalSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalSessionState>({ user: null, loading: true });
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;
    let cleanup: (() => void) | undefined;

    getBrowserDataClient().then((db) => {
      if (!mounted) return;
      const {
        data: { subscription },
      } = db.auth.onAuthStateChange((_event: string, session: { user: AppUser } | null) => {
        setState({ user: session?.user ?? null, loading: false });
        router.invalidate();
        qc.invalidateQueries();
      });
      cleanup = () => subscription.unsubscribe();
      db.auth.getSession().then(({ data }: { data: { session: { user: AppUser } | null } }) => {
        if (mounted) setState({ user: data.session?.user ?? null, loading: false });
      });
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [router, qc]);

  return <LocalSessionCtx.Provider value={state}>{children}</LocalSessionCtx.Provider>;
}

export const useLocalSession = () => useContext(LocalSessionCtx);
