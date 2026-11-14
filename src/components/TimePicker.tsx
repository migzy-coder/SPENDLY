import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { getNotificationPermission, requestNotificationPermission } from "../lib/notifications";
import { useI18n } from "../lib/i18n";
import { cn } from "./ui";

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  className?: string;
}

const PRESETS = [
  { labelFr: "Matin", labelEn: "Morning", time: "08:30", icon: "sun" },
  { labelFr: "Midi", labelEn: "Midday", time: "12:30", icon: "spark" },
  { labelFr: "Fin d'aprèm", labelEn: "Afternoon", time: "18:00", icon: "clock" },
  { labelFr: "Soir", labelEn: "Evening", time: "21:00", icon: "moon" },
];

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const { locale } = useI18n();
  const [hoursStr, minutesStr] = (value || "21:00").split(":");
  const currentHour = parseInt(hoursStr || "21", 10);
  const currentMinute = parseInt(minutesStr || "00", 10);

  const [activeTab, setActiveTab] = useState<"hour" | "minute">("hour");
  const [permission, setPermission] = useState(getNotificationPermission());

  const updateTime = (newH: number, newM: number) => {
    const formatted = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    onChange(formatted);
  };

  const handleEnableNotifications = async () => {
    const status = await requestNotificationPermission();
    setPermission(status);
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* iOS Digital Clock Display */}
      <div className="flex items-center justify-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setActiveTab("hour")}
          className={cn(
            "flex h-20 w-24 flex-col items-center justify-center rounded-[18px] border-2 transition-all active:scale-95",
            activeTab === "hour"
              ? "border-accent bg-accent-tint text-accent shadow-md shadow-accent/15"
              : "border-hairline bg-surface text-ink hover:bg-soft"
          )}
        >
          <span className="text-[36px] font-extrabold leading-none tracking-tight">
            {String(currentHour).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            {locale === "fr" ? "Heures" : "Hours"}
          </span>
        </button>

        <span className="text-[32px] font-bold text-muted/60 animate-pulse">:</span>

        <button
          type="button"
          onClick={() => setActiveTab("minute")}
          className={cn(
            "flex h-20 w-24 flex-col items-center justify-center rounded-[18px] border-2 transition-all active:scale-95",
            activeTab === "minute"
              ? "border-accent bg-accent-tint text-accent shadow-md shadow-accent/15"
              : "border-hairline bg-surface text-ink hover:bg-soft"
          )}
        >
          <span className="text-[36px] font-extrabold leading-none tracking-tight">
            {String(currentMinute).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            {locale === "fr" ? "Minutes" : "Minutes"}
          </span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => {
          const isSelected = value === preset.time;
          return (
            <button
              key={preset.time}
              type="button"
              onClick={() => onChange(preset.time)}
              className={cn(
                "flex flex-col items-center rounded-[14px] p-2 text-center transition-all active:scale-95",
                isSelected
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface text-ink shadow-card hover:bg-soft"
              )}
            >
              <span className="text-[11px] font-medium opacity-90 truncate max-w-full">
                {locale === "fr" ? preset.labelFr : preset.labelEn}
              </span>
              <span className="text-[13px] font-bold mt-0.5">{preset.time}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Grid for Hours or Minutes */}
      <div className="rounded-[20px] bg-surface p-3 shadow-card">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[12px] font-semibold text-muted">
            {activeTab === "hour"
              ? locale === "fr"
                ? "Choisir l'heure (0h - 23h)"
                : "Choose hour (0h - 23h)"
              : locale === "fr"
              ? "Choisir les minutes"
              : "Choose minutes"}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("hour")}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                activeTab === "hour" ? "bg-accent text-white" : "text-muted hover:text-ink"
              )}
            >
              H
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("minute")}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                activeTab === "minute" ? "bg-accent text-white" : "text-muted hover:text-ink"
              )}
            >
              Min
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "hour" ? (
            <motion.div
              key="hours"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-6 gap-1.5"
            >
              {hoursList.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    updateTime(h, currentMinute);
                    setActiveTab("minute");
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-[10px] text-[14px] font-semibold transition-all active:scale-95",
                    currentHour === h
                      ? "bg-accent text-white shadow-sm"
                      : "bg-soft text-ink hover:bg-hairline"
                  )}
                >
                  {String(h).padStart(2, "0")}h
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="minutes"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-4 gap-2"
            >
              {minutesList.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateTime(currentHour, m)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-[12px] text-[15px] font-semibold transition-all active:scale-95",
                    currentMinute === m
                      ? "bg-accent text-white shadow-sm"
                      : "bg-soft text-ink hover:bg-hairline"
                  )}
                >
                  :{String(m).padStart(2, "0")}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Push Notification Activation Card */}
      <div className="flex items-center gap-3 rounded-[16px] bg-accent-tint/60 p-3.5 border border-accent/20">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm">
          <Icon name="bell" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink">
            {permission === "granted"
              ? locale === "fr"
                ? "Notifications activées"
                : "Notifications active"
              : locale === "fr"
              ? "Recevoir le rappel sur cet appareil"
              : "Get reminders on this device"}
          </p>
          <p className="text-[12px] text-muted">
            {permission === "granted"
              ? locale === "fr"
                ? `Rappel programmé chaque jour à ${value}`
                : `Reminder scheduled daily at ${value}`
              : locale === "fr"
              ? "Autoriser pour être averti sans ouvrir l'app"
              : "Allow to be alerted without opening the app"}
          </p>
        </div>
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-bold text-white shadow-sm active:scale-95 transition-transform"
          >
            {locale === "fr" ? "Activer" : "Enable"}
          </button>
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
            <Icon name="check" size={14} strokeWidth={2.6} />
          </span>
        )}
      </div>
    </div>
  );
}
