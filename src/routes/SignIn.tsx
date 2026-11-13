import { SignIn, SignUp } from "@clerk/react";
import { Link, useNavigate } from "react-router";
import { Mascot } from "../components/Mascot";
import { Button } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { isDemoMode, useAuth } from "../lib/auth";

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
        Pour connecter de vrais comptes, configure Clerk (VITE_CLERK_PUBLISHABLE_KEY) puis redéploie.
      </p>
      <Link to="/welcome" className="text-center text-[14px] font-medium text-accent">
        {t("common.back")}
      </Link>
    </div>
  );
}

export function SignInPage() {
  const { t } = useI18n();
  if (isDemoMode) {
    return (
      <AuthShell title={t("auth.signIn")}>
        <DemoContinue to="/plan" />
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
  const { t } = useI18n();
  if (isDemoMode) {
    return (
      <AuthShell title={t("auth.signUp")}>
        <DemoContinue to="/setup" />
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
