"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

import type { SortDirection } from "@/components/data-table/types";
import ContactActionSlots from "@/components/ContactActionSlots";
import { InlineEditCell, phoneHrefDigits, type InlineCommitReason } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import {
  TEAM_DIRECTORY_EMPTY,
  TEAM_DIRECTORY_NAME,
  directoryCellValue,
} from "@/features/people/directoryHierarchy";
import { getDisplayName, getHometown, getInitials } from "@/features/people/utils";
import { formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "../directory";
import {
  INTEREST_SELECT_OPTIONS,
  OUTCOME_SELECT_OPTIONS,
  PIPELINE_SELECT_OPTIONS,
  PRIORITY_SELECT_OPTIONS,
} from "../directoryInline";
import type { RecruitingDirectoryEditableField } from "../directoryInline";
import RecruitStatusBadge from "./RecruitStatusBadge";
import {
  RECRUITING_TABLE,
  RECRUITING_TABLE_AVATAR_SIZE,
  RECRUITING_TABLE_COLUMNS,
} from "./recruitingTableChrome";
import { interestTone, outcomeTone, pipelineTone, priorityTone } from "./statusPresentation";

const BOARD = RECRUITING_TABLE;

/** Section heading row above table column headers (Ranked / Recruits / Unranked). */
export function RecruitingTableSectionBar({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className={BOARD.sectionBar}>
      <h3 className={BOARD.sectionLabel}>{title}</h3>
      <span className={BOARD.sectionCount}>{count}</span>
    </div>
  );
}

export function recruitingContactHrefs(row: RecruitDirectoryRow) {
  const digits = phoneHrefDigits(row.person.cellPhone);
  const email = row.person.personalEmail ?? row.person.denisonEmail;
  return {
    tel: digits ? `tel:${digits}` : undefined,
    sms: digits ? `sms:${digits}` : undefined,
    mailto: email ? `mailto:${email}` : undefined,
  };
}

export function recruitingMetricDisplay(value: string): string {
  return value === TEAM_DIRECTORY_EMPTY ? "—" : value;
}

export function classYearSelectOptions(years: readonly number[]): { value: string; label: string }[] {
  return years.map((year) => ({ value: String(year), label: String(year) }));
}

export function RecruitingTableColgroup({
  variant = "directory",
}: {
  variant?: "directory" | "commit";
}) {
  const C = RECRUITING_TABLE_COLUMNS;
  if (variant === "commit") {
    return (
      <colgroup>
        <col style={{ width: C.handle }} />
        <col style={{ width: C.rank }} />
        <col />
        <col style={{ width: C.classYear }} />
        <col style={{ width: C.pipeline }} />
        <col style={{ width: C.priority }} />
        <col style={{ width: C.outcome }} />
        <col style={{ width: C.schoolChosen }} />
        <col style={{ width: C.utr }} />
        <col style={{ width: C.trn }} />
        <col style={{ width: C.wtn }} />
        <col style={{ width: C.rankAction }} />
        <col style={{ width: C.contact }} />
      </colgroup>
    );
  }

  return (
    <colgroup>
      <col style={{ width: C.handle }} />
      <col style={{ width: C.rank }} />
      <col />
      <col style={{ width: C.classYear }} />
      <col style={{ width: C.pipeline }} />
      <col style={{ width: C.priority }} />
      <col style={{ width: C.interest }} />
      <col style={{ width: C.outcome }} />
      <col style={{ width: C.utr }} />
      <col style={{ width: C.trn }} />
      <col style={{ width: C.wtn }} />
      <col style={{ width: C.rankAction }} />
      <col style={{ width: C.contact }} />
    </colgroup>
  );
}

export function RecruitingHeaderLabel({
  label,
  align = "left",
  sortDirection,
  onSort,
}: {
  label: string;
  align?: "left" | "right" | "center";
  sortDirection?: SortDirection | null;
  onSort?: () => void;
}) {
  if (!onSort) {
    return (
      <th
        scope="col"
        className={`${BOARD.th} ${
          align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
        }`}
      >
        {label}
      </th>
    );
  }

  const Icon =
    sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ChevronsUpDown;
  const active = sortDirection != null;

  return (
    <th
      scope="col"
      aria-sort={
        sortDirection === "asc"
          ? "ascending"
          : sortDirection === "desc"
            ? "descending"
            : "none"
      }
      className={`${BOARD.th} ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex w-full items-center gap-1 whitespace-nowrap rounded-control transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-[var(--module-accent)] focus-visible:outline-none ${
          align === "right" ? "justify-end" : "justify-start"
        } ${active ? "text-text-primary" : "text-text-secondary"}`}
      >
        <span className="whitespace-nowrap">{label}</span>
        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <Icon
            className={`h-3 w-3 ${active ? "text-[var(--module-accent)]" : "text-text-secondary/50"}`}
            strokeWidth={2}
          />
        </span>
      </button>
    </th>
  );
}

/**
 * Recruit identity — Name + Hometown only (Class lives in its own column).
 * List may prepend a muted Coach Rank beside the name.
 */
export function RecruitingIdentityCell({
  row,
  listCoachRank = false,
}: {
  row: RecruitDirectoryRow;
  /** List mode: show muted #n before name when ranked. */
  listCoachRank?: boolean;
}) {
  const name = getDisplayName(row.person);
  const hometown = getHometown(row.person);
  const mutedRank =
    listCoachRank && row.profile.coachRank !== undefined ? row.profile.coachRank : null;

  return (
    <Link
      href={`/recruiting/${row.person.id}`}
      className="flex min-w-0 items-center gap-2.5 rounded-control outline-none hover:text-[var(--module-accent)] focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40"
      aria-label={`Open recruiting workspace for ${name}`}
    >
      <PlayerAvatar
        photoUrl={row.person.photoUrl}
        initials={getInitials(row.person)}
        size={RECRUITING_TABLE_AVATAR_SIZE}
      />
      <div className="min-w-0">
        <p className={`flex min-w-0 items-baseline gap-1.5 ${TEAM_DIRECTORY_NAME}`}>
          {mutedRank !== null ? <span className={BOARD.rankMuted}>#{mutedRank}</span> : null}
          <span className="min-w-0 truncate">{name}</span>
        </p>
        <p className={BOARD.hometown}>{hometown || TEAM_DIRECTORY_EMPTY}</p>
      </div>
    </Link>
  );
}

type EditApi = {
  isEditing: (personId: string, field: RecruitingDirectoryEditableField) => boolean;
  fieldError: string | undefined;
  startEdit: (personId: string, field: RecruitingDirectoryEditableField) => void;
  cancelEdit: () => void;
  commit: (
    personId: string,
    field: RecruitingDirectoryEditableField,
    raw: string,
    reason: InlineCommitReason,
  ) => void;
};

export function RecruitingClassCell({
  row,
  classOptions,
  edit,
}: {
  row: RecruitDirectoryRow;
  classOptions: { value: string; label: string }[];
  edit: EditApi;
}) {
  const personId = row.person.id;
  const year = row.profile.recruitClassYear;
  const options =
    year !== undefined && !classOptions.some((opt) => opt.value === String(year))
      ? [...classOptions, { value: String(year), label: String(year) }].sort(
          (a, b) => Number(a.value) - Number(b.value),
        )
      : classOptions;

  return (
    <InlineEditCell
      label="Class"
      type="select"
      options={options}
      value={year !== undefined ? String(year) : ""}
      editOn="click"
      editing={edit.isEditing(personId, "recruitClassYear")}
      error={edit.isEditing(personId, "recruitClassYear") ? edit.fieldError : undefined}
      renderDisplay={
        <span className={BOARD.classValue}>
          {year !== undefined ? String(year) : TEAM_DIRECTORY_EMPTY}
        </span>
      }
      onRequestEdit={() => edit.startEdit(personId, "recruitClassYear")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "recruitClassYear", raw, reason)}
    />
  );
}

export function RecruitingPipelineCell({ row, edit }: { row: RecruitDirectoryRow; edit: EditApi }) {
  const personId = row.person.id;
  return (
    <InlineEditCell
      label="Pipeline"
      type="select"
      options={PIPELINE_SELECT_OPTIONS}
      value={row.profile.pipelineStageId ?? ""}
      editOn="click"
      editing={edit.isEditing(personId, "pipelineStage")}
      error={edit.isEditing(personId, "pipelineStage") ? edit.fieldError : undefined}
      renderDisplay={
        <RecruitStatusBadge
          label={row.profile.pipelineStage?.label}
          tone={pipelineTone(row.profile.pipelineStage?.key)}
        />
      }
      onRequestEdit={() => edit.startEdit(personId, "pipelineStage")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "pipelineStage", raw, reason)}
    />
  );
}

