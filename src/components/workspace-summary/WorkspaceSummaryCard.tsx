import { typeRole } from "@/components/typography";

export type WorkspaceSummaryFact = {
  /** Optional label (e.g. "Last Contact"). Omit for a single-line signal. */
  label?: string;
  value: string;
};

/**
 * BP-034A (Revised) — Compact executive summary for a workspace module.
 *
 * Shows only what a coach needs to scan. Detail work opens via `onOpen`
 * into the shared Workspace Drawer — not a nested page.
 */
export default function WorkspaceSummaryCard({
  title,
  facts,
  actionLabel,
  onOpen,
  className,
}: {
  title: string;
  facts: WorkspaceSummaryFact[];
  actionLabel: string;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] ${className ?? ""}`}
    >
      <h2 className={typeRole.sectionTitle}>{title}</h2>

      <ul className="mt-3 flex flex-1 flex-col gap-2">
        {facts.map((fact, index) => (
          <li key={`${fact.label ?? "fact"}-${index}`} className="min-w-0">
            {fact.label ? (
              <div className="flex flex-col gap-0.5">
                <span className={typeRole.sectionLabel}>{fact.label}</span>
                <span className="truncate text-sm font-medium text-text-primary">
                  {fact.value}
                </span>
              </div>
            ) : (
              <span className="text-sm text-text-primary">{fact.value}</span>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-control border border-[var(--module-border)] bg-surface text-sm font-medium text-text-primary transition-colors duration-150 hover:border-[var(--module-accent)]/50 hover:bg-[var(--module-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--module-accent)]"
      >
        {actionLabel}
      </button>
    </section>
  );
}
