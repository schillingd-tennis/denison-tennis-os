export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-16 text-center">
      <p className="text-base font-medium text-text-primary">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
      ) : null}
    </div>
  );
}
