import { lazy, Suspense, useMemo } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { AuthProvider, useAuth } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { AppProviders, useBootstrap } from "./lib/store";
import { ToastProvider } from "./components/Toast";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { useFeature, type FeatureKey } from "./lib/features";

const Welcome = lazy(() => import("./routes/Welcome").then((m) => ({ default: m.Welcome })));
const SignInPage = lazy(() => import("./routes/SignIn").then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("./routes/SignIn").then((m) => ({ default: m.SignUpPage })));
const SetupPage = lazy(() => import("./routes/Setup").then((m) => ({ default: m.SetupPage })));
const Today = lazy(() => import("./routes/Today").then((m) => ({ default: m.Today })));
const Goals = lazy(() => import("./routes/Goals").then((m) => ({ default: m.Goals })));
const GoalNew = lazy(() => import("./routes/Goals").then((m) => ({ default: m.GoalNew })));
const GoalDetail = lazy(() => import("./routes/Goals").then((m) => ({ default: m.GoalDetail })));
const WishNew = lazy(() => import("./routes/Goals").then((m) => ({ default: m.WishNew })));
const WishDetail = lazy(() => import("./routes/Goals").then((m) => ({ default: m.WishDetail })));
const Stats = lazy(() => import("./routes/Stats").then((m) => ({ default: m.Stats })));
const Plan = lazy(() => import("./routes/Plan").then((m) => ({ default: m.Plan })));
const Activity = lazy(() => import("./routes/Activity").then((m) => ({ default: m.Activity })));
const EntryDetail = lazy(() => import("./routes/Activity").then((m) => ({ default: m.EntryDetail })));
const Calendar = lazy(() => import("./routes/Calendar").then((m) => ({ default: m.Calendar })));
const Simulator = lazy(() => import("./routes/Simulator").then((m) => ({ default: m.Simulator })));
const Debts = lazy(() => import("./routes/Debts").then((m) => ({ default: m.Debts })));
const DebtNew = lazy(() => import("./routes/Debts").then((m) => ({ default: m.DebtNew })));
const Settings = lazy(() => import("./routes/Settings").then((m) => ({ default: m.Settings })));
const ProfileSettings = lazy(() => import("./routes/Settings").then((m) => ({ default: m.ProfileSettings })));
const Reminders = lazy(() => import("./routes/Settings").then((m) => ({ default: m.Reminders })));
const Help = lazy(() => import("./routes/Settings").then((m) => ({ default: m.Help })));
const Legal = lazy(() => import("./routes/Legal").then((m) => ({ default: m.Legal })));
const Offline = lazy(() => import("./routes/Offline").then((m) => ({ default: m.Offline })));
const NotFound = lazy(() => import("./routes/NotFound").then((m) => ({ default: m.NotFound })));
const Admin = lazy(() => import("./routes/Admin").then((m) => ({ default: m.Admin })));

function BootScreen() {
  return (
    <div className="grid h-[100dvh] place-items-center bg-bg">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-hairline border-t-accent" />
    </div>
  );
}

/** Signed in users only. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  if (!isLoaded) return <BootScreen />;
  if (!isSignedIn) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Signed in users that finished the questionnaire. */
function RequireSetup({ children }: { children: ReactNode }) {
  const { data, isLoading } = useBootstrap();
  if (isLoading && !data) return <BootScreen />;
  if (data?.user && !data.user.onboarded) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireSetup>{children}</RequireSetup>
    </RequireAuth>
  );
}

function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const enabled = useFeature(feature);
  if (!enabled) return <Navigate to="/plan" replace />;
  return <>{children}</>;
}

export default function App() {
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: "/",
          element: <RootLayout />,
          children: [
            { index: true, element: <Navigate to="/plan" replace /> },
            { path: "welcome", element: <Welcome /> },
            { path: "signin", element: <SignInPage /> },
            { path: "signup", element: <SignUpPage /> },
            { path: "setup", element: <SetupPage /> },
            { path: "today", element: <Protected><FeatureGate feature="quickLog"><Today /></FeatureGate></Protected> },
            { path: "goals", element: <Protected><FeatureGate feature="wishlist"><Goals /></FeatureGate></Protected> },
            { path: "goals/new", element: <Protected><FeatureGate feature="wishlist"><GoalNew /></FeatureGate></Protected> },
            { path: "goals/:id", element: <Protected><FeatureGate feature="wishlist"><GoalDetail /></FeatureGate></Protected> },
            { path: "wishes/new", element: <Protected><FeatureGate feature="wishlist"><WishNew /></FeatureGate></Protected> },
            { path: "wishes/:id", element: <Protected><FeatureGate feature="wishlist"><WishDetail /></FeatureGate></Protected> },
            { path: "stats", element: <Protected><FeatureGate feature="stats"><Stats /></FeatureGate></Protected> },
            { path: "plan", element: <Protected><FeatureGate feature="plan"><Plan /></FeatureGate></Protected> },
            { path: "activity", element: <Protected><FeatureGate feature="activity"><Activity /></FeatureGate></Protected> },
            { path: "activity/:id", element: <Protected><FeatureGate feature="activity"><EntryDetail /></FeatureGate></Protected> },
            { path: "calendar", element: <Protected><FeatureGate feature="calendar"><Calendar /></FeatureGate></Protected> },
            { path: "simulator", element: <Protected><FeatureGate feature="simulator"><Simulator /></FeatureGate></Protected> },
            { path: "debts", element: <Protected><FeatureGate feature="debts"><Debts /></FeatureGate></Protected> },
            { path: "debts/new", element: <Protected><FeatureGate feature="debts"><DebtNew /></FeatureGate></Protected> },
            { path: "settings", element: <Protected><Settings /></Protected> },
            { path: "settings/profile", element: <Protected><ProfileSettings /></Protected> },
            { path: "settings/reminders", element: <Protected><Reminders /></Protected> },
            { path: "settings/help", element: <Protected><Help /></Protected> },
            { path: "admin", element: <Protected><Admin /></Protected> },
            { path: "legal/:slug", element: <Protected><Legal /></Protected> },
            { path: "offline", element: <Protected><Offline /></Protected> },
            { path: "*", element: <NotFound /> },
          ],
        },
      ]),
    [],
  );

  return (
    <I18nProvider>
      <AuthProvider>
        <AppProviders>
          <ToastProvider>
            <Suspense fallback={<BootScreen />}>
              <RouterProvider router={router} />
            </Suspense>
            <UpdatePrompt />
          </ToastProvider>
        </AppProviders>
      </AuthProvider>
    </I18nProvider>
  );
}
