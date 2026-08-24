"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
  Activity,
  ArrowUpRight,
  Flag,
  Gauge,
  Globe,
  GraduationCap,
  Link2,
  ListOrdered,
  MapPin,
  Medal,
  MessageSquare,
  NotebookPen,
  Plane,
  Scale,
  ScrollText,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
  WorkspaceFieldGrid,
  WorkspaceMutedNote,
  WorkspaceReadOnlyValue,
  WorkspaceStack,
  WorkspaceStatusStrip,
  WorkspaceStatusStripItem,
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
import { EMPTY_VALUE, formatUtr, formatWtn } from "@/lib/formatting";
import InteractionList from "@/features/interactions/components/InteractionList";
import InteractionSummaryCards from "@/features/interactions/components/InteractionSummaryCards";
import type { RecruitInteraction } from "@/features/interactions/types";

import type { RecruitAnalyticsResult } from "../analytics/types";
import type { RecruitNoteQuickEntryRequest } from "../noteQuickEntry";
import { rankingProfileHref } from "../rankingProfileUrl";
import type { RecruitProfile } from "../types";
import { visitDayCount, visitRangeInvalid } from "../visitDays";
import { BlueChipRatingIcon, RecruitStarRatingDisplay } from "./RecruitRatingDisplay";
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
    <div className="rounded-control bg-[var(--module-tint)]/70 px-3 py-1.5">
      <div ref={displayRef} className="min-w-0">
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
          className="mt-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

const rankingsTileTone = {
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
  success: {
    card: "border-success/15 bg-success/[0.06]",
    icon: "bg-success/10 text-success",
    value: "text-success",
  },
  warning: {
    card: "border-warning/20 bg-warning/[0.09]",
    icon: "bg-warning/15 text-warning",
    value: "text-warning",
  },
  muted: {
    card: "border-border/70 bg-app-background/60",
    icon: "bg-black/[0.04] text-text-secondary",
    value: "text-text-primary",
  },
} as const;

type RankingsTileTone = keyof typeof rankingsTileTone;

const rankingsInlineInputClass =
  "w-full min-w-0 rounded-control border border-[var(--module-accent)] bg-surface px-2 py-1.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]";

