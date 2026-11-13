import { Link, useParams } from "react-router";
import { NavBar } from "../components/NavBar";
import { Card } from "../components/ui";
import { useI18n } from "../lib/i18n";

type Block = { heading: string; body: string[] };

const PRIVACY_FR: Block[] = [
  {
    heading: "Ce que nous collectons",
    body: [
      "Spendly conserve les données que tu entres : tes dépenses, tes objectifs, tes envies, tes dettes, ton plan du mois et tes réglages.",
      "Ton compte est géré par Clerk. Nous ne stockons pas ton mot de passe. Nous recevons uniquement un identifiant de compte, ton prénom et ton adresse email.",
      "Ton numéro de téléphone n'est jamais demandé. Si tu choisis de le donner plus tard, il ne sera pas utilisé pour de la publicité.",
    ],
  },
  {
    heading: "Où sont stockées tes données",
    body: [
      "Tes données sont stockées dans une base Cloudflare D1, dans un espace privé lié à ton identifiant de compte. Chaque requête de l'API est vérifiée et ne peut lire que les lignes qui t'appartiennent.",
      "Une copie hors ligne de tes données peut être conservée dans ton navigateur pour que l'application s'ouvre vite et fonctionne sans connexion. Cette copie reste sur ton appareil.",
    ],
  },
  {
    heading: "Ce que nous ne faisons pas",
    body: [
      "Nous ne vendons pas tes données. Nous ne les partageons pas avec des publicitaires. Nous ne posons pas de cookies publicitaires.",
      "Spendly ne détient pas ton argent et ne déplace jamais d'argent. L'application est un outil de suivi, pas une banque.",
      "Nous n'envoyons pas de notifications push pour le moment. Les seuls messages automatiques sont le mail de bienvenue.",
    ],
  },
  {
    heading: "Les mesures techniques",
    body: [
      "Nous utilisons Cloudflare Web Analytics pour compter les pages vues de façon anonyme, et Sentry pour détecter les erreurs. Les rapports d'erreur masquent les champs de saisie et ne contiennent ni nom, ni email, ni numéro de téléphone.",
    ],
  },
  {
    heading: "Tes droits",
    body: [
      "Tu peux exporter toutes tes données au format JSON ou CSV depuis les Réglages, et supprimer définitivement ton compte et son contenu depuis la même page.",
      "Pour toute question sur tes données, écris à support@miguelyango.com.",
    ],
  },
];

const PRIVACY_EN: Block[] = [
  {
    heading: "What we collect",
    body: [
      "Spendly keeps the data you enter: your spending, goals, wishes, debts, month plan and settings.",
      "Your account is handled by Clerk. We never store your password. We only receive an account id, your first name and your email address.",
      "Your phone number is never asked for. If you choose to give it later, it will never be used for advertising.",
    ],
  },
  {
    heading: "Where your data lives",
    body: [
      "Your data is stored in a Cloudflare D1 database, in a private space tied to your account id. Every API request is verified and can only read the rows that belong to you.",
      "An offline copy of your data may be kept in your browser so the app opens fast and works without a connection. That copy stays on your device.",
    ],
  },
  {
    heading: "What we do not do",
    body: [
      "We do not sell your data. We do not share it with advertisers. We do not set advertising cookies.",
      "Spendly never holds your money and never moves money. The app is a tracking tool, not a bank.",
      "We do not send push notifications yet. The only automatic message is the welcome email.",
    ],
  },
  {
    heading: "Technical measurements",
    body: [
      "We use Cloudflare Web Analytics to count page views anonymously, and Sentry to catch errors. Error reports mask input fields and never contain names, emails or phone numbers.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can export all your data as JSON or CSV from Settings, and delete your account and its content for good from the same page.",
      "For any question about your data, write to support@miguelyango.com.",
    ],
  },
];

