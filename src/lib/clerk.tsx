/**
 * The Clerk boundary. It is imported lazily so the Clerk bundle is only
 * downloaded when a Clerk key is actually configured.
 */

import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/react";
import { enUS, frFR } from "@clerk/localizations";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./auth-context";
import type { AuthValue } from "./auth-context";
import { useI18n } from "./i18n";
import { setTokenProvider } from "./token";

export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export function ClerkAuthRoot({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useClerkUser();
  const { getToken, signOut } = useClerkAuth();

  useEffect(() => {
    setTokenProvider(async () => getToken());
    return () => setTokenProvider(null);
  }, [getToken]);

  const value = useMemo<AuthValue>(() => {
    const firstName = user?.firstName ?? "";
    const lastName = user?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      userId: user?.id ?? null,
      name: fullName,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      imageUrl: user?.imageUrl ?? null,
      isSignedIn: Boolean(user),
      isLoaded,
      isDemo: false,
      getToken: async () => getToken(),
      signOut: async () => {
        await signOut();
      },
    };
  }, [user, isLoaded, getToken, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ClerkBoundary({ children }: { children: ReactNode }) {
  const { locale } = useI18n();

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY as string}
      localization={locale === "fr" ? frFR : enUS}
      appearance={{
        variables: {
          colorPrimary: "#2F6BF0",
          colorPrimaryForeground: "#FFFFFF",
          colorBackground: "#FFFFFF",
          colorForeground: "#15233E",
          colorMutedForeground: "#5F6C86",
          borderRadius: "14px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        },
        elements: {
          cardBox: "shadow-none border border-hairline rounded-[22px]",
          card: "shadow-none",
          formButtonPrimary: "bg-accent text-white h-12 rounded-[14px] font-semibold text-[17px] shadow-none",
          socialButtonsBlockButton:
            "h-12 rounded-[14px] border border-hairline text-[16px] font-medium bg-surface",
          formFieldInput: "h-12 rounded-[14px] border border-hairline bg-soft text-[16px]",
          headerTitle: "text-[22px] font-bold tracking-tight",
          headerSubtitle: "text-[15px] text-muted",
          footerActionLink: "text-accent font-medium",
        },
      }}
    >
      <ClerkAuthRoot>{children}</ClerkAuthRoot>
    </ClerkProvider>
  );
}
