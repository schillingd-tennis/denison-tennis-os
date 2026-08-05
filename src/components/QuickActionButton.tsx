import type { LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";

/**
 * Color treatments for quick-action buttons (call / text / email).
 * Outline accent icons on a white surface with a thin matching border;
 * hover adds a light tint, soft shadow, and slight scale.
 */
export type QuickActionTone = "success" | "info" | "denison" | "neutral";

const toneClasses: Record<QuickActionTone, string> = {
  success:
    "border-success/35 text-success/90 hover:border-success/50 hover:bg-success/10 hover:text-success hover:shadow-[0_2px_8px_rgba(22,163,74,0.18)] focus-visible:border-success/50 focus-visible:bg-success/10 focus-visible:text-success active:scale-[0.97] active:bg-success/15 active:shadow-none",
  info: "border-info/35 text-info/90 hover:border-info/50 hover:bg-info/10 hover:text-info hover:shadow-[0_2px_8px_rgba(37,99,235,0.18)] focus-visible:border-info/50 focus-visible:bg-info/10 focus-visible:text-info active:scale-[0.97] active:bg-info/15 active:shadow-none",
  denison:
    "border-denison-red/35 text-denison-red/90 hover:border-denison-red/50 hover:bg-denison-red/10 hover:text-denison-red hover:shadow-[0_2px_8px_rgba(200,16,46,0.18)] focus-visible:border-denison-red/50 focus-visible:bg-denison-red/10 focus-visible:text-denison-red active:scale-[0.97] active:bg-denison-red/15 active:shadow-none",
  neutral:
    "border-border text-text-secondary hover:bg-app-background hover:shadow-sm focus-visible:bg-app-background active:scale-[0.97] active:shadow-none",
};

/**
 * A circular icon button for quick contact actions (call / text / email)
 * on Team List rows, cards, and the Player Workspace. Stops click
 * propagation so activating the action never triggers a parent row/card
 * navigation target, and renders as a disabled, visually muted control
 * when the required contact value is missing.
 */
export default function QuickActionButton({
  href,
  icon: Icon,
  label,
  tone,
  className = "",
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  tone: QuickActionTone;
  className?: string;
}) {
  const baseClassName =
    "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-surface select-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denison-red";

  function stopParentNavigation(event: MouseEvent) {
    // Sit above a full-card / row click target — never let the gesture bubble
    // into that surface's navigation.
    event.stopPropagation();
  }

  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={`${label} unavailable`}
        title={`${label} unavailable`}
        onClick={stopParentNavigation}
        onMouseDown={stopParentNavigation}
        className={`${baseClassName} cursor-not-allowed border-border text-text-secondary/35 hover:scale-100 hover:shadow-none ${className}`}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
      </button>
    );
  }

  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={stopParentNavigation}
      onMouseDown={stopParentNavigation}
      className={`${baseClassName} ${toneClasses[tone]} ${className}`}
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
    </a>
  );
}
