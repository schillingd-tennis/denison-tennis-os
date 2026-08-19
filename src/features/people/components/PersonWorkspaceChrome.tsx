"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Calendar,
  Gauge,
  GraduationCap,
  ListOrdered,
  UserCheck,
} from "lucide-react";

import PlayerAvatar from "@/components/PlayerAvatar";
import { typeClass, typeRole } from "@/components/typography";
import PersonStatusLabel from "@/features/people/components/PersonStatusLabel";
import type { Person } from "@/features/people/types";
import {
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  getPlayerStatusLabel,
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

export type PersonWorkspaceNavTone =
  | "personal-info"
  | "family"
  | "academics"
  | "equipment"
  | "travel"
  | "communications"
  | "related-players";

export type PersonWorkspaceNavItem = {
  id: PersonWorkspaceNavTone;
  title: string;
  icon: LucideIcon;
  descriptor: string;
};

const toneSurface: Record<
  PersonWorkspaceNavTone,
  { icon: string; active: string; activeIcon: string }
> = {
  "personal-info": {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
  },
  family: {
    icon: "bg-knowledge/10 text-knowledge",
    active: "border-knowledge bg-knowledge/[0.07]",
    activeIcon: "bg-knowledge/15 text-knowledge",
  },
  academics: {
    icon: "bg-success/10 text-success",
    active: "border-success bg-success/[0.07]",
    activeIcon: "bg-success/15 text-success",
  },
  equipment: {
    icon: "bg-operations/10 text-operations",
    active: "border-operations bg-operations/[0.07]",
    activeIcon: "bg-operations/15 text-operations",
  },
  travel: {
    icon: "bg-warning/15 text-warning",
    active: "border-warning bg-warning/[0.10]",
    activeIcon: "bg-warning/20 text-warning",
  },
  communications: {
    icon: "bg-research/10 text-research",
    active: "border-research bg-research/[0.08]",
    activeIcon: "bg-research/15 text-research",
  },
  "related-players": {
    icon: "bg-info/10 text-info",
    active: "border-info bg-info/[0.07]",
    activeIcon: "bg-info/15 text-info",
  },
};

const tileTone = {
  crimson: {
    card: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
    well: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    value: "text-[var(--module-accent)]",
  },
  info: {
    card: "border-info/12 bg-info/[0.06]",
    well: "bg-info/10 text-info",
    value: "text-info",
  },
  success: {
    card: "border-success/15 bg-success/[0.06]",
    well: "bg-success/10 text-success",
    value: "text-success",
  },
  warning: {
    card: "border-warning/18 bg-warning/[0.08]",
    well: "bg-warning/15 text-warning",
    value: "text-warning",
  },
  research: {
    card: "border-research/12 bg-research/[0.07]",
    well: "bg-research/10 text-research",
    value: "text-research",
  },
} as const;

type TileTone = keyof typeof tileTone;

function metricOrNoData(value: string): string {
  if (!value.trim() || value === EMPTY_VALUE) return NO_DATA;
  return value;
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: TileTone;
}) {
  const empty =
    typeof value === "string"
      ? !value.trim() || value === EMPTY_VALUE || value === NO_DATA || value === COMING_SOON
      : false;
  const styles = tileTone[tone];
  const display =
    typeof value === "string" && (value === COMING_SOON || empty) ? (value === COMING_SOON ? COMING_SOON : "No data") : value;
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 rounded-control border px-3 py-2.5 ${styles.card}`}
    >
      <div className="min-w-0">
        <div
          title={!empty && typeof value === "string" ? value : undefined}
          className={`truncate text-[17px] leading-none font-semibold tabular-nums tracking-tight ${
            empty || value === COMING_SOON ? typeRole.metadataEmpty : styles.value
          }`}
        >
          {display}
        </div>
        <p className="mt-1.5 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
          {label}
        </p>
      </div>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.well}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    </div>
  );
}

function SummaryField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <p className={typeRole.workspaceFieldLabel}>{label}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}

function SummaryValue({ value }: { value: string }) {
  const empty = !value.trim() || value === NO_DATA || value === EMPTY_VALUE;
  return (
    <span
      title={empty ? undefined : value}
      className={`truncate ${typeRole.workspaceFieldValue} ${empty ? typeRole.metadataEmpty : ""}`}
    >
      {empty ? NO_DATA : value}
    </span>
  );
}

export function PersonWorkspaceProfile({
  person,
  statusSlot,
  roleSlot,
  playerStatusSlot,
  followUpValue,
}: {
  person: Person;
  statusSlot?: ReactNode;
  roleSlot?: ReactNode;
  playerStatusSlot?: ReactNode;
  followUpValue?: string;
}) {
  const fullName = getFullDisplayName(person);
  const preferred =
    person.preferredName?.trim() &&
    person.preferredName.trim() !== person.firstName.trim()
      ? person.preferredName.trim()
      : undefined;
  const coachDirectory = isCoachDirectoryPerson(person);
  const familyPerson = isFamilyPerson(person);
  const hometown = metricOrNoData(formatDisplay(getHometown(person)));
  const classYear =
    !coachDirectory && !familyPerson && person.classYear !== undefined
      ? String(person.classYear)
      : NO_DATA;
  const major = coachDirectory || familyPerson
    ? NO_DATA
    : metricOrNoData(formatDisplay(person.major));
  const rightSecondary = familyPerson
    ? metricOrNoData(formatDisplay(person.personalEmail))
    : metricOrNoData(formatDisplay(person.denisonEmail ?? person.personalEmail));
  const utr = metricOrNoData(coachDirectory || familyPerson ? EMPTY_VALUE : formatUtr(person.utr));
  const wtn = metricOrNoData(coachDirectory || familyPerson ? EMPTY_VALUE : formatWtn(person.wtn));
  const playerStatusDisplay = person.playerStatus
    ? getPlayerStatusLabel(person.playerStatus)
    : NO_DATA;

  return (
    <section
      className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
      aria-label="Person header"
    >
      <div className="flex flex-col gap-4">
        <div
          className="grid w-full min-w-0 gap-x-8"
          style={{ gridTemplateColumns: "max-content minmax(0, 1fr)" }}
        >
          <div className="flex w-max items-start gap-3.5" style={{ maxWidth: 360 }}>
            <PlayerAvatar
              photoUrl={person.photoUrl}
              initials={getInitials(person)}
              size={64}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className={typeRole.personNameHero}>{fullName}</h1>
              {preferred ? (
                <p className={typeClass("identityMeta")}>Preferred: {preferred}</p>
              ) : null}
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {statusSlot ?? (
                  <PersonStatusLabel
                    tone="active"
                    label={getPersonRoleDisplay(person)}
                  />
                )}
                {roleSlot ?? (
                  <span className="text-sm font-medium text-text-primary">
                    {getPersonRoleDisplay(person)}
                  </span>
                )}
                {playerStatusSlot}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {!familyPerson ? (
                  <SummaryField label="Class">
                    <SummaryValue value={classYear} />
                  </SummaryField>
                ) : null}
                <SummaryField label="Hometown">
                  <SummaryValue value={hometown} />
                </SummaryField>
              </div>
            </div>
          </div>

          <div className="min-w-0 border-l border-border pl-8" aria-label="Identity summary">
            {!familyPerson ? (
              <SummaryField label="Major">
                <SummaryValue value={major} />
              </SummaryField>
            ) : (
              <SummaryField label="Email">
                <SummaryValue value={rightSecondary} />
              </SummaryField>
            )}
            <SummaryField
              label={familyPerson ? "Phone" : "Denison email"}
              className="mt-2.5"
            >
              <SummaryValue
                value={
                  familyPerson
                    ? metricOrNoData(formatDisplay(person.cellPhone))
                    : rightSecondary
                }
              />
            </SummaryField>
          </div>
        </div>

        {!familyPerson ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
            aria-label="Player snapshot"
          >
            <MetricTile label="UTR" value={utr} icon={Gauge} tone="crimson" />
            <MetricTile label="WTN" value={wtn} icon={Activity} tone="info" />
            <MetricTile
              label="Team Record"
              value={COMING_SOON}
              icon={ListOrdered}
              tone="success"
            />
            <MetricTile label="GPA" value={COMING_SOON} icon={GraduationCap} tone="warning" />
            <MetricTile
              label="Player Status"
              value={coachDirectory ? NO_DATA : playerStatusDisplay}
              icon={UserCheck}
              tone="research"
            />
            <MetricTile
              label="Next Follow-up"
              value={followUpValue ?? COMING_SOON}
              icon={Calendar}
              tone="info"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PersonWorkspaceNav({
  items,
  activeId,
  onSelect,
}: {
  items: PersonWorkspaceNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-border/35" role="listbox" aria-label="Workspaces">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const tone = toneSurface[item.id];
        return (
          <li key={item.id} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group flex w-full cursor-pointer items-center gap-3 border-l-[3px] px-3 py-2 text-left transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--module-accent)]/35 ${
                active ? tone.active : "border-transparent hover:bg-app-background"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                  active ? tone.activeIcon : tone.icon
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium tracking-tight text-text-primary">
                  {item.title}
                </span>
                <span className="mt-px block truncate text-[12px] leading-snug text-text-secondary">
                  {item.descriptor}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
