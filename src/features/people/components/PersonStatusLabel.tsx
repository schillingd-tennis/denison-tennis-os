import StatusDot, { type StatusDotTone } from "@/components/StatusDot";
import { typeClass } from "@/components/typography";

/**
 * Program status as StatusDot + plain text (BP-022B).
 * ● Current  ·  ○ Alumni — never a filled pill.
 */
export default function PersonStatusLabel({
  tone,
  label,
  className = "",
}: {
  tone: StatusDotTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={typeClass(
        "metadataSm",
        `inline-flex items-center gap-1.5 font-medium ${className}`,
      )}
    >
      <StatusDot tone={tone} label={label} />
      <span>{label}</span>
    </span>
  );
}
