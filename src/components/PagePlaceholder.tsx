export default function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-3 text-base text-text-secondary">{description}</p>

      <div className="mt-12 flex h-96 items-center justify-center rounded-card border border-dashed border-border text-sm font-medium text-text-secondary">
        Workspace coming soon.
      </div>
    </div>
  );
}
