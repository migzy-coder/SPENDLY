import { createContext, useContext } from "react";

export type AuthValue = {
  userId: string | null;
  name: string;
  email: string | null;
  imageUrl: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  isDemo: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Demo/local mode only: enter the app without Clerk. */
  signInDemo?: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