const TERMS_FR: Block[] = [
  {
    heading: "Objet",
    body: [
      "Spendly est une application de suivi de dépenses personnelles. En l'utilisant, tu acceptes les règles décrites ici.",
      "Ce document est un projet : il doit être relu par un juriste avant toute publication commerciale.",
    ],
  },
  {
    heading: "Ton compte",
    body: [
      "Tu dois avoir au moins 16 ans pour créer un compte. Tu es responsable de la confidentialité de ton accès.",
      "Un seul compte par personne. Donne des informations exactes : elles servent à calculer tes budgets.",
    ],
  },
  {
    heading: "Ce que l'application fait",
    body: [
      "L'application calcule une somme restante, un budget quotidien, des enveloppes d'objectifs et des échéances de dettes, à partir des chiffres que tu saisis.",
      "Ces calculs sont indicatifs. Ils ne constituent ni un conseil financier, ni une garantie de résultat.",
    ],
  },
  {
    heading: "Ce que l'application ne fait pas",
    body: [
      "Spendly ne détient pas d'argent, ne paie pas à ta place, ne prête pas et ne bloque pas de fonds.",
      "Les fonctions bancaires, de paiement en ligne et d'investissement ne sont pas disponibles.",
    ],
  },
  {
    heading: "Disponibilité",
    body: [
      "L'application est fournie telle quelle, sans garantie de disponibilité continue. Une coupure réseau ou une maintenance peut interrompre le service.",
      "Nous pouvons modifier ou supprimer des fonctionnalités. Les données exportées avant une modification restent dans ton export.",
    ],
  },
  {
    heading: "Responsabilité",
    body: [
      "Dans la limite permise par la loi, notre responsabilité est limitée au montant que tu as payé pour l'application, qui est actuellement nul.",
    ],
  },
];

const TERMS_EN: Block[] = [
  {
    heading: "Purpose",
    body: [
      "Spendly is a personal spending tracker. By using it you accept the rules described here.",
      "This document is a draft: it must be reviewed by a lawyer before any commercial release.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You must be at least 16 years old to create an account. You are responsible for keeping your access confidential.",
      "One account per person. Enter accurate numbers: they drive your budgets.",
    ],
  },
  {
    heading: "What the app does",
    body: [
      "The app computes a remaining amount, a daily allowance, goal envelopes and debt instalments from the numbers you enter.",
      "These calculations are indicative. They are neither financial advice nor a guarantee of results.",
    ],
  },
  {
    heading: "What the app does not do",
    body: [
      "Spendly never holds money, never pays on your behalf, never lends and never freezes funds.",
      "Banking, online payment and investment features are not available.",
    ],
  },
  {
    heading: "Availability",
    body: [
      "The app is provided as is, without any guarantee of continuous availability. A network outage or maintenance may interrupt the service.",
      "We may change or remove features. Data exported before a change stays in your export.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "As far as the law allows, our liability is limited to the amount you paid for the app, which is currently nothing.",
    ],
  },
];

export function Legal() {
  const { slug } = useParams();
  const { t, locale } = useI18n();

  const isPrivacy = slug !== "terms";
  const blocks = isPrivacy ? (locale === "fr" ? PRIVACY_FR : PRIVACY_EN) : locale === "fr" ? TERMS_FR : TERMS_EN;

  return (
    <div className="pb-10">
      <NavBar title={isPrivacy ? t("legal.privacyTitle") : t("legal.termsTitle")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <p className="text-[13px] text-muted">
          {t("legal.updated", { date: new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB") })}
        </p>
        <Card tint className="px-4 py-3 text-[13px] text-muted">{t("legal.draftNote")}</Card>
        {blocks.map((block) => (
          <section key={block.heading}>
            <h2 className="px-1 text-[17px] font-bold tracking-[-0.01em]">{block.heading}</h2>
            <div className="mt-1.5 flex flex-col gap-2">
              {block.body.map((paragraph) => (
                <p key={paragraph} className="px-1 text-[15px] leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
        <Link to="/settings" className="px-1 text-[14px] font-medium text-accent">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
