import { SignIn, SignUp } from "@clerk/react";
import { Link } from "react-router";
import { Mascot } from "../components/Mascot";
import { useI18n } from "../lib/i18n";
import { isDemoMode } from "../lib/auth";

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
      {isDemoMode ? (
        <p className="mt-3 rounded-[14px] bg-accent-tint px-3 py-2 text-center text-[12px] text-accent">
          {t("auth.demoNote")}
        </p>
      ) : null}
    </div>
  );
}

export function SignInPage() {
  const { t } = useI18n();
  return (
    <AuthShell title={t("auth.signIn")}>
      <SignIn fallbackRedirectUrl="/today" />
      <p className="mt-4 text-center text-[14px] text-muted">
        {t("auth.signUp")} ·{" "}
        <Link to="/signup" className="font-medium text-accent">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignUpPage() {
  const { t } = useI18n();
  return (
    <AuthShell title={t("auth.signUp")}>
      <SignUp fallbackRedirectUrl="/today" />
      <p className="mt-4 text-center text-[14px] text-muted">
        {t("auth.signIn")} ·{" "}
        <Link to="/signin" className="font-medium text-accent">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
