import { typeRole } from "@/components/typography";

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
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd className={`mt-1 flex items-center gap-2 ${typeRole.fieldValue}`}>
        <span>{value}</span>
        {action}
      </dd>
    </div>
  );
}
