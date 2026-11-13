import { useState } from "react";
import { NavBar } from "../components/NavBar";
import { Button, Card, Group, Input, ListRow, Switch } from "../components/ui";
import { useI18n } from "../lib/i18n";
import {
  getAdminPin,
  isAdminUnlocked,
  resetFeatureFlags,
  setAdminPin,
  setAdminUnlocked,
  setFeatureFlag,
  useFeatures,
  type FeatureKey,
} from "../lib/features";

const FEATURE_META: { key: FeatureKey; label: string; desc: string }[] = [
  { key: "plan", label: "Plan (fondamental)", desc: "Onboarding, salaire/charges, quiz et plan du mois." },
  { key: "quickLog", label: "Dépenses rapides (Aujourd’hui)", desc: "Ajouter une dépense et voir ce qu’il reste." },
  { key: "stats", label: "Statistiques", desc: "Résumé simple des dépenses." },
  { key: "wishlist", label: "Envies & rappels", desc: "Liste d’envies et rappels (quand c’est possible d’acheter)." },
  { key: "activity", label: "Activité", desc: "Historique détaillé des entrées." },
  { key: "calendar", label: "Calendrier", desc: "Vue calendrier." },
  { key: "debts", label: "Dettes", desc: "Suivi des dettes et paiements." },
  { key: "simulator", label: "Simulateur", desc: "« Puis-je me le permettre ? » et dépenses prévues." },
];

export function Admin() {
  const { t } = useI18n();
  const flags = useFeatures();
  const [unlocked, setUnlocked] = useState(isAdminUnlocked());
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");

  const storedPin = getAdminPin();

  const tryUnlock = () => {
    if (!storedPin) {
      // first time: set pin
      if (pin.trim().length < 4) {
        setError("Choisis un code d’au moins 4 caractères.");
        return;
      }
      setAdminPin(pin.trim());
      setAdminUnlocked(true);
      setUnlocked(true);
      setError("");
      return;
    }
    if (pin.trim() === storedPin) {
      setAdminUnlocked(true);
      setUnlocked(true);
      setError("");
    } else {
      setError("Code incorrect.");
    }
  };

  if (!unlocked) {
    return (
      <div className="pb-6">
        <NavBar title="Admin" />
        <div className="flex flex-col gap-4 px-5 pt-2">
          <Card className="p-4">
            <p className="text-[16px] font-bold">Espace admin</p>
            <p className="mt-1 text-[13px] text-muted">
              {storedPin
                ? "Entre ton code admin pour gérer les fonctions visibles."
                : "Crée un code admin pour contrôler les fonctions publiées aux utilisateurs."}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={storedPin ? "Code admin" : "Nouveau code (min. 4)"}
                aria-label="Code admin"
              />
              {error ? <p className="text-[13px] text-danger">{error}</p> : null}
              <Button full onClick={tryUnlock}>
                {storedPin ? "Déverrouiller" : "Créer le code"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <NavBar title="Admin" />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="p-4">
          <p className="text-[16px] font-bold">Publier des fonctions</p>
          <p className="mt-1 text-[13px] text-muted">
            Active les fonctions quand les utilisateurs sont prêts. Le code reste en place (réservé) — tu choisis ce qui est visible.
            Par défaut : fondamentaux (Plan) uniquement.
          </p>
        </Card>

        <Group>
          {FEATURE_META.map((f) => (
            <ListRow
              key={f.key}
              title={f.label}
              subtitle={f.desc}
              trailing={
                <Switch
                  checked={flags[f.key]}
                  label={f.label}
                  onChange={(v) => setFeatureFlag(f.key, v)}
                />
              }
            />
          ))}
        </Group>

        <Card className="flex flex-col gap-2 p-4">
          <p className="text-[14px] font-medium">Changer le code admin</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Nouveau code"
              aria-label="Nouveau code"
            />
            <Button
              size="md"
              onClick={() => {
                if (newPin.trim().length >= 4) {
                  setAdminPin(newPin.trim());
                  setNewPin("");
                }
              }}
            >
              OK
            </Button>
          </div>
          <Button variant="outline" onClick={() => { resetFeatureFlags(); }}>
            Réinitialiser (fondamentaux)
          </Button>
          <Button
            variant="plain"
            onClick={() => {
              setAdminUnlocked(false);
              setUnlocked(false);
            }}
          >
            Verrouiller
          </Button>
        </Card>
        <p className="px-1 text-[12px] text-muted">{t("settings.storageNote")}</p>
      </div>
    </div>
  );
}
