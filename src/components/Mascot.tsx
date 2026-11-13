export const MASCOT_POSES = [
  "icon",
  "welcome",
  "login",
  "signup",
  "home",
  "add-expense",
  "details",
  "edit",
  "categories",
  "calendar",
  "reports",
  "notifications",
  "settings",
  "help",
  "empty",
  "success",
  "loading",
  "error",
  "motivational",
  "goodbye",
] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

/**
 * The mascot is the personality of the app. It is always large and always on a
 * white or cream surface, never used as a small header icon.
 */
export function Mascot({
  pose,
  size = 120,
  className,
  label,
}: {
  pose: MascotPose;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <img
      src={`/mascot/${pose}.webp`}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
