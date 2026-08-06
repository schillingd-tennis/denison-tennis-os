import { typeRole } from "@/components/typography";
import type { Person } from "@/features/people/types";
import {
  getPersonRoleDisplay,
  getPlayerStatusLabel,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

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

function SnapshotCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <section className="rounded-card border border-border bg-surface px-5 py-5">
      <h2 className={typeRole.sectionTitle}>{title}</h2>
      <dl className="mt-3">
        {rows.map((row) => (
          <SnapshotRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </section>
  );
}

function displayOrNoData(value: string | undefined): string {
  const formatted = formatDisplay(value);
  return formatted === EMPTY_VALUE ? NO_DATA : formatted;
}

/**
 * Shared overview snapshots below PersonHeader (BP-031B).
 * Unknown operational fields use “Coming soon” until those domains exist.
 */
export default function OverviewPanel({
  person,
  className,
}: {
  person: Person;
  className?: string;
}) {
  const coachDirectory = isCoachDirectoryPerson(person);
  const teamRole =
    person.title?.trim() || getPersonRoleDisplay(person) || NO_DATA;
  const injuryStatus = person.playerStatus
    ? getPlayerStatusLabel(person.playerStatus)
    : NO_DATA;
  const utr = coachDirectory ? NO_DATA : formatUtr(person.utr);
  const wtn = coachDirectory ? NO_DATA : formatWtn(person.wtn);

  return (
    <div
      className={`grid gap-5 lg:grid-cols-2 ${className ?? ""}`}
      aria-label="Overview"
    >
      <SnapshotCard
        title="Player Snapshot"
        rows={[
          { label: "Last Communication", value: COMING_SOON },
          { label: "Next Follow-up", value: COMING_SOON },
          { label: "Academic Standing", value: COMING_SOON },
          { label: "Injury Status", value: injuryStatus },
          { label: "Team Role", value: displayOrNoData(teamRole) },
        ]}
      />
      <SnapshotCard
        title="Tennis Snapshot"
        rows={[
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
        ]}
      />
    </div>
  );
}
