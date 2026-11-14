import { AuthenticateWithRedirectCallback, SignIn, SignUp } from "@clerk/react";
import { Link, useNavigate } from "react-router";
import { Mascot } from "../components/Mascot";
import { Button } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { isDemoMode, useAuth } from "../lib/auth";

export function SSOCallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/plan"
        signUpFallbackRedirectUrl="/setup"
      />
    </div>
  );
}

function AuthShell({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-full flex-col px-5 pt-safe pb-[max(env(safe-area-inset-bottom,0px),24px)]">
      <div className="flex justify-center py-6">
        <Mascot pose="login" size={120} />
      </div>
      <h1 className="mb-4 text-center text-[26px] font-bold tracking-[-0.025em]">{title}</h1>
      <div className="flex-1">{children}</div>
      <p className="mt-6 text-center text-[12px] text-muted">{t("auth.termsNote")}</p>
    </div>
  );
}

function DemoContinue({ to }: { to: string }) {
  const { t } = useI18n();
  const { signInDemo } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[14px] leading-relaxed text-muted">
        {t("auth.demoNote")}
      </p>
      <Button
        full
        onClick={async () => {
          await signInDemo?.();
          navigate(to, { replace: true });
        }}
      >
        {t("auth.demoContinue")}
      </Button>
      <p className="text-center text-[13px] text-muted">
        {t("auth.demoConfigureClerk")}
      </p>
      <Link to="/welcome" className="text-center text-[14px] font-medium text-accent">
        {t("common.back")}
      </Link>
    </div>
  );
}

export function SignInPage() {
  const { t, locale } = useI18n();
  const { isSignedIn, isLoaded, email, name, signOut } = useAuth();
  const navigate = useNavigate();

  if (isDemoMode) {
    return (
      <AuthShell title={t("auth.signIn")}>
        <DemoContinue to="/plan" />
      </AuthShell>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <AuthShell title={t("auth.signIn")}>
        <div className="flex flex-col gap-4 text-center">
          <div className="rounded-[16px] bg-accent-tint/60 p-4">
            <p className="text-[15px] font-semibold text-ink">
              {locale === "fr" ? "Déjà connecté !" : "Already signed in!"}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {email || name || (locale === "fr" ? "Session active" : "Active session")}
            </p>
          </div>
          <Button full onClick={() => navigate("/plan", { replace: true })}>
            {locale === "fr" ? "Accéder à mon budget" : "Go to my budget"}
          </Button>
          <Button
            full
            variant="outline"
            onClick={async () => {
              await signOut();
            }}
          >
            {locale === "fr" ? "Se déconnecter / Changer de compte" : "Sign out / Switch account"}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.signIn")}>
      <SignIn routing="path" path="/signin" signUpUrl="/signup" fallbackRedirectUrl="/plan" />
      <p className="mt-4 text-center text-[14px] text-muted">
        <Link to="/signup" className="font-medium text-accent">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignUpPage() {
  const { t, locale } = useI18n();
  const { isSignedIn, isLoaded, email, name, signOut } = useAuth();
  const navigate = useNavigate();

  if (isDemoMode) {
    return (
      <AuthShell title={t("auth.signUp")}>
        <DemoContinue to="/setup" />
      </AuthShell>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <AuthShell title={t("auth.signUp")}>
        <div className="flex flex-col gap-4 text-center">
          <div className="rounded-[16px] bg-accent-tint/60 p-4">
            <p className="text-[15px] font-semibold text-ink">
              {locale === "fr" ? "Tu as déjà un compte connecté" : "You are already signed in"}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {email || name || (locale === "fr" ? "Session active" : "Active session")}
            </p>
          </div>
          <Button full onClick={() => navigate("/setup", { replace: true })}>
            {locale === "fr" ? "Configurer mon budget" : "Set up my budget"}
          </Button>
          <Button
            full
            variant="outline"
            onClick={async () => {
              await signOut();
            }}
          >
            {locale === "fr" ? "Se déconnecter" : "Sign out"}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.signUp")}>
      <SignUp routing="path" path="/signup" signInUrl="/signin" fallbackRedirectUrl="/setup" />
      <p className="mt-4 text-center text-[14px] text-muted">
        <Link to="/signin" className="font-medium text-accent">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
