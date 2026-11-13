/** Query client, API instance and the hooks every screen uses. */

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createApi } from "./api";
import type { Api } from "./api";
import { currentTokenProvider, isDemoMode } from "./auth";import { todayISO } from "./money";
import type { Bootstrap } from "./types";

const tokenProvider = async (): Promise<string | null> => {
  const provider = currentTokenProvider();
  if (!provider) return null;
  return provider();
};

export const api: Api = createApi(isDemoMode ? null : tokenProvider);

export const BOOTSTRAP_KEY = ["bootstrap"] as const;

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [persister] = useState(() =>
    createSyncStoragePersister({ storage: window.localStorage, key: "spendly.cache", throttleTime: 2000 }),
  );

  return (
    <PersistQueryClientProvider client={client} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}>
      {children}
    </PersistQueryClientProvider>
  );
}

export function useBootstrap() {
  return useQuery<Bootstrap>({
    queryKey: BOOTSTRAP_KEY,
    queryFn: () => api.getBootstrap(),
  });
}

/** Today in the Africa/Douala time zone. */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

export function useRefresh() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: BOOTSTRAP_KEY }), [client]);
}

/**
 * Runs a write, then refreshes the cached data. The UI is updated by the
 * optimistic cache write inside each screen, so this stays small.
 */
export function useApiMutation<TArgs extends unknown[]>(
  mutation: (...args: TArgs) => Promise<unknown>,
  options?: { onSuccess?: () => void; onError?: (error: unknown) => void },
) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (args: TArgs) => mutation(...args),
    onSuccess: () => {
      options?.onSuccess?.();
      void refresh();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
