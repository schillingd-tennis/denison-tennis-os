export default function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: string;
  /** Quieter empty used inside cards / side panels. */
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-[var(--module-border)] bg-[var(--module-tint)] text-center ${
        compact ? "px-4 py-8" : "px-6 py-16"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-[var(--module-accent)]"
      />
      <p
        className={`font-medium text-text-primary ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </p>
      {description ? (
        <p
          className={`mx-auto max-w-sm text-text-secondary ${
            compact ? "mt-1.5 text-xs" : "mt-2.5 text-sm"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
