"use client";

import { Home, MapPin, Plane } from "lucide-react";

import InlineEditCell from "@/components/inline-edit/InlineEditCell";

import {
  formatCompDateNumber,
  formatItaRank,
  locationLine,
  sharedDateOrDhLabel,
  statusBadgeClass,
  typeBadgeForEvent,
} from "../display";
import {
  DOUBLEHEADER_SELECT_OPTIONS,
  INLINE_EVENT_TYPE_OPTIONS,
  SITE_SELECT_OPTIONS,
  STATUS_SELECT_OPTIONS,
  type ScheduleInlineEditableField,
} from "../scheduleInline";
import type { ScheduleInlineEditApi } from "../useScheduleInlineEdit";
import {
  displayOpponentOrEvent,
  SCHEDULE_STATUS_LABELS,
  SITE_DESIGNATION_LABELS,
  type TeamScheduleEvent,
} from "../types";
import {
  SCHEDULE_OPPONENT_PRIMARY,
  SCHEDULE_OP_FIELD,
} from "./scheduleTableChrome";

function cellError(edit: ScheduleInlineEditApi, eventId: string, field: ScheduleInlineEditableField) {
  return edit.isEditing(eventId, field) ? edit.fieldError : undefined;
}

export function ScheduleCompDateCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const display = formatCompDateNumber(event) ?? "—";
  const editable = event.countsAsCompetitionDate;

  return (
    <InlineEditCell
      label="Competition date number"
      type="number"
      value={event.competitionDateNumber != null ? String(event.competitionDateNumber) : ""}
      displayValue={display}
      editOn="click"
      density="compact"
      emphasis="metadata"
      disabled={!editable}
      editing={edit.isEditing(eventId, "competitionDateNumber")}
      error={cellError(edit, eventId, "competitionDateNumber")}
      className="text-xs tabular-nums text-text-secondary"
      onRequestEdit={() => edit.startEdit(eventId, "competitionDateNumber")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "competitionDateNumber", raw, reason)}
    />
  );
}

export function ScheduleItaRankCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  return (
    <InlineEditCell
      label="ITA rank"
      type="number"
      value={event.itaRank != null ? String(event.itaRank) : ""}
      displayValue={formatItaRank(event.itaRank)}
      editOn="click"
      density="compact"
      emphasis="metadata"
      editing={edit.isEditing(eventId, "itaRank")}
      error={cellError(edit, eventId, "itaRank")}
      className="text-xs tabular-nums text-text-primary"
      onRequestEdit={() => edit.startEdit(eventId, "itaRank")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "itaRank", raw, reason)}
    />
  );
}

export function ScheduleSiteCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const Icon =
    event.siteDesignation === "home" ? Home : event.siteDesignation === "away" ? Plane : MapPin;

  return (
    <div className="min-w-[5.5rem]">
      <InlineEditCell
        label="Site"
        type="select"
        options={SITE_SELECT_OPTIONS}
        value={event.siteDesignation}
        editOn="click"
        density="compact"
        editing={edit.isEditing(eventId, "siteDesignation")}
        error={cellError(edit, eventId, "siteDesignation")}
        editorClassName={SCHEDULE_OP_FIELD.editor}
        renderDisplay={
          <p className={`flex items-center gap-1 ${SCHEDULE_OP_FIELD.text}`}>
            <Icon className="h-3 w-3 shrink-0 text-text-secondary" aria-hidden />
            {SITE_DESIGNATION_LABELS[event.siteDesignation]}
          </p>
        }
        onRequestEdit={() => edit.startEdit(eventId, "siteDesignation")}
        onCancel={edit.cancelEdit}
        onCommit={(raw, reason) => edit.commit(event, "siteDesignation", raw, reason)}
      />
      <p className="mt-0.5 truncate pl-1 text-[11px] text-text-secondary">{locationLine(event)}</p>
    </div>
  );
}

export function ScheduleTimeCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const display = event.timeText ?? "—";

  return (
    <InlineEditCell
      label="Time"
      value={event.timeText ?? ""}
      displayValue={display}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "timeText")}
      error={cellError(edit, eventId, "timeText")}
      editorClassName={SCHEDULE_OP_FIELD.editor}
      className="whitespace-nowrap"
      renderDisplay={<span className={SCHEDULE_OP_FIELD.text}>{display}</span>}
      onRequestEdit={() => edit.startEdit(eventId, "timeText")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "timeText", raw, reason)}
    />
  );
}

