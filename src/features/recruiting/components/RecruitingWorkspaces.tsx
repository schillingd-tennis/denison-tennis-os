"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { ClipboardList, GraduationCap, Megaphone, NotebookPen, type LucideIcon } from "lucide-react";

import {
  WorkspaceField,
  WorkspaceFieldGrid,
  WorkspaceFieldGroup,
  WorkspaceMutedNote,
  WorkspaceReadOnlyValue,
  WorkspaceSection,
  WorkspaceSplit,
  WorkspaceStack,
} from "@/components/adaptive-workspace";
import { InlineEditCell } from "@/components/inline-edit";
import { typeRole } from "@/components/typography";
import {
  FieldRenderer,
  PersonFieldSession,
  isFieldEditable,
  toEditString,
  toInlineFieldType,
  toInlineOptions,
  usePersonFieldSession,
} from "@/features/field-engine";
import { getPersonField } from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { getHometown, parseHometown } from "@/features/people/utils";
import { EMPTY_VALUE } from "@/lib/formatting";

import type { RecruitAnalyticsResult } from "../analytics/types";
import type { RecruitProfile } from "../types";
import RecruitStatusBadge from "./RecruitStatusBadge";
import {
  RecruitProfileField,
  RecruitProfileFieldSession,
  useRecruitProfileFieldSession,
} from "./RecruitProfileFields";
import {
  getabilityTone,
  interestTone,
  outcomeTone,
  pipelineTone,
  prereadTone,
  priorityTone,
  type RecruitStatusTone,
} from "./statusPresentation";

function RecruitPersonField({ field }: { field: keyof Person }) {
  return (
    <FieldRenderer
      field={field}
      editOn="click"
      align="left"
      emphasis="workspace"
      density="compact"
    />
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

function RecruitLookupBadgeField({
  field,
  label,
  tone,
}: {
  field: "pipelineStageId" | "priorityId" | "interestId" | "getabilityId" | "outcomeId";
  label: string;
  tone: (key: string | undefined) => RecruitStatusTone;
}) {
  const session = useRecruitProfileFieldSession();
  const ref =
    field === "pipelineStageId"
      ? session.profile.pipelineStage
      : field === "priorityId"
        ? session.profile.priority
        : field === "interestId"
          ? session.profile.interest
          : field === "getabilityId"
            ? session.profile.getability
            : session.profile.outcome;

  return (
    <RecruitProfileField
      field={field}
      label={label}
      align="left"
      className="!mx-0 !px-0"
      renderDisplay={
        <span title={ref?.label} className="inline-flex max-w-full">
          <RecruitStatusBadge label={ref?.label} tone={tone(ref?.key)} />
        </span>
      }
    />
  );
}

function RecruitClassYearBadgeField() {
  const session = useRecruitProfileFieldSession();
  const year = session.profile.recruitClassYear;

  return (
    <RecruitProfileField
      field="recruitClassYear"
      label="Class year"
      type="number"
      align="left"
      className="!mx-0 !px-0"
      renderDisplay={
        <span title={year !== undefined ? String(year) : undefined} className="inline-flex max-w-full">
          <RecruitStatusBadge
            label={year !== undefined ? String(year) : undefined}
            tone="muted"
          />
        </span>
      }
    />
  );
}

function StatusStripItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-max max-w-full shrink-0 flex-col items-start">
      <p className={`${typeRole.workspaceFieldLabel} whitespace-nowrap text-left`}>{label}</p>
      <div className="mt-0.5 text-left">{children}</div>
    </div>
  );
}

function CoachNotesCallout() {
  const session = useRecruitProfileFieldSession();
  const notes = session.profile.notes ?? "";
  const empty = !notes.trim();
  const editing = session.isEditing("notes");
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (editing || expanded) return;
    const span = displayRef.current?.querySelector("span");
    if (!span) {
      setOverflows(false);
      return;
    }
    setOverflows(span.scrollHeight > span.clientHeight + 1);
  }, [editing, expanded, notes]);

  return (
    <section
      aria-label="Coach notes"
      className="rounded-control border-l-[3px] border-[var(--module-accent)]/35 bg-[var(--module-tint)]/70 px-3.5 py-2.5"
    >
      <p className={typeRole.workspaceFieldLabel}>Coach notes</p>
      <div ref={displayRef} className="mt-1 min-w-0">
        <RecruitProfileField
          field="notes"
          label="Coach notes"
          type="textarea"
          align="left"
          rows={3}
          className="!mx-0 !px-0.5"
          renderDisplay={
            <span
              className={`text-[15px] leading-snug whitespace-pre-wrap ${
                empty ? typeRole.metadataEmpty : "font-normal text-text-primary"
              } ${!empty && !expanded ? "line-clamp-3" : ""}`}
            >
              {empty ? EMPTY_VALUE : notes}
            </span>
          }
        />
      </div>
      {!editing && overflows ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((open) => !open);
          }}
          className="mt-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}