function RankingsSummaryTile({
  label,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone: RankingsTileTone;
  children: ReactNode;
}) {
  const styles = rankingsTileTone[tone];
  return (
    <div
      className={`flex min-h-[84px] min-w-0 items-center justify-between gap-3 rounded-control border px-3 py-2.5 ${styles.card}`}
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

function RankingsTileField({
  field,
  label,
  displayValue,
  tone,
  icon,
  step,
  renderValue,
}: {
  field: "utr" | "wtn" | "trnRank" | "trnStarRating";
  label: string;
  displayValue: string;
  tone: RankingsTileTone;
  icon: LucideIcon;
  step?: number;
  renderValue?: ReactNode;
}) {
  const session = usePersonFieldSession();
  const def = getPersonField(field);
  if (!def) return null;

  const raw = session.person[field];
  return (
    <RankingsSummaryTile label={label} icon={icon} tone={tone}>
      <InlineEditCell
        label={def.label}
        type={toInlineFieldType(def)}
        options={toInlineOptions(def)}
        step={step}
        value={toEditString(raw)}
        displayValue={displayValue}
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
        className="!mx-0 !px-0"
        renderDisplay={
          renderValue ?? (
            <span
              className={`block truncate text-[24px] leading-none font-semibold tabular-nums ${
                displayValue === EMPTY_VALUE ? typeRole.metadataEmpty : rankingsTileTone[tone].value
              }`}
            >
              {displayValue}
            </span>
          )
        }
      />
    </RankingsSummaryTile>
  );
}

function StarRatingValue({ rating }: { rating: Person["trnStarRating"] | undefined }) {
  return (
    <div className="flex min-h-[24px] items-center">
      <RecruitStarRatingDisplay
        rating={rating}
        size="md"
        showBlueChipLabel
        emptyLabel={EMPTY_VALUE}
      />
    </div>
  );
}

function RankingsStarTile() {
  const session = usePersonFieldSession();
  const [open, setOpen] = useState(false);

  return (
    <RankingsSummaryTile label="Star Rating" icon={Star} tone="warning">
      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            session.startEdit("trnStarRating");
            setOpen((value) => !value);
          }}
          className="-mx-1 rounded-control px-1 py-0.5 text-left"
        >
          <StarRatingValue rating={session.person.trnStarRating} />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-10 mt-2 w-44 rounded-control border border-border bg-surface p-1.5 shadow-lg">
            <button
              type="button"
              onClick={async () => {
                await session.commit("trnStarRating", "", "select");
                setOpen(false);
              }}
              className="flex w-full items-center rounded-control px-2 py-1.5 text-left text-sm text-text-primary hover:bg-app-background"
            >
              No Rating
            </button>
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={async () => {
                  await session.commit("trnStarRating", String(value), "select");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1 rounded-control px-2 py-1.5 hover:bg-app-background"
              >
                <RecruitStarRatingDisplay rating={value} size="sm" emptyLabel={null} />
              </button>
            ))}
            <button
              type="button"
              onClick={async () => {
                await session.commit("trnStarRating", "6", "select");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 hover:bg-app-background"
            >
              <BlueChipRatingIcon size="sm" />
              <span className="text-sm font-medium text-text-primary">Blue Chip</span>
            </button>
            <button
              type="button"
              onClick={() => {
                session.cancelEdit();
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center justify-end text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </RankingsSummaryTile>
  );
}

function RankingsSummaryCards() {
  const session = usePersonFieldSession();
  const trnRankDisplay =
    session.person.trnRank !== undefined ? `#${session.person.trnRank}` : EMPTY_VALUE;

  return (
    <div className="mt-[5px] grid grid-cols-2 gap-3 lg:grid-cols-4">
      <RankingsTileField
        field="utr"
        label="UTR"
        displayValue={formatUtr(session.person.utr)}
        tone="crimson"
        icon={Gauge}
        step={0.01}
      />
      <RankingsTileField
        field="wtn"
        label="WTN"
        displayValue={formatWtn(session.person.wtn)}
        tone="info"
        icon={Globe}
        step={0.01}
      />
      <RankingsTileField
        field="trnRank"
        label="TRN Rank"
        displayValue={trnRankDisplay}
        tone="success"
        icon={ListOrdered}
        step={1}
      />
      <RankingsStarTile />
    </div>
  );
}

function RankingsLinkRow({
  title,
  sourceLabel,
  indicator,
  action,
  children,
}: {
  title: string;
  sourceLabel: string;
  indicator: ReactNode;
  action: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-2.5 sm:items-center">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-text-secondary">
        {indicator}
      </span>
      <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{sourceLabel}</p>
        {children}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function RankingsExternalLinkRow({
  field,
  title,
  sourceLabel,
  indicatorIcon: IndicatorIcon,
}: {
  field: "utrUrl" | "wtnUrl" | "trnUrl";
  title: string;
  sourceLabel: string;
  indicatorIcon: LucideIcon;
}) {
  const session = usePersonFieldSession();
  const [draft, setDraft] = useState("");
  const def = getPersonField(field);
  if (!def) return null;

  const raw = session.person[field];
  const href = rankingProfileHref(typeof raw === "string" ? raw : undefined) ?? "";
  const editing = session.isEditing(field);
  const displayUrl = href
    ? (() => {
        try {
          const parsed = new URL(href);
          return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
        } catch {
          return href;
        }
      })()
    : "No profile URL";

  return (
    <RankingsLinkRow
      title={title}
      sourceLabel={sourceLabel}
      indicator={<IndicatorIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
      action={
        editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await session.commit(field, draft, "enter");
              }}
              className="rounded-control border border-border/70 bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-app-background"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => session.cancelEdit()}
              className="rounded-control px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-control border border-border/70 bg-surface px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-app-background"
          >
            Open Profile
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              session.startEdit(field);
            }}
            className="rounded-control px-2 py-1 text-xs font-medium text-[var(--module-accent)] hover:bg-[var(--module-tint)]"
          >
            + Add URL
          </button>
        )
      }
    >
      {editing ? (
        <div className="mt-1.5 flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={def.label}
            className={rankingsInlineInputClass}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(href);
            session.startEdit(field);
          }}
          className={`mt-0.5 max-w-full truncate text-left text-xs ${
            href ? "text-text-secondary hover:text-text-primary" : typeRole.metadataEmpty
          }`}
        >
          {displayUrl}
        </button>
      )}
    </RankingsLinkRow>
  );
}

