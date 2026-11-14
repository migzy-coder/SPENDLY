import { useEffect, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { formatXaf } from "../lib/money";
import type { Category } from "../lib/types";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/* Surfaces ---------------------------------------------------------------- */

export function Card({
  children,
  className,
  tint = false,
  ...rest
}: { children: ReactNode; className?: string; tint?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[20px] bg-surface shadow-card", tint && "bg-accent-tint", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[19px] font-bold tracking-[-0.01em]">{title}</h2>
      {action}
    </div>
  );
}

/* Buttons ----------------------------------------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "plain" | "tinted";
  size?: "lg" | "md";
  full?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  full = false,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform active:scale-[0.98] disabled:opacity-45",
        size === "lg" ? "h-[52px] px-6 text-[17px]" : "h-11 px-4 text-[15px]",
        variant === "primary" && "bg-accent text-white shadow-[0_8px_20px_rgba(47,107,240,0.28)]",
        variant === "outline" && "border-[1.5px] border-accent text-accent",
        variant === "tinted" && "bg-accent-tint text-accent",
        variant === "plain" && "text-accent",
        full && "w-full",
        className,
      )}
      {...rest}
    />
  );
}

export function Capsule({
  children,
  selected = false,
  className,
  ...rest
}: { children: ReactNode; selected?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-4 text-[15px] font-medium transition-transform active:scale-[0.97]",
        selected ? "bg-accent text-white" : "bg-soft text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tag({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode;
  tone?: "accent" | "success" | "gold" | "danger" | "muted";
  className?: string;
}) {
  const tones = {
    accent: "bg-accent-tint text-accent",
    success: "bg-success-tint text-success",
    gold: "bg-gold/20 text-gold-ink",
    danger: "bg-danger-tint text-danger",
    muted: "bg-soft text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Controls ---------------------------------------------------------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-[10px] bg-soft p-[2px]" role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-[8px] px-2 py-[7px] text-[13px] font-medium transition-colors",
              active ? "bg-surface font-semibold shadow-[0_3px_8px_rgba(0,0,0,0.12)]" : "text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "bg-hairline",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-200",
          checked && "left-[23px]",
        )}
      />
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block px-1 text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[12px] border-[1.5px] border-hairline bg-soft px-3.5 text-[16px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none",
        className,
      )}
      {...rest}
    />
  );
}

export function AmountInput({
  value,
  onChange,
  onAmountChange,
  currency = "XAF",
  className,
  placeholder = "0",
  ...rest
}: {
  value: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAmountChange?: (amount: number, formatted: string) => void;
  currency?: string;
  className?: string;
  placeholder?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const formatDigits = (digits: string) => {
    const clean = digits.replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString("fr-FR").replace(/\u202F/g, " ");
  };

  const rawString = String(value ?? "");
  const formattedValue = formatDigits(rawString);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const numeric = rawDigits ? parseInt(rawDigits, 10) : 0;
    const formatted = formatDigits(rawDigits);

    // Call onAmountChange if provided
    onAmountChange?.(numeric, formatted);

    // Mutate event value so existing onChange(e) receiving e.target.value gets the formatted string
    if (onChange) {
      e.target.value = formatted;
      onChange(e);
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={formattedValue}
        onChange={handleChange}
        className={cn(
          "h-12 w-full rounded-[12px] border-[1.5px] border-hairline bg-soft pl-3.5 pr-14 text-[17px] font-semibold tracking-wide text-ink placeholder:font-normal placeholder:text-muted/70 focus:border-accent focus:outline-none",
          className,
        )}
        {...rest}
      />
      {currency ? (
        <span className="pointer-events-none absolute right-3.5 text-[13px] font-bold tracking-wider text-muted select-none">
          {currency}
        </span>
      ) : null}
    </div>
  );
}

/* Data display ------------------------------------------------------------ */

export function CountUp({
  value,
  format = (input) => formatXaf(input),
  duration = 650,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(origin + (value - origin) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}

export function Ring({
  percent,
  size = 60,
  thickness = 6,
  children,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--app-accent) ${value * 3.6}deg, var(--app-hairline) 0)`,
      }}
      role="img"
      aria-label={`${Math.round(value)}%`}
    >
      <div
        className="grid place-items-center rounded-full bg-surface text-[13px] font-bold"
        style={{ width: size - thickness * 2, height: size - thickness * 2 }}
      >
        {children ?? `${Math.round(value)}%`}
      </div>
    </div>
  );
}

export function ProgressBar({
  percent,
  color = "var(--app-accent)",
  className,
}: {
  percent: number;
  color?: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-ink/10", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

export type BarDatum = { label: string; value: number; hint?: string; tone?: "accent" | "muted" | "planned" };

export function Bars({ data, height = 150 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, index) => {
        const ratio = item.value / max;
        const barHeight = Math.max(4, ratio * (height - 44));
        const tone = item.tone ?? "accent";
        return (
          <div key={`${item.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="min-h-4 text-[10px] font-semibold text-muted">
              {item.value ? `${Math.round(item.value / 100) / 10}k` : ""}
            </span>
            <div
              className={cn(
                "my-1 w-full rounded-t-[9px] rounded-b-[4px] transition-[height] duration-500",
                tone === "planned" && "border-2 border-dashed border-accent-soft bg-transparent",
                tone === "accent" && "bg-accent",
                tone === "muted" && "bg-accent-soft",
              )}
              style={{ height: barHeight }}
            />
            <span className="text-[11px] font-medium text-muted">{item.label}</span>
            {item.hint ? <span className="text-[10px] text-muted">{item.hint}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  slices,
  centerLabel,
}: {
  slices: { color: string; amount: number }[];
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const gradient = useMemo(() => {
    if (!total) return "var(--app-hairline)";
    let cursor = 0;
    const parts = slices.map((slice) => {
      const start = cursor;
      cursor += (slice.amount / total) * 360;
      return `${slice.color} ${start}deg ${cursor}deg`;
    });
    return `conic-gradient(${parts.join(",")})`;
  }, [slices, total]);

  return (
    <div
      className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-full"
      style={{ background: gradient }}
      role="img"
      aria-label={centerLabel}
    >
      <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-surface text-center">
        <span className="text-[15px] font-bold tracking-tight">{centerLabel}</span>
      </div>
    </div>
  );
}

/* Lists ------------------------------------------------------------------- */

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  trailing,
  onClick,
  className,
}: {
  icon?: IconName;
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left hairline-b last:border-b-0",
        onClick && "active:bg-soft",
        className,
      )}
    >
      {icon ? (
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
          style={{ background: iconColor ?? "var(--app-accent-tint)", color: iconColor ? "#fff" : "var(--app-accent)" }}
        >
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-[13px] text-muted">{subtitle}</span> : null}
      </span>
      {value ? <span className="shrink-0 text-[16px] font-semibold tnum">{value}</span> : null}
      {trailing}
    </Wrapper>
  );
}

export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[20px] bg-surface shadow-card", className)}>{children}</div>
  );
}

/* Feedback ---------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
  image,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  image?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      {image}
      <h3 className="text-[19px] font-bold tracking-tight">{title}</h3>
      {body ? <p className="max-w-[260px] text-[14px] text-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[10px] bg-soft", className)} />;
}

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const colors: Record<Category, string> = {
    Food: "var(--cat-food)",
    Transport: "var(--cat-transport)",
    Airtime: "var(--cat-airtime)",
    Clothes: "var(--cat-clothes)",
    Social: "var(--cat-social)",
    Other: "var(--cat-other)",
  };
  return (
    <span
      className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[16px] font-bold", className)}
      style={{ background: colors[category], color: category === "Clothes" ? "var(--cat-ink-clothes)" : "#fff" }}
      aria-hidden="true"
    >
      {category.slice(0, 1)}
    </span>
  );
}
