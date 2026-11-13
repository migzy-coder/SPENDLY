/**
 * Authentication.
 *
 * Clerk owns the accounts. When no Clerk key is present the app falls back to
 * a local demo profile so it can still be opened and reviewed on a laptop.
 */

import { lazy, Suspense, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./auth-context";
import type { AuthValue } from "./auth-context";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const isDemoMode = !CLERK_KEY;
const DEMO_ENTERED_KEY = "spendly.demo.entered";

const ClerkBoundary = lazy(() => import("./clerk").then((module) => ({ default: module.ClerkBoundary })));

function DemoAuth({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem(DEMO_ENTERED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const signInDemo = useCallback(async () => {
    try {
      localStorage.setItem(DEMO_ENTERED_KEY, "1");
    } catch {
      /* ignore */
    }
    setEntered(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      userId: entered ? "local-user" : null,
      name: "",
      email: null,
      imageUrl: null,
      isSignedIn: entered,
      isLoaded: true,
      isDemo: true,
      getToken: async () => null,
      signOut: async () => {
        try {
          localStorage.removeItem(DEMO_ENTERED_KEY);
        } catch {
          /* ignore */
        }
        setEntered(false);
      },
      signInDemo,
    }),
    [entered, signInDemo],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isDemoMode) return <DemoAuth>{children}</DemoAuth>;
  return (
    <Suspense fallback={<DemoAuth>{children}</DemoAuth>}>
      <ClerkBoundary>{children}</ClerkBoundary>
    </Suspense>
  );
}

export { useAuth } from "./auth-context";
export { currentTokenProvider } from "./token";