function RankingsWTNLinkRow() {
  return (
    <RankingsExternalLinkRow
      field="wtnUrl"
      title="WTN Profile"
      sourceLabel="worldtennisnumber.com"
      indicatorIcon={Globe}
    />
  );
}

function RankingsMatchesRow() {
  const session = usePersonFieldSession();
  const def = getPersonField("utrMatchesPlayed");
  if (!def) return null;

  const value = session.person.utrMatchesPlayed;
  const displayValue = value === undefined ? EMPTY_VALUE : String(value);

  return (
    <RankingsLinkRow
      title="Matches Played"
      sourceLabel="UTR match volume"
      indicator={<Activity className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
      action={
        <InlineEditCell
          label={def.label}
          type={toInlineFieldType(def)}
          options={toInlineOptions(def)}
          value={toEditString(value)}
          displayValue={displayValue}
          align="right"
          editOn="click"
          emphasis="workspace"
          density="compact"
          editing={session.isEditing("utrMatchesPlayed")}
          disabled={!isFieldEditable(def)}
          error={session.errorFor("utrMatchesPlayed")}
          onRequestEdit={() => session.startEdit("utrMatchesPlayed")}
          onCancel={session.cancelEdit}
          onCommit={(nextRaw, reason) => session.commit("utrMatchesPlayed", nextRaw, reason)}
          className="!mx-0 !px-0"
          renderDisplay={
            <span
              className={`text-lg font-semibold tabular-nums ${
                displayValue === EMPTY_VALUE ? typeRole.metadataEmpty : "text-text-primary"
              }`}
            >
              {displayValue}
            </span>
          }
        />
      }
    >
      <p className="mt-0.5 text-xs text-text-secondary">Stored on the UTR matches-played field.</p>
    </RankingsLinkRow>
  );
}

export function RecruitingPersonalInfoWorkspace() {
  return (
    <div className="min-w-0 space-y-[14px]">
      <section aria-label="Identity">
        <WorkspaceAccentHeading icon={UserRound} tone="module">
          Identity
        </WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={3} className="mt-[5px]">
          <WorkspaceField label="First name">
            <RecruitPersonField field="firstName" />
          </WorkspaceField>
          <WorkspaceField label="Last name">
            <RecruitPersonField field="lastName" />
          </WorkspaceField>
          <WorkspaceField label="Preferred name">
            <RecruitPersonField field="preferredName" />
          </WorkspaceField>
        </WorkspaceFieldGrid>
      </section>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Recruiting status">
          <WorkspaceAccentHeading icon={Flag} tone="module">
            Recruiting status
          </WorkspaceAccentHeading>
          <WorkspaceStatusStrip>
            <WorkspaceStatusStripItem label="Class year">
              <RecruitClassYearBadgeField />
            </WorkspaceStatusStripItem>
            <WorkspaceStatusStripItem label="Pipeline">
              <RecruitLookupBadgeField
                field="pipelineStageId"
                label="Pipeline"
                tone={pipelineTone}
              />
            </WorkspaceStatusStripItem>
            <WorkspaceStatusStripItem label="Priority">
              <RecruitLookupBadgeField
                field="priorityId"
                label="Priority"
                tone={priorityTone}
              />
            </WorkspaceStatusStripItem>
            <WorkspaceStatusStripItem label="Interest">
              <RecruitLookupBadgeField
                field="interestId"
                label="Interest"
                tone={interestTone}
              />
            </WorkspaceStatusStripItem>
            <WorkspaceStatusStripItem label="Getability">
              <RecruitLookupBadgeField
                field="getabilityId"
                label="Getability"
                tone={getabilityTone}
              />
            </WorkspaceStatusStripItem>
            <WorkspaceStatusStripItem label="Outcome">
              <RecruitLookupBadgeField
                field="outcomeId"
                label="Outcome"
                tone={outcomeTone}
              />
            </WorkspaceStatusStripItem>
          </WorkspaceStatusStrip>
        </section>
      </div>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Contact & location">
          <WorkspaceAccentHeading icon={MapPin} tone="neutral">
            Contact & location
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className="mt-[5px]">
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
          </WorkspaceFieldGrid>
        </section>
      </div>

      <div className="border-t border-border/50 pt-4">
        <section aria-label="Coach notes">
          <WorkspaceAccentHeading icon={NotebookPen} tone="knowledge">
            Coach notes
          </WorkspaceAccentHeading>
          <div className="mt-1.5 min-w-0">
            <CoachNotesCallout />
          </div>
        </section>
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

export function RecruitingAcademicsWorkspace() {
  return (
    <div className="min-w-0 space-y-[14px]">
      <section aria-label="Academic Profile">
        <WorkspaceAccentHeading icon={GraduationCap} tone="success">
          Academic Profile
        </WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={4} className="mt-[5px]">
          <WorkspaceField label="High School">
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
        </WorkspaceFieldGrid>
      </section>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Admissions / Pre-Read">
          <WorkspaceAccentHeading icon={Scale} tone="success">
            Admissions / Pre-Read
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className="mt-[5px]">
            <WorkspaceField label="Pre Read">
              <RecruitPrereadBadgeField />
            </WorkspaceField>
            <WorkspaceField label="Pre Read $">
              <RecruitProfileField
                field="prereadScholarshipAmount"
                label="Pre Read $"
                type="number"
                align="left"
              />
            </WorkspaceField>
            <WorkspaceField label="School Chosen">
              <RecruitProfileField
                field="schoolChosen"
                label="School Chosen"
                type="text"
                align="left"
              />
            </WorkspaceField>
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function RecruitingRankingsWorkspace({
  coachRank,
}: {
  coachRank: number | undefined;
}) {
  return (
    <div className="min-w-0 space-y-[14px]">
      <section aria-label="Ranking summary">
        <WorkspaceAccentHeading icon={ListOrdered} tone="warning">
          Ranking summary
        </WorkspaceAccentHeading>
        <RankingsSummaryCards />
      </section>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Profiles & Links">
          <WorkspaceAccentHeading icon={Link2} tone="warning">
            Profiles & Links
          </WorkspaceAccentHeading>
          <div className="mt-[5px] min-w-0 divide-y divide-border/50">
            <RankingsExternalLinkRow
              field="utrUrl"
              title="UTR Profile"
              sourceLabel="utrsports.net"
              indicatorIcon={Gauge}
            />
            <RankingsWTNLinkRow />
            <RankingsExternalLinkRow
              field="trnUrl"
              title="TennisRecruiting.net Profile"
              sourceLabel="tennisrecruiting.net"
              indicatorIcon={Link2}
            />
          </div>
        </section>
      </div>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Activity">
          <WorkspaceAccentHeading icon={Activity} tone="warning">
            Activity
          </WorkspaceAccentHeading>
          <div className="mt-[5px] min-w-0">
            <RankingsMatchesRow />
          </div>
        </section>
      </div>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Coach evaluation">
          <WorkspaceAccentHeading icon={Medal} tone="warning">
            Coach evaluation
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={2} className="mt-[5px]">
            <WorkspaceField label="Coach Rank">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <Medal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <WorkspaceReadOnlyValue
                  value={coachRank !== undefined ? `#${coachRank}` : ""}
                />
              </div>
            </WorkspaceField>
            <WorkspaceField label="Getability">
              <RecruitProfileField field="getabilityId" label="Getability" align="left" />
            </WorkspaceField>
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function RecruitingAnalyticsWorkspace({
  analytics,
  inCurrentCohort,
}: {
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
}) {
  const session = usePersonFieldSession();

  if (!inCurrentCohort || !analytics) {
    return (
      <div className="min-w-0 space-y-[14px]">
        <section aria-label="Analytics">
          <WorkspaceAccentHeading icon={Gauge} tone="info">
            Analytics
          </WorkspaceAccentHeading>
          <div className="mt-[5px]">
            <WorkspaceMutedNote>
              This Person has a historical Recruit Profile. Current recruiting analytics only score
              People with role Recruit. The profile is preserved and is not part of the live WTN
              pool.
            </WorkspaceMutedNote>
          </div>
        </section>
      </div>
    );
  }

  const metricsColumnOne: { label: string; value: string }[] = [
    { label: "UTR Z", value: formatMaybe(analytics.utrZ) },
    { label: "WTN Z", value: formatMaybe(analytics.wtnZ) },
    { label: "TRN Z", value: formatMaybe(analytics.trZ) },
    { label: "Composite Z", value: formatMaybe(analytics.compositeZ) },
  ];
  const metricsColumnTwo: { label: string; value: string }[] = [
    {
      label: "Matches Played",
      value:
        session.person.utrMatchesPlayed !== undefined
          ? String(session.person.utrMatchesPlayed)
          : EMPTY_VALUE,
    },
    { label: "Weighted Score", value: formatAnalyticsScore(analytics.weightedScore) },
    { label: "Reliability", value: formatAnalyticsReliability(analytics.reliability) },
    { label: "Reliability Score", value: formatAnalyticsScore(analytics.reliabilityScore) },
  ];
  const metricsColumnThree: { label: string; value: string }[] = [
    { label: "Adjusted TR Rank", value: formatAnalyticsScore(analytics.adjustedTrRank) },
  ];

  return (
    <div className="min-w-0 space-y-[14px]">
      <section aria-label="Ranking summary">
        <WorkspaceAccentHeading icon={ListOrdered} tone="warning">
          Ranking summary
        </WorkspaceAccentHeading>
        <RankingsSummaryCards />
      </section>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Metrics">
          <WorkspaceAccentHeading icon={Gauge} tone="info">
            Metrics
          </WorkspaceAccentHeading>
          <div className="mt-[5px] grid min-w-0 gap-3 lg:grid-cols-4">
            <div className="min-w-0 rounded-control border border-[var(--module-accent)]/12 bg-[var(--module-tint)]/30 px-3 py-2.5">
              <div className="flex flex-col gap-2.5">
                {metricsColumnOne.map((metric) => (
                  <div key={metric.label} className="flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-text-secondary">{metric.label}</p>
                    <p
                      className={`shrink-0 text-base leading-none font-semibold tabular-nums ${
                        metric.value === EMPTY_VALUE ? typeRole.metadataEmpty : "text-text-primary"
                      }`}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-control border border-info/12 bg-info/[0.04] px-3 py-2.5">
              <div className="flex flex-col gap-2.5">
                {metricsColumnTwo.map((metric) => (
                  <div key={metric.label} className="flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-text-secondary">{metric.label}</p>
                    <p
                      className={`shrink-0 text-base leading-none font-semibold tabular-nums ${
                        metric.value === EMPTY_VALUE ? typeRole.metadataEmpty : "text-text-primary"
                      }`}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-control border border-success/12 bg-success/[0.04] px-3 py-2.5">
              <div className="flex flex-col gap-2.5">
                {metricsColumnThree.map((metric) => (
                  <div key={metric.label} className="flex min-w-0 items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-text-secondary">{metric.label}</p>
                    <p
                      className={`shrink-0 text-base leading-none font-semibold tabular-nums ${
                        metric.value === EMPTY_VALUE ? typeRole.metadataEmpty : "text-text-primary"
                      }`}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-control border border-research/12 bg-research/[0.04] px-3 py-2.5" />
          </div>
        </section>
      </div>
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
  field,
  icon: Icon,
  quickEntryRequest,
  onQuickEntryHandled,
}: {
  title: string;
  field: "notes" | "gameNotes" | "keyPitchAngle";
  icon: LucideIcon;
  quickEntryRequest?: RecruitNoteQuickEntryRequest | null;
  onQuickEntryHandled?: () => void;
}) {
  const session = useRecruitProfileFieldSession();
  const value = session.profile[field] ?? "";
  const empty = !value.trim();
  const sectionRef = useRef<HTMLElement | null>(null);
  const { startEdit } = session;
  const quickEntryActive = quickEntryRequest?.field === field;
  const requestId = quickEntryRequest?.requestId;

  useEffect(() => {
    if (!quickEntryActive || requestId === undefined) return;

    startEdit(field);

    const section = sectionRef.current;
    // Wait for Adaptive Workspace enter animation + InlineEditInput mount.
    const timer = window.setTimeout(() => {
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
      onQuickEntryHandled?.();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [field, onQuickEntryHandled, quickEntryActive, requestId, startEdit]);

  return (
    <section
      ref={sectionRef}
      aria-label={title}
      className="min-w-0 scroll-mt-28"
      data-note-field={field}
    >
      <WorkspaceAccentHeading icon={Icon} tone="knowledge">
        {title}
      </WorkspaceAccentHeading>
      <div className="mt-[5px] min-w-0">
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
      </div>
    </section>
  );
}

function VisitDayCountField() {
  const session = useRecruitProfileFieldSession();
  if (visitRangeInvalid(session.profile.visitStartDate, session.profile.visitEndDate)) {
    return <WorkspaceReadOnlyValue value="" />;
  }
  const days = visitDayCount(session.profile.visitStartDate, session.profile.visitEndDate);
  return <WorkspaceReadOnlyValue value={days === null ? "" : String(days)} />;
}

export function RecruitingVisitWorkspace() {
  return (
    <div className="min-w-0 space-y-[14px]">
      <section aria-label="Visit details">
        <WorkspaceAccentHeading icon={Plane} tone="warning">
          Visit details
        </WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={3} className="mt-[5px]">
          <WorkspaceField label="Visit Start Date">
            <RecruitProfileField field="visitStartDate" label="Visit Start Date" type="date" align="left" />
          </WorkspaceField>
          <WorkspaceField label="Visit End Date">
            <RecruitProfileField field="visitEndDate" label="Visit End Date" type="date" align="left" />
          </WorkspaceField>
          <WorkspaceField label="Number of Days">
            <VisitDayCountField />
          </WorkspaceField>
        </WorkspaceFieldGrid>
      </section>

      <div className="border-t border-border/50 pt-[14px]">
        <section aria-label="Travel">
          <WorkspaceAccentHeading icon={Plane} tone="warning">
            Travel
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className="mt-[5px]">
            <WorkspaceField label="Travel Type">
              <RecruitProfileField field="travelType" label="Travel Type" type="select" align="left" />
            </WorkspaceField>
            <WorkspaceField label="Flight Info" span>
              <RecruitProfileField field="flightInfo" label="Flight Info" type="text" align="left" />
            </WorkspaceField>
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function RecruitingNotesWorkspace({
  quickEntryRequest = null,
  onQuickEntryHandled,
}: {
  quickEntryRequest?: RecruitNoteQuickEntryRequest | null;
  onQuickEntryHandled?: () => void;
} = {}) {
  return (
    <WorkspaceStack>
      <NotesSection
        title="Coach notes"
        field="notes"
        icon={NotebookPen}
        quickEntryRequest={quickEntryRequest}
        onQuickEntryHandled={onQuickEntryHandled}
      />
      <NotesSection
        title="Game notes"
        field="gameNotes"
        icon={ScrollText}
        quickEntryRequest={quickEntryRequest}
        onQuickEntryHandled={onQuickEntryHandled}
      />
      <NotesSection title="Key pitch angle" field="keyPitchAngle" icon={NotebookPen} />
    </WorkspaceStack>
  );
}

export function RecruitingCommunicationsWorkspace({
  interactions,
  onOpen,
  onDelete,
}: {
  interactions: RecruitInteraction[];
  onOpen?: (interaction: RecruitInteraction) => void;
  onDelete?: (interaction: RecruitInteraction) => void;
}) {
  return (
    <div className="min-w-0 space-y-[14px]">
      <InteractionSummaryCards interactions={interactions} />
      <section aria-label="Interactions">
        <WorkspaceAccentHeading icon={MessageSquare} tone="module">
          Interactions
        </WorkspaceAccentHeading>
        <div className="mt-3"><InteractionList interactions={interactions} showRecruit={false} onOpen={onOpen} onDelete={onDelete} /></div>
      </section>
    </div>
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
  "wtnUrl",
  "utrMatchesPlayed",
] as const;

function formatMaybe(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return String(value);
}

function formatAnalyticsScore(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return value.toFixed(2);
}

function formatAnalyticsReliability(value: number | undefined): string {
  if (value === undefined) return EMPTY_VALUE;
  return `${Math.round(value * 100)}%`;
}
