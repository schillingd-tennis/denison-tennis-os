"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, GraduationCap, Percent } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
} from "@/components/adaptive-workspace";
import { typeRole } from "@/components/typography";
import {
  FieldRenderer,
  PersonFieldSession,
  usePersonFieldSession,
} from "@/features/field-engine";
import {
  getPersonFieldKeysForWorkspace,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { EMPTY_VALUE, formatDisplay, formatGpa } from "@/lib/formatting";
import type { PlayerAcademicSummary } from "@/features/teamGrades/types";

/**
 * Player Academics adaptive workspace.
 * Summary-card chrome matches Recruiting → Rankings (UTR / WTN / TRN Rank).
 */

const ACADEMICS_FIELDS = getPersonFieldKeysForWorkspace("academics");

const summaryTileTone = {
  crimson: {
    card: "border-[var(--module-accent)]/15 bg-[var(--module-tint)]/70",
    icon: "bg-[var(--module-accent)]/10 text-[var(--module-accent)]",
    value: "text-[var(--module-accent)]",
  },
  info: {
    card: "border-info/15 bg-info/[0.06]",
    icon: "bg-info/10 text-info",
    value: "text-info",
  },
  warning: {
    card: "border-warning/20 bg-warning/[0.09]",
    icon: "bg-warning/15 text-warning",
    value: "text-warning",
  },
} as const;

type SummaryTileTone = keyof typeof summaryTileTone;

function AcademicSummaryTile({
  label,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone: SummaryTileTone;
  children: ReactNode;
}) {
  const styles = summaryTileTone[tone];
  return (
    <div
      className={`flex h-full min-h-[84px] min-w-0 items-center justify-between gap-3 rounded-control border px-3 py-2.5 ${styles.card}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">{label}</p>
        <div className="mt-2 min-w-0">{children}</div>
      </div>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    </div>
  );
}

function AcademicTextTile({
  field,
  label,
  tone,
  icon,
}: {
  field: "major" | "minor";
  label: string;
  tone: SummaryTileTone;
  icon: LucideIcon;
}) {
  const session = usePersonFieldSession();
  const raw = session.person[field];
  const displayValue = formatDisplay(typeof raw === "string" ? raw : undefined);
  const empty = displayValue === EMPTY_VALUE;

  return (
    <AcademicSummaryTile label={label} icon={icon} tone={tone}>
      <FieldRenderer
        field={field}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        className="min-w-0 !mx-0 !px-0"
        renderDisplay={
          <span
            className={`block min-w-0 text-[24px] leading-tight font-semibold break-words [overflow-wrap:anywhere] ${
              empty ? typeRole.metadataEmpty : summaryTileTone[tone].value
            }`}
            title={empty ? undefined : displayValue}
          >
            {displayValue}
          </span>
        }
      />
    </AcademicSummaryTile>
  );
}

function AcademicGpaTile({ academicSummary }: { academicSummary?: PlayerAcademicSummary }) {
  const session = usePersonFieldSession();
  const displayValue = formatGpa(academicSummary?.cumulativeGpa ?? session.person.gpa);
  const empty = displayValue === EMPTY_VALUE;
  const tone = "warning" as const;

  return (
    <AcademicSummaryTile label="Overall GPA" icon={Percent} tone={tone}>
      {academicSummary ? <span className={`block truncate text-[24px] leading-none font-semibold tabular-nums ${empty ? typeRole.metadataEmpty : summaryTileTone[tone].value}`}>{displayValue}</span> : <FieldRenderer
        field="gpa"
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        step={0.01}
        className="min-w-0 !mx-0 !px-0"
        renderDisplay={
          <span
            className={`block truncate text-[24px] leading-none font-semibold tabular-nums ${
              empty ? typeRole.metadataEmpty : summaryTileTone[tone].value
            }`}
          >
            {displayValue}
          </span>
        }
      />}
    </AcademicSummaryTile>
  );
}

export default function AcademicsWorkspace({
  person,
  onPersonChange,
  runSave,
  academicSummary,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  academicSummary?: PlayerAcademicSummary;
}) {
  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={ACADEMICS_FIELDS}
    >
      <div className="min-w-0 space-y-[14px]">
        <section aria-label="Academic Summary" className="min-w-0">
          <WorkspaceAccentHeading icon={GraduationCap} tone="success">
            Academic Summary
          </WorkspaceAccentHeading>
          <div className="mt-[5px] grid w-full min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
            <AcademicTextTile field="major" label="Major" tone="crimson" icon={GraduationCap} />
            <AcademicTextTile field="minor" label="Minor" tone="info" icon={BookOpen} />
            <AcademicGpaTile academicSummary={academicSummary} />
          </div>
        </section>

        <div className="border-t border-border/50 pt-[14px]">
          <section aria-label="GPA Performance">
            <WorkspaceAccentHeading icon={Percent} tone="success">
              GPA Performance
            </WorkspaceAccentHeading>
            {academicSummary ? <>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Last Semester", formatGpa(academicSummary.latestSemesterGpa), academicSummary.latestSemesterLabel],
                  ["Academic Year", formatGpa(academicSummary.academicYearGpa), academicSummary.academicYearLabel],
                  ["Cumulative", formatGpa(academicSummary.cumulativeGpa), "Career"],
                  ["Credit Hours", academicSummary.totalCreditHours.toFixed(1), "Career"],
                ].map(([label, value, caption]) => <div key={label} className="rounded-control border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white px-3 py-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{value}</p><p className="mt-1 text-[11px] text-text-secondary">{caption}</p></div>)}
              </div>
              <div className="mt-3 overflow-hidden rounded-control border border-border/70">
                <div className="grid grid-cols-[1.3fr_.65fr_.8fr_.8fr] bg-emerald-50/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-800"><span>Semester</span><span>Hours</span><span>Semester GPA</span><span>Cumulative</span></div>
                {academicSummary.history.slice().reverse().map((item) => <div key={item.termLabel} className="grid grid-cols-[1.3fr_.65fr_.8fr_.8fr] border-t border-border/50 px-3 py-2 text-sm"><span className="font-medium">{item.termLabel}</span><span className="tabular-nums text-text-secondary">{item.creditHours}</span><span className="font-semibold tabular-nums">{item.semesterGpa.toFixed(2)}</span><span className="tabular-nums text-text-secondary">{formatGpa(item.cumulativeGpa)}</span></div>)}
              </div>
            </> : <dl className="mt-[5px] grid grid-cols-1 gap-x-6 gap-y-[7px] sm:grid-cols-2">
              <WorkspaceField label="GPA Last Semester">
                <FieldRenderer
                  field="gpaLastSemester"
                  align="left"
                  editOn="click"
                  emphasis="workspace"
                  density="compact"
                  step={0.01}
                />
              </WorkspaceField>
              <WorkspaceField label="GPA Last Year">
                <FieldRenderer
                  field="gpaLastYear"
                  align="left"
                  editOn="click"
                  emphasis="workspace"
                  density="compact"
                  step={0.01}
                />
              </WorkspaceField>
            </dl>}
          </section>
        </div>
      </div>
    </PersonFieldSession>
  );
}