function PersonSourceLinkField({
  field,
  linkLabel,
}: {
  field: "trnUrl" | "utrUrl";
  linkLabel: string;
}) {
  const session = usePersonFieldSession();
  const def = getPersonField(field);
  if (!def) return null;

  const raw = session.person[field];
  const href = typeof raw === "string" && raw.trim() ? raw.trim() : "";

  return (
    <InlineEditCell
      label={def.label}
      type={toInlineFieldType(def)}
      options={toInlineOptions(def)}
      value={toEditString(raw)}
      displayValue={href ? linkLabel : undefined}
      align="left"
      editOn="click"
      emphasis="workspace"
      density="compact"
      editing={session.isEditing(field)}
      disabled={!isFieldEditable(def)}
      error={session.errorFor(field)}
      onRequestEdit={() => session.startEdit(field)}
      onCancel={session.cancelEdit}
      onCommit={(nextRaw, reason) => session.commit(field, nextRaw, reason)}
      renderDisplay={
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className={`${typeRole.workspaceFieldValue} text-[var(--module-accent)] hover:underline`}
          >
            {linkLabel}
          </a>
        ) : undefined
      }
    />
  );
}

export function RecruitingPersonalInfoWorkspace() {
  return (
    <div className="space-y-5">
      <section aria-label="Recruiting status">
        <h3 className={typeRole.workspaceGroupTitle}>Recruiting status</h3>
        <div
          className="mt-2 w-full"
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            rowGap: 10,
          }}
        >
          <StatusStripItem label="Class year">
            <RecruitClassYearBadgeField />
          </StatusStripItem>
          <StatusStripItem label="Pipeline">
            <RecruitLookupBadgeField
              field="pipelineStageId"
              label="Pipeline"
              tone={pipelineTone}
            />
          </StatusStripItem>
          <StatusStripItem label="Priority">
            <RecruitLookupBadgeField
              field="priorityId"
              label="Priority"
              tone={priorityTone}
            />
          </StatusStripItem>
          <StatusStripItem label="Interest">
            <RecruitLookupBadgeField
              field="interestId"
              label="Interest"
              tone={interestTone}
            />
          </StatusStripItem>
          <StatusStripItem label="Getability">
            <RecruitLookupBadgeField
              field="getabilityId"
              label="Getability"
              tone={getabilityTone}
            />
          </StatusStripItem>
          <StatusStripItem label="Outcome">
            <RecruitLookupBadgeField
              field="outcomeId"
              label="Outcome"
              tone={outcomeTone}
            />
          </StatusStripItem>
        </div>
      </section>

      <div className="border-t border-border/50 pt-5">
        <WorkspaceFieldGroup title="Identity" columns={2}>
          <WorkspaceField label="First name">
            <RecruitPersonField field="firstName" />
          </WorkspaceField>
          <WorkspaceField label="Preferred name">
            <RecruitPersonField field="preferredName" />
          </WorkspaceField>
          <WorkspaceField label="Last name">
            <RecruitPersonField field="lastName" />
          </WorkspaceField>
          <WorkspaceField label="Recruit type">
            <RecruitProfileField field="recruitTypeId" label="Recruit type" align="left" />
          </WorkspaceField>
        </WorkspaceFieldGroup>
      </div>

      <div className="border-t border-border/50 pt-5">
        <WorkspaceFieldGroup title="Contact & location" columns={3}>
          <WorkspaceField label="Hometown">
            <RecruitHometownField />
          </WorkspaceField>
          <WorkspaceField label="City">
            <RecruitPersonField field="city" />
          </WorkspaceField>
          <WorkspaceField label="State">
            <RecruitPersonField field="state" />
          </WorkspaceField>
          <WorkspaceField label="Country">
            <RecruitPersonField field="country" />
          </WorkspaceField>
          <WorkspaceField label="Personal email">
            <RecruitPersonField field="personalEmail" />
          </WorkspaceField>
          <WorkspaceField label="Cell phone">
            <RecruitPersonField field="cellPhone" />
          </WorkspaceField>
        </WorkspaceFieldGroup>
      </div>

      <div className="border-t border-border/50 pt-5">
        <CoachNotesCallout />
      </div>
    </div>
  );
}

