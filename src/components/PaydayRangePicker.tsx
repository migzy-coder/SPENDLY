import { useI18n } from "../lib/i18n";
import { Icon } from "./Icon";
import { cn } from "./ui";

interface PaydayRangePickerProps {
  startDay: number;
  endDay: number;
  onChange: (start: number, end: number) => void;
  className?: string;
}

const COMMON_RANGES = [
  { start: 24, end: 28, labelFr: "24 – 28", descFr: "Standard / Fonction publique", labelEn: "24 – 28", descEn: "Public sector / Standard" },
  { start: 25, end: 30, labelFr: "25 – 30", descFr: "Fin de mois classique", labelEn: "25 – 30", descEn: "End of month" },
  { start: 1, end: 5, labelFr: "1 – 5", descFr: "Début de mois", labelEn: "1 – 5", descEn: "Beginning of month" },
  { start: 15, end: 20, labelFr: "15 – 20", descFr: "Milieu de mois", labelEn: "15 – 20", descEn: "Mid-month" },
];

export function PaydayRangePicker({
  startDay,
  endDay,
  onChange,
  className,
}: PaydayRangePickerProps) {
  const { locale } = useI18n();

  const handleStartChange = (val: number) => {
    const clamped = Math.max(1, Math.min(31, val));
    const newEnd = Math.max(clamped, endDay);
    onChange(clamped, newEnd);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.max(1, Math.min(31, val));
    const newStart = Math.min(clamped, startDay);
    onChange(newStart, clamped);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Visual Summary Card */}
      <div className="flex items-center justify-between rounded-[20px] bg-accent-tint/60 p-4 border border-accent/20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-sm">
            <Icon name="calendar" size={20} />
          </span>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-accent">
              {locale === "fr" ? "Période de paie" : "Pay window"}
            </p>
            <p className="text-[18px] font-extrabold text-ink tracking-tight">
              {locale === "fr"
                ? startDay === endDay
                  ? `Le ${startDay} du mois`
                  : `Entre le ${startDay} et le ${endDay} du mois`
                : startDay === endDay
                ? `Day ${startDay} of the month`
                : `Between day ${startDay} and ${endDay}`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <p className="mb-2 text-[12px] font-semibold text-muted px-1">
          {locale === "fr" ? "Périodes courantes" : "Common windows"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COMMON_RANGES.map((item) => {
            const isSelected = startDay === item.start && endDay === item.end;
            return (
              <button
                key={`${item.start}-${item.end}`}
                type="button"
                onClick={() => onChange(item.start, item.end)}
                className={cn(
                  "flex flex-col items-start rounded-[16px] p-3 text-left transition-all active:scale-95",
                  isSelected
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface text-ink shadow-card hover:bg-soft"
                )}
              >
                <span className="text-[16px] font-bold">
                  {locale === "fr" ? item.labelFr : item.labelEn}
                </span>
                <span className={cn("text-[11px] mt-0.5", isSelected ? "text-white/80" : "text-muted")}>
                  {locale === "fr" ? item.descFr : item.descEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Range Adjuster */}
      <div className="rounded-[20px] bg-surface p-4 shadow-card">
        <p className="mb-3 text-[13px] font-bold text-ink">
          {locale === "fr" ? "Personnaliser la tranche" : "Customise window"}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Start Day Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted">
              {locale === "fr" ? "Du jour" : "From day"}
            </span>
            <div className="flex items-center justify-between rounded-[14px] bg-soft p-1 border border-hairline">
              <button
                type="button"
                onClick={() => handleStartChange(startDay - 1)}
                className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface text-ink font-bold shadow-sm active:scale-90"
              >
                -
              </button>
              <span className="text-[18px] font-extrabold text-ink">{startDay}</span>
              <button
                type="button"
                onClick={() => handleStartChange(startDay + 1)}
                className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface text-ink font-bold shadow-sm active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* End Day Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted">
              {locale === "fr" ? "Au jour" : "To day"}
            </span>
            <div className="flex items-center justify-between rounded-[14px] bg-soft p-1 border border-hairline">
              <button
                type="button"
                onClick={() => handleEndChange(endDay - 1)}
                className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface text-ink font-bold shadow-sm active:scale-90"
              >
                -
              </button>
              <span className="text-[18px] font-extrabold text-ink">{endDay}</span>
              <button
                type="button"
                onClick={() => handleEndChange(endDay + 1)}
                className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface text-ink font-bold shadow-sm active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
