export default function InformationField({
  label,
  value,
  action,
}: {
  label: string;
  value?: string;
  action?: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2 text-sm text-text-primary">
        <span>{value}</span>
        {action}
      </dd>
    </div>
  );
}