export function RecruitingPriorityCell({ row, edit }: { row: RecruitDirectoryRow; edit: EditApi }) {
  const personId = row.person.id;
  return (
    <InlineEditCell
      label="Priority"
      type="select"
      options={PRIORITY_SELECT_OPTIONS}
      value={row.profile.priorityId ?? ""}
      editOn="click"
      editing={edit.isEditing(personId, "priority")}
      error={edit.isEditing(personId, "priority") ? edit.fieldError : undefined}
      renderDisplay={
        <RecruitStatusBadge
          label={row.profile.priority?.label}
          tone={priorityTone(row.profile.priority?.key)}
        />
      }
      onRequestEdit={() => edit.startEdit(personId, "priority")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "priority", raw, reason)}
    />
  );
}

export function RecruitingInterestCell({ row, edit }: { row: RecruitDirectoryRow; edit: EditApi }) {
  const personId = row.person.id;
  return (
    <InlineEditCell
      label="Interest"
      type="select"
      options={INTEREST_SELECT_OPTIONS}
      value={row.profile.interestId ?? ""}
      editOn="click"
      editing={edit.isEditing(personId, "interest")}
      error={edit.isEditing(personId, "interest") ? edit.fieldError : undefined}
      renderDisplay={
        <RecruitStatusBadge
          label={row.profile.interest?.label}
          tone={interestTone(row.profile.interest?.key)}
        />
      }
      onRequestEdit={() => edit.startEdit(personId, "interest")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "interest", raw, reason)}
    />
  );
}

