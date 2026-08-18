/**
 * Settings and similar non-directory pages.
 * Top-level OS modules use ModulePageShell (Recruiting List geometry).
 */
export default function PageHeader({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="relative pl-4">
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-[var(--module-accent)]"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2.5 text-base text-text-secondary">{subtitle}</p>
        ) : null}
        {meta ? (
          <p className="mt-2 inline-flex rounded-full bg-[var(--module-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--module-accent)]">
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
