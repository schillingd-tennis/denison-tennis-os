import { Fragment, type ReactNode } from "react";

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
    <div className="min-w-0 rounded-control border border-[var(--module-border)] bg-[var(--module-tint)]/55 px-3 py-3">
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
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const empty = !value.trim() || value === NO_DATA || value === EMPTY_VALUE;
  return (
    <span className={`inline-flex min-w-0 items-baseline gap-1.5 ${className ?? ""}`}>
      <span className={`shrink-0 ${typeRole.sectionLabel}`}>{label}</span>
      <span
        title={empty ? undefined : value}
        className={`truncate text-sm font-medium ${
          empty ? typeRole.metadataEmpty : "text-text-primary"
        }`}
      >
        {empty ? NO_DATA : value}
      </span>
    </span>
  );
}

function IdentityFactRow({
  facts,
  constrainValue,
}: {
  facts: { label: string; value: string }[];
  constrainValue?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      {facts.map((fact, index) => (
        <Fragment key={fact.label}>
          {index > 0 ? (
            <span className="hidden text-text-secondary/35 sm:inline" aria-hidden>
              ·
            </span>
          ) : null}
          <IdentityFact
            label={fact.label}
            value={fact.value}
            className={constrainValue ? "max-w-[min(100%,22rem)]" : undefined}
          />
        </Fragment>
      ))}
    </div>
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
  identityFacts,
  overviewMetrics,
  className,
}: {
  person: Person;
  /** When set, replaces the read-only Status badge (e.g. InlineEditCell). */
  statusSlot?: ReactNode;
  roleSlot?: ReactNode;
  playerStatusSlot?: ReactNode;
  /** When set, replaces Class / Major / Hometown (recruit workspace). */
  identityFacts?: { label: string; value: string }[];
  /** When set, replaces the default Executive Overview tiles. */
  overviewMetrics?: { label: string; value: string }[];
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
      className={`rounded-card border border-[var(--module-border)] bg-surface px-6 py-6 shadow-[0_8px_24px_rgba(17,24,39,0.04)] ${className ?? ""}`}
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
            {identityFacts ? (
              <div className="flex flex-col gap-2">
                <IdentityFactRow facts={identityFacts.slice(0, 2)} constrainValue />
                {identityFacts.length > 2 ? (
                  <IdentityFactRow facts={identityFacts.slice(2)} constrainValue />
                ) : null}
              </div>
            ) : (
              <>
                {!familyPerson ? (
                  <IdentityFactRow
                    facts={[
                      { label: "Class", value: classYear },
                      { label: "Major", value: major },
                    ]}
                  />
                ) : null}
                <IdentityFactRow
                  facts={[{ label: "Hometown", value: hometownDisplay }]}
                />
              </>
            )}
          </div>
        </div>

        {/* Executive Overview — players/coaches only (BP-040E: omit for family) */}
        {!familyPerson ? (
          <div aria-label="Executive Overview">
            <p className={`${typeRole.sectionTitle} mb-3`}>Executive Overview</p>
            <div
              className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${
                overviewMetrics && overviewMetrics.length < 6
                  ? "lg:grid-cols-4"
                  : "lg:grid-cols-6"
              }`}
            >
              {(overviewMetrics ?? [
                { label: "UTR", value: utr },
                { label: "WTN", value: wtn },
                { label: "Team Record", value: COMING_SOON },
                { label: "GPA", value: COMING_SOON },
                {
                  label: "Player Status",
                  value: coachDirectory ? NO_DATA : playerStatus,
                },
                { label: "Next Follow-up", value: COMING_SOON },
              ]).map((metric) => (
                <SnapshotMetric key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
