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
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-border text-center ${
        compact ? "px-4 py-8" : "px-6 py-20"
      }`}
    >
      <p
        className={`font-medium text-text-primary ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </p>
      {description ? (
        <p
          className={`max-w-sm text-text-secondary ${
            compact ? "mt-1.5 text-xs" : "mt-2.5 text-sm"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
