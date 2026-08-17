import { X } from "lucide-react";

import { typeRole } from "@/components/typography";

/**
 * BP-034A — Title, optional subtitle, and close control.
 */
export default function DrawerHeader({
  title,
  subtitle,
  onClose,
  titleId,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  titleId?: string;
}) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b border-border/80 px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2
          id={titleId}
          className="text-base font-semibold tracking-tight text-text-primary"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className={`mt-0.5 truncate ${typeRole.metadataSm}`}>{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-app-background hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--module-accent)]"
      >
        <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
    </header>
  );
}
