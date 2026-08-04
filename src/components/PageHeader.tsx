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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-base text-text-secondary">{subtitle}</p>
        ) : null}
        {meta ? <p className="mt-1 text-sm text-text-secondary">{meta}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