function RecruitPrereadBadgeField() {
  const session = useRecruitProfileFieldSession();
  const ref = session.profile.prereadStatus;

  return (
    <RecruitProfileField
      field="prereadStatusId"
      label="Preread"
      align="left"
      renderDisplay={<RecruitStatusBadge label={ref?.label} tone={prereadTone(ref?.key)} />}
    />
  );
}

const academicsSectionAccent = (
  <span className="inline-block h-3 w-0.5 shrink-0 rounded-full bg-success/70" aria-hidden />
);

export function RecruitingAcademicsWorkspace() {
  return (
    <WorkspaceStack>
      <WorkspaceFieldGroup
        title="Academic profile"
        columns={4}
        leading={
          <GraduationCap className="h-3.5 w-3.5 text-success" strokeWidth={1.75} aria-hidden />
        }
      >
        <WorkspaceField label="High school">
          <RecruitPersonField field="highSchool" />
        </WorkspaceField>
        <WorkspaceField label="Grades">
          <RecruitProfileField field="gpa" label="Grades" align="left" />
        </WorkspaceField>
        <WorkspaceField label="SAT">
          <RecruitProfileField field="sat" label="SAT" type="number" align="left" />
        </WorkspaceField>
        <WorkspaceField label="ACT">
          <RecruitProfileField field="act" label="ACT" type="number" align="left" />
        </WorkspaceField>
      </WorkspaceFieldGroup>

      <WorkspaceSection title="College interests" leading={academicsSectionAccent}>
        <WorkspaceSplit
          left={
            <WorkspaceField label="Academic interests">
              <RecruitProfileField
                field="academicInterests"
                label="Academic interests"
                type="textarea"
                align="left"
                rows={3}
                className="[&>span]:whitespace-pre-wrap [&>span]:break-normal"
              />
            </WorkspaceField>
          }
          right={
            <WorkspaceField label="Schools of interest">
              <RecruitProfileField
                field="schoolsOfInterest"
                label="Schools of interest"
                type="textarea"
                align="left"
                rows={3}
                className="[&>span]:whitespace-pre-wrap [&>span]:break-normal"
              />
            </WorkspaceField>
          }
        />
      </WorkspaceSection>

      <WorkspaceFieldGroup
        title="Admissions / Preread"
        columns={2}
        leading={academicsSectionAccent}
      >
        <WorkspaceField label="Preread">
          <RecruitPrereadBadgeField />
        </WorkspaceField>
        <WorkspaceField label="Preread $">
          <RecruitProfileField
            field="prereadScholarshipAmount"
            label="Preread $"
            type="number"
            align="left"
          />
        </WorkspaceField>
      </WorkspaceFieldGroup>
    </WorkspaceStack>
  );
}

export function RecruitingRankingsWorkspace({
  coachRank,
}: {
  coachRank: number | undefined;
}) {
  return (
    <WorkspaceFieldGrid columns={3}>
      <WorkspaceField label="UTR">
        <RecruitPersonField field="utr" />
      </WorkspaceField>
      <WorkspaceField label="WTN">
        <RecruitPersonField field="wtn" />
      </WorkspaceField>
      <WorkspaceField label="TRN rank">
        <RecruitPersonField field="trnRank" />
      </WorkspaceField>
      <WorkspaceField label="Coach rank">
        <WorkspaceReadOnlyValue value={coachRank !== undefined ? `#${coachRank}` : ""} />
      </WorkspaceField>
      <WorkspaceField label="Getability">
        <RecruitProfileField field="getabilityId" label="Getability" align="left" />
      </WorkspaceField>
      <WorkspaceField label="TR star rating">
        <RecruitPersonField field="trnStarRating" />
      </WorkspaceField>
      <WorkspaceField label="TRN URL">
        <PersonSourceLinkField field="trnUrl" linkLabel="Open TRN" />
      </WorkspaceField>
      <WorkspaceField label="UTR URL">
        <PersonSourceLinkField field="utrUrl" linkLabel="Open UTR" />
      </WorkspaceField>
      <WorkspaceField label="Matches played">
        <RecruitPersonField field="utrMatchesPlayed" />
      </WorkspaceField>
    </WorkspaceFieldGrid>
  );
}

