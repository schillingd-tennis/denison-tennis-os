import type { ReactNode } from "react";

import PlayerAvatar from "@/components/PlayerAvatar";
import { typeClass, typeRole } from "@/components/typography";
import type { Person } from "@/features/people/types";
import {
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  getPlayerStatusLabel,
  getStatusLabel,
  isCoachDirectoryPerson,
  isFamilyPerson,
} from "@/features/people/utils";
import {
  EMPTY_VALUE,
  formatDisplay,
  formatUtr,
  formatWtn,
} from "@/lib/formatting";

const NO_DATA = "No data";
const COMING_SOON = "Coming soon";

function metricOrNoData(value: string): string {
  if (!value.trim() || value === EMPTY_VALUE) return NO_DATA;
  return value;
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  const empty =
    value === NO_DATA || value === COMING_SOON || value === EMPTY_VALUE;
  return (
    <div className="min-w-0 rounded-control border border-border/80 bg-app-background/60 px-3 py-3">
      <p className={typeRole.sectionLabel}>{label}</p>
      <p
        className={`mt-1.5 truncate text-base font-semibold tracking-tight ${
          empty ? typeRole.metadataEmpty : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function IdentityFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const empty = !value.trim() || value === NO_DATA || value === EMPTY_VALUE;
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <span className={`shrink-0 ${typeRole.sectionLabel}`}>{label}</span>
      <span
        className={`truncate text-sm font-medium ${
          empty ? typeRole.metadataEmpty : "text-text-primary"
        }`}
      >
        {empty ? NO_DATA : value}
      </span>
    </span>
  );
}

/**
 * Executive Person header (BP-031E / BP-031G).
 * Identity + Executive Overview. Page actions live in the workspace toolbar only.
 * Family people (BP-040E): no Class/Major, no Executive Overview.
 */
export default function PersonHeader({
  person,
  statusSlot,
  roleSlot,
  playerStatusSlot,
  className,
}: {
  person: Person;
  /** When set, replaces the read-only Status badge (e.g. InlineEditCell). */
  statusSlot?: ReactNode;
  roleSlot?: ReactNode;
  playerStatusSlot?: ReactNode;
  className?: string;
}) {
  const fullName = getFullDisplayName(person);
  const preferred =
    person.preferredName?.trim() &&
    person.preferredName.trim() !== person.firstName.trim()
      ? person.preferredName.trim()
      : undefined;
  const hometown = getHometown(person);
  const coachDirectory = isCoachDirectoryPerson(person);
  const familyPerson = isFamilyPerson(person);
  const roleDisplay = getPersonRoleDisplay(person);

  const classYear =
    !coachDirectory && person.classYear !== undefined
      ? String(person.classYear)
      : NO_DATA;
  const major = coachDirectory
    ? NO_DATA
    : metricOrNoData(formatDisplay(person.major));
  const hometownDisplay = metricOrNoData(formatDisplay(hometown));
  const utr = metricOrNoData(
    coachDirectory ? EMPTY_VALUE : formatUtr(person.utr)
  );
  const wtn = metricOrNoData(
    coachDirectory ? EMPTY_VALUE : formatWtn(person.wtn)
  );
  const playerStatus = person.playerStatus
    ? getPlayerStatusLabel(person.playerStatus)
    : NO_DATA;

  const showBadgeRow = Boolean(statusSlot || roleSlot || playerStatusSlot);

  return (
    <section
      className={`rounded-card border border-border bg-surface px-6 py-6 ${className ?? ""}`}
      aria-label="Person header"
    >
      <div className="flex flex-col gap-5">
        {/* Identity row: Left / Center */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
          {/* LEFT — identity */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <PlayerAvatar
              photoUrl={person.photoUrl}
              initials={getInitials(person)}
              size={72}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className={typeRole.personNameHero}>{fullName}</h1>
              {preferred ? (
                <p className={typeClass("identityMeta")}>Preferred: {preferred}</p>
              ) : null}
              {showBadgeRow ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {statusSlot}
                  {roleSlot}
                  {playerStatusSlot}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {formatDisplay(getStatusLabel(person))}
                  </span>
                  <span className="text-text-secondary/40" aria-hidden>
                    ·
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatDisplay(roleDisplay)}
                  </span>
                  {!coachDirectory && !familyPerson ? (
                    <>
                      <span className="text-text-secondary/40" aria-hidden>
                        ·
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          playerStatus === NO_DATA
                            ? typeRole.metadataEmpty
                            : "text-text-primary"
                        }`}
                      >
                        {playerStatus}
                      </span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* CENTER — primary identity facts (UTR/WTN live in Executive Overview only) */}
          <div
            className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-border lg:border-l lg:pl-6"
            aria-label="Primary identity"
          >
            {!familyPerson ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <IdentityFact label="Class" value={classYear} />
                <span className="hidden text-text-secondary/35 sm:inline" aria-hidden>
                  ·
                </span>
                <IdentityFact label="Major" value={major} />
              </div>
            ) : null}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <IdentityFact label="Hometown" value={hometownDisplay} />
            </div>
          </div>
        </div>

        {/* Executive Overview — players/coaches only (BP-040E: omit for family) */}
        {!familyPerson ? (
          <div aria-label="Executive Overview">
            <p className={`${typeRole.sectionTitle} mb-3`}>Executive Overview</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SnapshotMetric label="UTR" value={utr} />
              <SnapshotMetric label="WTN" value={wtn} />
              <SnapshotMetric label="Team Record" value={COMING_SOON} />
              <SnapshotMetric label="GPA" value={COMING_SOON} />
              <SnapshotMetric
                label="Player Status"
                value={coachDirectory ? NO_DATA : playerStatus}
              />
              <SnapshotMetric label="Next Follow-up" value={COMING_SOON} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
