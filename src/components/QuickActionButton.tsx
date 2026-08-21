import type { LucideIcon, LucideProps } from "lucide-react";
import type { ComponentType, MouseEvent } from "react";

/**
 * Color treatments for quick-action buttons (call / text / email / notes).
 * Default `appearance="outline"`: accent icon on white with a thin border.
 * `appearance="filled"`: solid tinted circle for high-emphasis shortcuts.
 */
export type QuickActionTone =
  | "success"
  | "info"
  | "denison"
  | "module"
  | "neutral"
  | "warning"
  | "research"
  | "knowledge";

export type QuickActionAppearance = "outline" | "filled";

const outlineToneClasses: Record<QuickActionTone, string> = {
  success:
    "border-success/35 bg-surface text-success/90 hover:border-success/50 hover:bg-success/10 hover:text-success hover:shadow-[0_2px_8px_rgba(22,163,74,0.18)] focus-visible:border-success/50 focus-visible:bg-success/10 focus-visible:text-success active:scale-[0.97] active:bg-success/15 active:shadow-none",
  info: "border-info/35 bg-surface text-info/90 hover:border-info/50 hover:bg-info/10 hover:text-info hover:shadow-[0_2px_8px_rgba(37,99,235,0.18)] focus-visible:border-info/50 focus-visible:bg-info/10 focus-visible:text-info active:scale-[0.97] active:bg-info/15 active:shadow-none",
  denison:
    "border-denison-red/35 bg-surface text-denison-red/90 hover:border-denison-red/50 hover:bg-denison-red/10 hover:text-denison-red hover:shadow-[0_2px_8px_rgba(200,16,46,0.18)] focus-visible:border-denison-red/50 focus-visible:bg-denison-red/10 focus-visible:text-denison-red active:scale-[0.97] active:bg-denison-red/15 active:shadow-none",
  module:
    "border-[var(--module-border)] bg-surface text-[var(--module-accent)] hover:border-[var(--module-accent)]/50 hover:bg-[var(--module-tint)] hover:text-[var(--module-accent)] focus-visible:border-[var(--module-accent)]/50 focus-visible:bg-[var(--module-tint)] focus-visible:text-[var(--module-accent)] active:scale-[0.97] active:bg-[var(--module-tint)] active:shadow-none",
  neutral:
    "border-border bg-surface text-text-secondary hover:bg-app-background hover:shadow-sm focus-visible:bg-app-background active:scale-[0.97] active:shadow-none",
  warning:
    "border-warning/40 bg-surface text-warning hover:border-warning/55 hover:bg-warning/10 hover:shadow-[0_2px_8px_rgba(245,158,11,0.18)] focus-visible:border-warning/55 focus-visible:bg-warning/10 active:scale-[0.97] active:bg-warning/15 active:shadow-none",
  research:
    "border-research/35 bg-surface text-research hover:border-research/50 hover:bg-research/10 hover:shadow-[0_2px_8px_rgba(124,58,237,0.18)] focus-visible:border-research/50 focus-visible:bg-research/10 active:scale-[0.97] active:bg-research/15 active:shadow-none",
  knowledge:
    "border-knowledge/35 bg-surface text-knowledge hover:border-knowledge/50 hover:bg-knowledge/10 hover:shadow-[0_2px_8px_rgba(15,118,110,0.18)] focus-visible:border-knowledge/50 focus-visible:bg-knowledge/10 active:scale-[0.97] active:bg-knowledge/15 active:shadow-none",
};

const filledToneClasses: Record<QuickActionTone, string> = {
  success:
    "border-transparent bg-success text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(22,163,74,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  info: "border-transparent bg-info text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(37,99,235,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  denison:
    "border-transparent bg-denison-red text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(200,16,46,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  module:
    "border-transparent bg-[var(--module-accent)] text-surface hover:brightness-95 focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  neutral:
    "border-transparent bg-text-secondary text-surface hover:brightness-95 focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  warning:
    "border-transparent bg-warning text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(245,158,11,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  research:
    "border-transparent bg-research text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(124,58,237,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
  knowledge:
    "border-transparent bg-knowledge text-surface hover:brightness-95 hover:shadow-[0_2px_8px_rgba(15,118,110,0.28)] focus-visible:brightness-95 active:scale-[0.97] active:brightness-90",
};

/**
 * A circular icon button for quick contact / utility actions on Team List
 * rows, cards, and the Player Workspace. Stops click propagation so
 * activating the action never triggers a parent row/card navigation
 * target. Renders disabled (with an optional tooltip) when neither `href`
 * nor `onAction` is provided.
 *
 * `size="compact"` (32px) is opt-in for denser surfaces (e.g. Rank View).
 * Default remains 40px for directory / card Actions.
 */
export type QuickActionSize = "default" | "compact";

const sizeClasses: Record<QuickActionSize, { button: string; icon: string }> = {
  default: { button: "h-10 w-10", icon: "h-[17px] w-[17px]" },
  compact: { button: "h-8 w-8", icon: "h-3.5 w-3.5" },
};

export default function QuickActionButton({
  href,
  onAction,
  icon: Icon,
  label,
  tone,
  appearance = "outline",
  size = "default",
  className = "",
  unavailableTitle,
  openInNewTab = false,
}: {
  href?: string;
  /** Click handler for non-navigation actions (e.g. Copy Address). */
  onAction?: () => void;
  icon: LucideIcon | ComponentType<LucideProps>;
  label: string;
  tone: QuickActionTone;
  appearance?: QuickActionAppearance;
  size?: QuickActionSize;
  className?: string;
  /** Tooltip when the control is disabled (defaults to `${label} unavailable`). */
  unavailableTitle?: string;
  /** When true and `href` is set, open in a new tab. */
  openInNewTab?: boolean;
}) {
  const dims = sizeClasses[size];
  const toneClass =
    appearance === "filled" ? filledToneClasses[tone] : outlineToneClasses[tone];
  const baseClassName =
    `inline-flex ${dims.button} shrink-0 cursor-pointer items-center justify-center rounded-full border select-none transition-[color,background-color,border-color,box-shadow,transform,filter] duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--module-accent)]`;

  function stopParentNavigation(event: MouseEvent) {
    // Sit above a full-card / row click target — never let the gesture bubble
    // into that surface's navigation.
    event.stopPropagation();
  }

  if (!href && !onAction) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={`${label} unavailable`}
        title={unavailableTitle ?? `${label} unavailable`}
        onClick={stopParentNavigation}
        onMouseDown={stopParentNavigation}
        className={`${baseClassName} cursor-not-allowed border-border bg-surface text-text-secondary/35 hover:scale-100 hover:shadow-none ${className}`}
      >
        <Icon className={dims.icon} strokeWidth={2} aria-hidden />
      </button>
    );
  }

  if (onAction && !href) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          stopParentNavigation(event);
          onAction();
        }}
        onMouseDown={stopParentNavigation}
        className={`${baseClassName} ${toneClass} ${className}`}
      >
        <Icon className={dims.icon} strokeWidth={2} aria-hidden />
      </button>
    );
  }

  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      onClick={stopParentNavigation}
      onMouseDown={stopParentNavigation}
      className={`${baseClassName} ${toneClass} ${className}`}
    >
      <Icon className={dims.icon} strokeWidth={2} aria-hidden />
    </a>
  );
}
