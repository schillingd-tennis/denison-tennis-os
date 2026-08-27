"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Gauge,
  GitBranch,
  ListOrdered,
  Pencil,
  Star,
} from "lucide-react";

import { InlineEditCell } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import { typeClass, typeRole } from "@/components/typography";
import { usePersonFieldSession } from "@/features/field-engine";
import PersonStatusLabel from "@/features/people/components/PersonStatusLabel";
import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  parseHometown,
} from "@/features/people/utils";
import { EMPTY_VALUE } from "@/lib/formatting";

import { rankingProfileHref } from "../rankingProfileUrl";
import { RecruitProfileField } from "./RecruitProfileFields";
import { RecruitStarRatingDisplay } from "./RecruitRatingDisplay";
import {
  RecruitSummaryAcademicColumn,
  SummaryField,
} from "./RecruitSummaryLockedSlots";

export type RecruitWorkspaceTone =
  | "personal-info"
  | "academics"
  | "rankings"
  | "analytics"
  | "visit"
  | "notes"
  | "communications"
  | "log";

export type RecruitWorkspaceNavItem = {
  id: RecruitWorkspaceTone;
  title: string;
  icon: LucideIcon;
  descriptor: string;
};

const toneSurface: Record<
  RecruitWorkspaceTone,
  { icon: string; active: string; activeIcon: string; chevron: string }
