import { typeRole } from "@/components/typography";
import type { Person } from "@/features/people/types";
import { isCoachDirectoryPerson } from "@/features/people/utils";
import { EMPTY_VALUE, formatUtr, formatWtn } from "@/lib/formatting";

const COMING_SOON = "Coming soon";
const NO_DATA = "No data";

function SnapshotRow({ label, value }: { label: string; value: string }) {
  const empty =
    value === COMING_SOON || value === NO_DATA || value === EMPTY_VALUE || value.trim() === "";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-sm ${
          empty ? typeRole.metadataEmpty : "font-medium text-text-primary"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Tennis Performance executive panel (BP-031B / BP-034A Revised).
 * Remains on the Person Workspace page; other detail moves to summary cards.
 */
export default function OverviewPanel({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  const coachDirectory = isCoachDirectoryPerson(person);
  const utr = coachDirectory ? NO_DATA : formatUtr(person.utr);
  const wtn = coachDirectory ? NO_DATA : formatWtn(person.wtn);

  const rows = [
    {
      label: "Current UTR",
      value: utr === EMPTY_VALUE ? NO_DATA : utr,
    },
    {
      label: "Current WTN",
      value: wtn === EMPTY_VALUE ? NO_DATA : wtn,
    },
    { label: "Last Match", value: COMING_SOON },
    { label: "Record", value: COMING_SOON },
    { label: "Last Practice Note", value: COMING_SOON },
  ];

  return (
    <section
      className={`rounded-card border border-border bg-surface px-5 py-5 ${className ?? ""}`}
      aria-label="Tennis Performance"
    >
      <h2 className={typeRole.sectionTitle}>Tennis Performance</h2>
      <dl className="mt-3 max-w-xl">
        {rows.map((row) => (
          <SnapshotRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </section>
  );
}
