export default function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <div className="relative pl-4">
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-[var(--module-accent)]"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-2 text-base text-text-secondary">{description}</p>
      </div>

      <div className="relative mt-10 flex min-h-80 flex-col items-center justify-center overflow-hidden rounded-card border border-[var(--module-border)] bg-[var(--module-tint)] px-6 text-center shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-[var(--module-accent)]"
        />
        <p className="text-sm font-semibold text-text-primary">{title} workspace</p>
        <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
          This module is ready for its operational views and workflows.
        </p>
      </div>
    </div>
  );
}