> = {
  "personal-info": {
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    active: "border-[var(--module-accent)] bg-[var(--module-tint)]",
    activeIcon: "bg-[var(--module-accent)]/15 text-[var(--module-accent)]",
    chevron: "text-[var(--module-accent)]/70",
  },
  academics: {
    icon: "bg-success/10 text-success",
    active: "border-success bg-success/[0.07]",
    activeIcon: "bg-success/15 text-success",
    chevron: "text-success/70",
  },
  rankings: {
    icon: "bg-warning/15 text-warning",
    active: "border-warning bg-warning/[0.10]",
    activeIcon: "bg-warning/20 text-warning",
    chevron: "text-warning/80",
  },
  analytics: {
    icon: "bg-info/10 text-info",
    active: "border-info bg-info/[0.07]",
    activeIcon: "bg-info/15 text-info",
    chevron: "text-info/70",
  },
  visit: {
    icon: "bg-warning/15 text-warning",
    active: "border-warning bg-warning/[0.10]",
    activeIcon: "bg-warning/20 text-warning",
    chevron: "text-warning/80",
  },
  notes: {
    icon: "bg-knowledge/10 text-knowledge",
    active: "border-knowledge bg-knowledge/[0.07]",
    activeIcon: "bg-knowledge/15 text-knowledge",
    chevron: "text-knowledge/70",
  },
  communications: {
    icon: "bg-research/10 text-research",
    active: "border-research bg-research/[0.08]",
    activeIcon: "bg-research/15 text-research",
    chevron: "text-research/70",
  },
  log: {
    icon: "bg-teal-700/10 text-teal-800",
    active: "border-teal-700 bg-teal-700/[0.07]",
    activeIcon: "bg-teal-700/15 text-teal-800",
    chevron: "text-teal-800/70",
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

export function RecruitSummaryStarRatingMetricTile() {
  const session = usePersonFieldSession();
  const rating = session.person.trnStarRating;
  const empty = rating === undefined;
  const styles = tileTone.warning;

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 rounded-control border px-3 py-2.5 ${styles.card}`}
    >
      <div className="min-w-0">
        <div className={`min-h-[17px] leading-none ${empty ? typeRole.metadataEmpty : ""}`}>
          <RecruitStarRatingDisplay rating={rating} size="sm" emptyLabel="—" />
        </div>
        <p className="mt-1.5 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
          Star Rating
        </p>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
  profileHref,
  profileAriaLabel,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: TileTone;
  /** Stored external ranking profile URL — icon is a link only when set. */
  profileHref?: string;
  profileAriaLabel?: string;
}) {
  const empty =
    typeof value === "string"
      ? !value.trim() || value === EMPTY_VALUE || value === "No data"
      : false;
  const styles = tileTone[tone];
  const wellClass = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.well}`;
  const icon = <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />;

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 rounded-control border px-3 py-2.5 ${styles.card}`}
    >
      <div className="min-w-0">
        <div
          title={!empty && typeof value === "string" ? value : undefined}
          className={`truncate text-[17px] leading-none font-semibold tabular-nums tracking-tight ${
            empty ? typeRole.metadataEmpty : styles.value
          }`}
        >
          {empty ? "No data" : value}
        </div>
        <p className="mt-1.5 text-[10px] font-medium tracking-wide text-text-secondary uppercase">
          {label}
        </p>
      </div>
      {profileHref ? (
        <a
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={profileAriaLabel}
          className={`${wellClass} cursor-pointer transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40 focus-visible:outline-none`}
        >
          {icon}
        </a>
      ) : (
        <span className={`${wellClass} opacity-70`}>{icon}</span>
      )}
    </div>
  );
}

function RecruitHometownField() {
  const session = usePersonFieldSession();
  const [editing, setEditing] = useState(false);
  const hometown = getHometown(session.person) ?? "";

  return (
    <InlineEditCell
      label="Hometown"
      value={hometown}
      displayValue={hometown}
      align="left"
      editOn="click"
      emphasis="workspace"
      density="compact"
      editing={editing}
      onRequestEdit={() => setEditing(true)}
      onCancel={() => setEditing(false)}
      onCommit={async (raw, reason) => {
        const parsed = parseHometown(raw);
        await session.commitPatch({ city: parsed.city, state: parsed.state }, reason);
        setEditing(false);
      }}
    />
  );
}

export function RecruitWorkspaceProfile({
  person,
  statusLabel,
  statusTone,
  metrics,
}: {
  person: Person;
  statusLabel: string;
  statusTone: "active" | "alumni";
  metrics: {
    utr: string;
    wtn: string;
    trnRank: string;
    pipeline: string;
    priority: string;
  };
}) {
  const fullName = getFullDisplayName(person);
  const displayName = getDisplayName(person);
  const preferred =
    person.preferredName?.trim() &&
    person.preferredName.trim() !== person.firstName.trim()
      ? person.preferredName.trim()
      : undefined;

  return (
    <section
      className="rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] max-md:min-w-0 max-md:overflow-x-hidden max-md:px-4"
      aria-label="Person header"
    >
      <div className="flex flex-col gap-4">
        {/*
          LOCKED OS UI CONTRACT — do not modify for feature-specific work.
          Recruit summary split, Academic Interests, and Schools of Interest
          are owned by RecruitSummaryLockedSlots + layout-lock.css.
          See docs/UI-GUARDRAILS.md.
        */}
        <div data-recruit-summary-split="" className="w-full min-w-0">
          <div
            data-recruit-summary-identity=""
            className="flex items-start gap-3.5"
          >
            <PlayerAvatar
              photoUrl={person.photoUrl}
              initials={getInitials(person)}
              size={64}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className={`${typeRole.personNameHero} break-words md:break-normal`}>
                {fullName}
              </h1>
              {preferred ? (
                <p className={typeClass("identityMeta")}>Preferred: {preferred}</p>
              ) : null}
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <PersonStatusLabel tone={statusTone} label={statusLabel} />
                <span className="text-sm font-medium text-text-primary">
                  {getPersonRoleDisplay(person)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <SummaryField label="Class">
                  <RecruitProfileField
                    field="recruitClassYear"
                    label="Class"
                    type="number"
                    align="left"
                    slot="summary"
                  />
                </SummaryField>
                <SummaryField label="Hometown">
                  <RecruitHometownField />
                </SummaryField>
              </div>
            </div>
          </div>

          <RecruitSummaryAcademicColumn />
        </div>

        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Recruit snapshot"
        >
          <MetricTile
            label="UTR"
            value={metrics.utr}
            icon={Gauge}
            tone="crimson"
            profileHref={rankingProfileHref(person.utrUrl)}
            profileAriaLabel={`Open ${displayName}'s UTR profile`}
          />
          <MetricTile
            label="WTN"
            value={metrics.wtn}
            icon={Activity}
            tone="info"
            profileHref={rankingProfileHref(person.wtnUrl)}
            profileAriaLabel={`Open ${displayName}'s WTN profile`}
          />
          <MetricTile
            label="TRN Rank"
            value={metrics.trnRank}
            icon={ListOrdered}
            tone="success"
            profileHref={rankingProfileHref(person.trnUrl)}
            profileAriaLabel={`Open ${displayName}'s TennisRecruiting.net profile`}
          />
          <RecruitSummaryStarRatingMetricTile />
          <MetricTile label="Pipeline" value={metrics.pipeline} icon={GitBranch} tone="info" />
          <MetricTile label="Priority" value={metrics.priority} icon={Star} tone="research" />
        </div>
      </div>
    </section>
  );
}

export function RecruitWorkspaceNav({
  items,
  activeId,
  onSelect,
}: {
  items: RecruitWorkspaceNavItem[];
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
                active
                  ? tone.active
                  : "border-transparent hover:bg-app-background"
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

export function WorkspaceEditHint() {
  return (
    <button
      type="button"
      onClick={() => {
        const root = document.querySelector('[aria-label="Adaptive workspace"]');
        const cell = root?.querySelector<HTMLElement>('[title^="Click to edit"]');
        cell?.focus();
        cell?.click();
      }}
      className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-black/[0.06] transition-colors hover:bg-app-background hover:text-text-primary"
    >
      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      Edit
    </button>
  );
}
