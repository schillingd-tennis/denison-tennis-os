import type { LucideIcon } from "lucide-react";

export default function ContactAction({
  href,
  icon: Icon,
  label,
  variant = "button",
  className = "",
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  variant?: "button" | "icon";
  className?: string;
}) {
  if (variant === "icon") {
    if (!href) return null;

    return (
      <a
        href={href}
        aria-label={label}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-app-background hover:text-[var(--module-accent)] ${className}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </a>
    );
  }

  if (!href) {
    return (
      <span
        className={`flex h-10 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-secondary opacity-50 ${className}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`flex h-10 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-[var(--module-accent)] hover:text-[var(--module-accent)] ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </a>
  );
}
