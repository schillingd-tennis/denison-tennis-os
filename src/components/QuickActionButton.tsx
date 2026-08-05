import type { LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";

/**
 * Restrained color treatments for quick-action buttons (call / text / email
 * today; reusable for other contact-style actions on future card types).
 * Colors are applied as a tinted icon + hover background rather than a
 * saturated fill, per the design system's "avoid overly bright colors" rule.
 */
export type QuickActionTone = "success" | "info" | "denison" | "neutral";

const toneClasses: Record<QuickActionTone, string> = {
  success: "text-success hover:bg-success/10 focus-visible:bg-success/10",
  info: "text-info hover:bg-info/10 focus-visible:bg-info/10",
  denison: "text-denison-red hover:bg-denison-red/10 focus-visible:bg-denison-red/10",
  neutral: "text-text-secondary hover:bg-app-background focus-visible:bg-app-background",
};

/**
 * A small, always-visible circular icon button for quick contact actions
 * (e.g. call/text/email) on directory-style cards. Designed to sit on top
 * of a full-card overlay link: it stops click propagation so activating the
 * action never triggers the card's own navigation, and renders as a
 * disabled, visually muted button when the required contact value is
 * missing rather than disappearing.
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
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denison-red";

  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={`${label} unavailable`}
        title={`${label} unavailable`}
        className={`${baseClassName} cursor-not-allowed text-text-secondary/40 ${className}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    );
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Quick actions sit above a full-card / row click target — never let the
    // click bubble up into that surface's navigation.
    event.stopPropagation();
  };

  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={`${baseClassName} ${toneClasses[tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </a>
  );
}
