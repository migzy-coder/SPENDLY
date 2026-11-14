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

const FEATURE_KEYS: FeatureKey[] = [
  "plan",
  "quickLog",
  "stats",
  "wishlist",
  "activity",
  "calendar",
  "debts",
  "simulator",
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
        setError(t("admin.pinTooShort"));
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
      setError(t("admin.pinTooShort"));
    }
  };

  if (!unlocked) {
    return (
      <div className="pb-6">
        <NavBar title={t("admin.title")} />
        <div className="flex flex-col gap-4 px-5 pt-2">
          <Card className="p-4">
            <p className="text-[16px] font-bold">{t("admin.portalTitle")}</p>
            <p className="mt-1 text-[13px] text-muted">
              {storedPin ? t("admin.enterPinHint") : t("admin.createPinHint")}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={storedPin ? t("admin.pinPlaceholder") : t("admin.newPinPlaceholder")}
                aria-label={t("admin.pinPlaceholder")}
              />
              {error ? <p className="text-[13px] text-danger">{error}</p> : null}
              <Button full onClick={tryUnlock}>
                {storedPin ? t("admin.unlock") : t("admin.createCode")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <NavBar title={t("admin.title")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="p-4">
          <p className="text-[16px] font-bold">{t("admin.publishFeatures")}</p>
          <p className="mt-1 text-[13px] text-muted whitespace-pre-line">
            {t("admin.publishFeaturesHint")}
          </p>
        </Card>

        <Group>
          {FEATURE_KEYS.map((key) => {
            const label = t(`admin.features.${key}Title`);
            const desc = t(`admin.features.${key}Desc`);
            return (
              <ListRow
                key={key}
                title={label}
                subtitle={desc}
                trailing={
                  <Switch
                    checked={flags[key]}
                    label={label}
                    onChange={(v) => setFeatureFlag(key, v)}
                  />
                }
              />
            );
          })}
        </Group>

        <Card className="flex flex-col gap-2 p-4">
          <p className="text-[14px] font-medium">{t("admin.changePin")}</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder={t("admin.newCode")}
              aria-label={t("admin.newCode")}
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
              {t("admin.ok")}
            </Button>
          </div>
          <Button variant="outline" onClick={() => { resetFeatureFlags(); }}>
            {t("admin.resetFundamentals")}
          </Button>
          <Button
            variant="plain"
            onClick={() => {
              setAdminUnlocked(false);
              setUnlocked(false);
            }}
          >
            {t("admin.lock")}
          </Button>
        </Card>
        <p className="px-1 text-[12px] text-muted">{t("settings.storageNote")}</p>
      </div>
    </div>
  );
}
