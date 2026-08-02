"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FALLBACK_FX, loadFxSnapshot, type FxSnapshot } from "@/lib/fx";

interface FxContextValue {
  fx: FxSnapshot;
  /** False until the client has finished resolving cache/live rates. */
  ready: boolean;
}

const FxContext = createContext<FxContextValue>({
  fx: FALLBACK_FX,
  ready: false,
});

/**
 * Resolves exchange rates once per session and hands them to the tree.
 *
 * The first render — server and client alike — always uses the bundled
 * snapshot, so hydration matches exactly. Live rates are fetched afterwards
 * and swapped in if they arrive; if they don't, the app carries on with the
 * fallback and the UI says which is in use.
 */
export function FxProvider({ children }: { children: React.ReactNode }) {
  const [fx, setFx] = useState<FxSnapshot>(FALLBACK_FX);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFxSnapshot()
      .then((snapshot) => {
        if (!cancelled) setFx(snapshot);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FxContext.Provider value={{ fx, ready }}>{children}</FxContext.Provider>
  );
}

export function useFx() {
  return useContext(FxContext);
}