export function RecruitingAnalyticsWorkspace({
  analytics,
  inCurrentCohort,
}: {
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
}) {
  if (!inCurrentCohort || !analytics) {
    return (
      <WorkspaceMutedNote>
        This Person has a historical Recruit Profile. Current recruiting analytics only score
        People with role Recruit. The profile is preserved and is not part of the live WTN pool.
      </WorkspaceMutedNote>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "Pool", value: analytics.inPool ? "Yes (WTN present)" : "No" },
    { label: "Tier", value: analytics.tier ?? EMPTY_VALUE },
    { label: "Composite rank", value: formatMaybe(analytics.compositeRank) },
    { label: "Composite z", value: formatMaybe(analytics.compositeZ) },
    { label: "Weighted score", value: formatMaybe(analytics.weightedScore) },
    { label: "Reliability", value: formatMaybe(analytics.reliability) },
    { label: "Reliability score", value: formatMaybe(analytics.reliabilityScore) },
    { label: "UTR rank", value: formatMaybe(analytics.utrRank) },
    { label: "TR rank", value: formatMaybe(analytics.trRank) },
    { label: "WTN rank", value: formatMaybe(analytics.wtnRank) },
    { label: "UTR z", value: formatMaybe(analytics.utrZ) },
    { label: "TR z", value: formatMaybe(analytics.trZ) },
    { label: "WTN z", value: formatMaybe(analytics.wtnZ) },
    { label: "Adjusted TR rank", value: formatMaybe(analytics.adjustedTrRank) },
  ];

  return (
    <div className="space-y-4">
      <WorkspaceMutedNote>
        Computed from current Recruit tennis facts against the current recruiting WTN pool (role
        Recruit + Recruit Profile). Not stored on Person or Recruit Profile.
      </WorkspaceMutedNote>
      <WorkspaceFieldGrid columns={3}>
        {rows.map((row) => (
          <WorkspaceField key={row.label} label={row.label}>
            <WorkspaceReadOnlyValue value={row.value} />
          </WorkspaceField>
        ))}
      </WorkspaceFieldGrid>
    </div>
  );
}

function NotesBlock({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-control border-l-[3px] border-knowledge/30 bg-knowledge/[0.045] px-3.5 py-2.5">
      {children}
    </div>
  );
}

function NotesSection({
  title,
  icon: Icon,
  field,
}: {
  title: string;
  icon: LucideIcon;
  field: "notes" | "gameNotes" | "keyPitchAngle";
}) {
  const session = useRecruitProfileFieldSession();
  const value = session.profile[field] ?? "";
  const empty = !value.trim();

  return (
    <WorkspaceSection
      title={title}
      leading={<Icon className="h-3.5 w-3.5 text-knowledge" strokeWidth={1.75} aria-hidden />}
    >
      <NotesBlock>
        <RecruitProfileField
          field={field}
          label={title}
          type="textarea"
          align="left"
          rows={5}
          className="!mx-0 !px-0.5"
          renderDisplay={
            <span
              className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                empty ? typeRole.metadataEmpty : "font-normal text-text-primary"
              }`}
            >
              {empty ? EMPTY_VALUE : value}
            </span>
          }
        />
      </NotesBlock>
    </WorkspaceSection>
  );
}

export function RecruitingNotesWorkspace() {
  return (
    <WorkspaceStack>
      <NotesSection title="Coach notes" icon={NotebookPen} field="notes" />
      <NotesSection title="Game notes" icon={ClipboardList} field="gameNotes" />
      <NotesSection title="Key pitch angle" icon={Megaphone} field="keyPitchAngle" />
    </WorkspaceStack>
  );
}

export function RecruitingCommunicationsWorkspace() {
  return (
    <WorkspaceMutedNote>
      No interaction history is available yet. Calls, texts, and follow-ups are not stored on
      this record.
    </WorkspaceMutedNote>
  );
}

export function RecruitWorkspaceFieldSessions({
  person,
  profile,
  onPersonChange,
  onProfileChange,
  runSave,
  children,
}: {
  person: Person;
  profile: RecruitProfile;
  onPersonChange: (person: Person) => void;
  onProfileChange: (profile: RecruitProfile) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  children: ReactNode;
}) {
  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={RECRUIT_PERSON_FIELDS}
    >
      <RecruitProfileFieldSession
        profile={profile}
        onProfileChange={onProfileChange}
        runSave={runSave}
      >
        {children}
      </RecruitProfileFieldSession>
    </PersonFieldSession>
  );
}

const RECRUIT_PERSON_FIELDS = [
  "firstName",
  "lastName",
  "preferredName",
  "city",
  "state",
  "country",
  "personalEmail",
  "cellPhone",
  "highSchool",
  "utr",
  "trnRank",
  "wtn",
  "trnStarRating",
  "trnUrl",
  "utrUrl",
  "utrMatchesPlayed",
] as const;

function formatMaybe(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return String(value);
}
