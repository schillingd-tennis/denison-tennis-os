/**
 * Thin vertical accent bar for the left edge of directory-style cards,
 * signaling role/status at a glance (e.g. current player vs. alumni today).
 * Add new tones here as future card types (Recruit, Coach, Parent, etc.)
 * need their own colors — the card itself only needs to pick a tone.
 */
export type CardAccentTone = "denison" | "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<CardAccentTone, string> = {
  denison: "bg-denison-red",
  neutral: "bg-text-secondary/40",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export default function CardAccentBar({ tone }: { tone: CardAccentTone }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${toneClasses[tone]}`}
    />
  );
}