export function RecruitingOutcomeCell({ row, edit }: { row: RecruitDirectoryRow; edit: EditApi }) {
  const personId = row.person.id;
  return (
    <InlineEditCell
      label="Outcome"
      type="select"
      options={OUTCOME_SELECT_OPTIONS}
      value={row.profile.outcomeId ?? ""}
      editOn="click"
      editing={edit.isEditing(personId, "outcome")}
      error={edit.isEditing(personId, "outcome") ? edit.fieldError : undefined}
      renderDisplay={
        <RecruitStatusBadge
          label={row.profile.outcome?.label}
          tone={outcomeTone(row.profile.outcome?.key)}
        />
      }
      onRequestEdit={() => edit.startEdit(personId, "outcome")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "outcome", raw, reason)}
    />
  );
}

export function RecruitingSchoolChosenCell({
  row,
  edit,
}: {
  row: RecruitDirectoryRow;
  edit: EditApi;
}) {
  const personId = row.person.id;
  const value = row.profile.schoolChosen ?? "";
  return (
    <InlineEditCell
      label="School Chosen"
      type="text"
      value={value}
      displayValue={directoryCellValue(value)}
      editOn="click"
      editing={edit.isEditing(personId, "schoolChosen")}
      error={edit.isEditing(personId, "schoolChosen") ? edit.fieldError : undefined}
      renderDisplay={
        <span className="truncate text-[13px] leading-none font-normal text-text-secondary">
          {directoryCellValue(value)}
        </span>
      }
      onRequestEdit={() => edit.startEdit(personId, "schoolChosen")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(personId, "schoolChosen", raw, reason)}
    />
  );
}