export function ScheduleTypeCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const typeBadge = typeBadgeForEvent(event);

  return (
    <InlineEditCell
      label="Type"
      type="select"
      options={INLINE_EVENT_TYPE_OPTIONS}
      value={event.eventType === "team_match_placeholder" ? "team_match" : event.eventType}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "eventType")}
      error={cellError(edit, eventId, "eventType")}
      editorClassName={SCHEDULE_OP_FIELD.editor}
      renderDisplay={
        <span className={`${SCHEDULE_OP_FIELD.badge} ${typeBadge.className}`}>
          {typeBadge.label}
        </span>
      }
      onRequestEdit={() => edit.startEdit(eventId, "eventType")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "eventType", raw, reason)}
    />
  );
}

export function ScheduleStatusCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  return (
    <InlineEditCell
      label="Status"
      type="select"
      options={STATUS_SELECT_OPTIONS}
      value={event.status}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "status")}
      error={cellError(edit, eventId, "status")}
      editorClassName={SCHEDULE_OP_FIELD.editor}
      renderDisplay={
        <span className={`${SCHEDULE_OP_FIELD.badge} ${statusBadgeClass(event.status)}`}>
          {SCHEDULE_STATUS_LABELS[event.status]}
        </span>
      }
      onRequestEdit={() => edit.startEdit(eventId, "status")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "status", raw, reason)}
    />
  );
}

export function ScheduleDoubleheaderCell({
  event,
  allEvents,
  edit,
}: {
  event: TeamScheduleEvent;
  allEvents: readonly TeamScheduleEvent[];
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const dhLabel = sharedDateOrDhLabel(event, allEvents);

  return (
    <InlineEditCell
      label="Doubleheader status"
      type="select"
      options={DOUBLEHEADER_SELECT_OPTIONS}
      value={event.doubleheaderStatus}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "doubleheaderStatus")}
      error={cellError(edit, eventId, "doubleheaderStatus")}
      editorClassName={SCHEDULE_OP_FIELD.editor}
      renderDisplay={
        dhLabel ? (
          <span className={`${SCHEDULE_OP_FIELD.badge} bg-violet-50 text-violet-700`}>{dhLabel}</span>
        ) : (
          <span className={SCHEDULE_OP_FIELD.textMuted}>—</span>
        )
      }
      onRequestEdit={() => edit.startEdit(eventId, "doubleheaderStatus")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "doubleheaderStatus", raw, reason)}
    />
  );
}

export function ScheduleOfficialsCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const display = event.officialsNeeded != null ? String(event.officialsNeeded) : "—";

  return (
    <InlineEditCell
      label="Officials needed"
      type="number"
      value={event.officialsNeeded != null ? String(event.officialsNeeded) : ""}
      displayValue={display}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "officialsNeeded")}
      error={cellError(edit, eventId, "officialsNeeded")}
      editorClassName={SCHEDULE_OP_FIELD.editor}
      className="tabular-nums"
      renderDisplay={<span className={SCHEDULE_OP_FIELD.text}>{display}</span>}
      onRequestEdit={() => edit.startEdit(eventId, "officialsNeeded")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "officialsNeeded", raw, reason)}
    />
  );
}

export function ScheduleOpponentInlineCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit: ScheduleInlineEditApi;
}) {
  const eventId = event.id;
  const primary = displayOpponentOrEvent(event);

  return (
    <InlineEditCell
      label="Opponent or event"
      value={primary === "—" ? "" : primary}
      displayValue={primary}
      editOn="click"
      density="compact"
      editing={edit.isEditing(eventId, "opponentOrEvent")}
      error={cellError(edit, eventId, "opponentOrEvent")}
      renderDisplay={<span className={SCHEDULE_OPPONENT_PRIMARY}>{primary}</span>}
      onRequestEdit={() => edit.startEdit(eventId, "opponentOrEvent")}
      onCancel={edit.cancelEdit}
      onCommit={(raw, reason) => edit.commit(event, "opponentOrEvent", raw, reason)}
    />
  );
}