export function RecruitingMetricCells({ row, edit }: { row: RecruitDirectoryRow; edit: EditApi }) {
  const personId = row.person.id;
  const utrDisplay = recruitingMetricDisplay(formatUtr(row.person.utr));
  const trnDisplay = recruitingMetricDisplay(
    row.person.trnRank !== undefined ? String(row.person.trnRank) : TEAM_DIRECTORY_EMPTY,
  );
  const wtnDisplay = recruitingMetricDisplay(formatWtn(row.person.wtn));

  return (
    <>
      <td className={`${BOARD.td} ${BOARD.metric}`}>
        <InlineEditCell
          label="UTR"
          type="number"
          step={0.01}
          value={row.person.utr !== undefined ? String(row.person.utr) : ""}
          displayValue={directoryCellValue(formatUtr(row.person.utr))}
          editOn="click"
          align="right"
          emphasis="directory"
          className="!mx-0 !px-0 !py-0"
          editing={edit.isEditing(personId, "utr")}
          error={edit.isEditing(personId, "utr") ? edit.fieldError : undefined}
          renderDisplay={<span className={BOARD.metric}>{utrDisplay}</span>}
          onRequestEdit={() => edit.startEdit(personId, "utr")}
          onCancel={edit.cancelEdit}
          onCommit={(raw, reason) => edit.commit(personId, "utr", raw, reason)}
        />
      </td>
      <td className={`${BOARD.td} ${BOARD.metric}`}>
        <InlineEditCell
          label="TRN"
          type="number"
          step={1}
          value={row.person.trnRank !== undefined ? String(row.person.trnRank) : ""}
          displayValue={directoryCellValue(row.person.trnRank)}
          editOn="click"
          align="right"
          emphasis="directory"
          className="!mx-0 !px-0 !py-0"
          editing={edit.isEditing(personId, "trnRank")}
          error={edit.isEditing(personId, "trnRank") ? edit.fieldError : undefined}
          renderDisplay={<span className={BOARD.metric}>{trnDisplay}</span>}
          onRequestEdit={() => edit.startEdit(personId, "trnRank")}
          onCancel={edit.cancelEdit}
          onCommit={(raw, reason) => edit.commit(personId, "trnRank", raw, reason)}
        />
      </td>
      <td className={`${BOARD.td} ${BOARD.metric}`}>
        <InlineEditCell
          label="WTN"
          type="number"
          step={0.01}
          value={row.person.wtn !== undefined ? String(row.person.wtn) : ""}
          displayValue={directoryCellValue(formatWtn(row.person.wtn))}
          editOn="click"
          align="right"
          emphasis="directory"
          className="!mx-0 !px-0 !py-0"
          editing={edit.isEditing(personId, "wtn")}
          error={edit.isEditing(personId, "wtn") ? edit.fieldError : undefined}
          renderDisplay={<span className={BOARD.metric}>{wtnDisplay}</span>}
          onRequestEdit={() => edit.startEdit(personId, "wtn")}
          onCancel={edit.cancelEdit}
          onCommit={(raw, reason) => edit.commit(personId, "wtn", raw, reason)}
        />
      </td>
    </>
  );
}

export function RecruitingContactActionsCell({ row }: { row: RecruitDirectoryRow }) {
  const hrefs = recruitingContactHrefs(row);
  return (
    <td className={BOARD.td}>
      <div className="flex justify-center">
        <ContactActionSlots
          tel={hrefs.tel}
          sms={hrefs.sms}
          mailto={hrefs.mailto}
          size="compact"
        />
      </div>
    </td>
  );
}

/** Commit View data cells: Class → … → School Chosen → metrics → Actions. */
export function RecruitingCommitDataCells({
  row,
  classOptions,
  edit,
}: {
  row: RecruitDirectoryRow;
  classOptions: { value: string; label: string }[];
  edit: EditApi;
}) {
  return (
    <>
      <td className={BOARD.td}>
        <RecruitingClassCell row={row} classOptions={classOptions} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingPipelineCell row={row} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingPriorityCell row={row} edit={edit} />
      </td>
      <td className={`${BOARD.td} !px-0`}>
        <RecruitingOutcomeCell row={row} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingSchoolChosenCell row={row} edit={edit} />
      </td>
      <RecruitingMetricCells row={row} edit={edit} />
      <td className={`${BOARD.td} !px-0 text-center`} />
      <RecruitingContactActionsCell row={row} />
    </>
  );
}

/** Shared data cells after identity: Class → … → Actions (optional rankAction before Actions). */
export function RecruitingSharedDataCells({
  row,
  classOptions,
  edit,
  rankAction = null,
}: {
  row: RecruitDirectoryRow;
  classOptions: { value: string; label: string }[];
  edit: EditApi;
  rankAction?: ReactNode;
}) {
  return (
    <>
      <td className={BOARD.td}>
        <RecruitingClassCell row={row} classOptions={classOptions} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingPipelineCell row={row} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingPriorityCell row={row} edit={edit} />
      </td>
      <td className={BOARD.td}>
        <RecruitingInterestCell row={row} edit={edit} />
      </td>
      <td className={`${BOARD.td} !px-0`}>
        <RecruitingOutcomeCell row={row} edit={edit} />
      </td>
      <RecruitingMetricCells row={row} edit={edit} />
      <td className={`${BOARD.td} !px-0 text-center`}>{rankAction}</td>
      <RecruitingContactActionsCell row={row} />
    </>
  );
}
