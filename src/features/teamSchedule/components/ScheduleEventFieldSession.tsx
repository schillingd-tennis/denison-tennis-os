"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { WorkspaceField } from "@/components/adaptive-workspace";
import {
  InlineEditCell,
  type InlineCommitReason,
  type InlineSelectOption,
} from "@/components/inline-edit";
import { formatDate } from "@/lib/formatting";

import { saveScheduleEventAction } from "../actions";
import { scheduleEventToInput } from "../scheduleInline";
import {
  DOUBLEHEADER_STATUS_LABELS,
  DOUBLEHEADER_STATUSES,
  SCHEDULE_EVENT_TYPE_LABELS,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUSES,
  SEASON_SEGMENT_LABELS,
  SEASON_SEGMENTS,
  SITE_DESIGNATION_LABELS,
  SITE_DESIGNATIONS,
  type TeamScheduleEvent,
  type TeamScheduleEventInput,
} from "../types";

export type ScheduleEventEditableField =
  | "opponentName"
  | "eventName"
  | "eventType"
  | "startDate"
  | "endDate"
  | "timeText"
  | "venueName"
  | "city"
  | "state"
  | "locationText"
  | "siteDesignation"
  | "status"
  | "seasonSegment"
  | "travelRequired"
  | "ncac"
  | "notes"
  | "officialsNeeded"
  | "itaRank"
  | "doubleheaderStatus"
  | "countsAsCompetitionDate"
  | "competitionDateNumber";

const DATE_FIELDS = new Set<ScheduleEventEditableField>(["startDate", "endDate"]);

const BOOLEAN_OPTIONS: InlineSelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function applyField(
  event: TeamScheduleEvent,
  field: ScheduleEventEditableField,
  raw: string,
): TeamScheduleEventInput | { error: string } {
  const base = scheduleEventToInput(event);
  const trimmed = raw.trim();

  if (field === "opponentName") return { ...base, opponentName: trimmed || null };
  if (field === "eventName") return { ...base, eventName: trimmed || null };
  if (field === "eventType") {
    if (!(SCHEDULE_EVENT_TYPES as readonly string[]).includes(trimmed)) {
      return { error: "Select a valid event type." };
    }
    return { ...base, eventType: trimmed as TeamScheduleEvent["eventType"] };
  }
  if (field === "startDate") {
    if (!trimmed) return { error: "Start date is required." };
    return { ...base, startDate: trimmed };
  }
  if (field === "endDate") {
    if (!trimmed) return { error: "End date is required." };
    return { ...base, endDate: trimmed };
  }
  if (field === "timeText") return { ...base, timeText: trimmed || null };
  if (field === "venueName") return { ...base, venueName: trimmed || null };
  if (field === "city") return { ...base, city: trimmed || null };
  if (field === "state") return { ...base, state: trimmed || null };
  if (field === "locationText") return { ...base, locationText: trimmed || null };
  if (field === "siteDesignation") {
    if (!(SITE_DESIGNATIONS as readonly string[]).includes(trimmed)) {
      return { error: "Select a site designation." };
    }
    return { ...base, siteDesignation: trimmed as TeamScheduleEvent["siteDesignation"] };
  }
  if (field === "status") {
    if (!(SCHEDULE_STATUSES as readonly string[]).includes(trimmed)) {
      return { error: "Select a valid status." };
    }
    return { ...base, status: trimmed as TeamScheduleEvent["status"] };
  }
  if (field === "seasonSegment") {
    if (!(SEASON_SEGMENTS as readonly string[]).includes(trimmed)) {
      return { error: "Select a season segment." };
    }
    return { ...base, seasonSegment: trimmed as TeamScheduleEvent["seasonSegment"] };
  }
  if (field === "travelRequired") return { ...base, travelRequired: trimmed === "true" };
  if (field === "ncac") return { ...base, ncac: trimmed === "true" };
  if (field === "notes") return { ...base, notes: trimmed || null };
  if (field === "officialsNeeded") {
    if (!trimmed) return { ...base, officialsNeeded: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return { error: "Enter a valid officials count." };
    return { ...base, officialsNeeded: Math.round(n) };
  }
  if (field === "itaRank") {
    if (!trimmed) return { ...base, itaRank: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 1) return { error: "Enter a valid ITA rank." };
    return { ...base, itaRank: Math.round(n) };
  }
  if (field === "doubleheaderStatus") {
    if (!(DOUBLEHEADER_STATUSES as readonly string[]).includes(trimmed)) {
      return { error: "Select a doubleheader status." };
    }
    return { ...base, doubleheaderStatus: trimmed as TeamScheduleEvent["doubleheaderStatus"] };
  }
  if (field === "countsAsCompetitionDate") {
    return { ...base, countsAsCompetitionDate: trimmed === "true" };
  }
  if (field === "competitionDateNumber") {
    if (!trimmed) return { ...base, competitionDateNumber: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 1) return { error: "Enter a valid competition date number." };
    return { ...base, competitionDateNumber: Math.round(n) };
  }
  return base;
}

function currentRaw(event: TeamScheduleEvent, field: ScheduleEventEditableField): string {
  switch (field) {
    case "opponentName":
      return event.opponentName ?? "";
    case "eventName":
      return event.eventName ?? "";
    case "eventType":
      return event.eventType;
    case "startDate":
      return event.startDate;
    case "endDate":
      return event.endDate;
    case "timeText":
      return event.timeText ?? "";
    case "venueName":
      return event.venueName ?? "";
    case "city":
      return event.city ?? "";
    case "state":
      return event.state ?? "";
    case "locationText":
      return event.locationText ?? "";
    case "siteDesignation":
      return event.siteDesignation;
    case "status":
      return event.status;
    case "seasonSegment":
      return event.seasonSegment;
    case "travelRequired":
      return event.travelRequired ? "true" : "false";
    case "ncac":
      return event.ncac ? "true" : "false";
    case "notes":
      return event.notes ?? "";
    case "officialsNeeded":
      return event.officialsNeeded != null ? String(event.officialsNeeded) : "";
    case "itaRank":
      return event.itaRank != null ? String(event.itaRank) : "";
    case "doubleheaderStatus":
      return event.doubleheaderStatus;
    case "countsAsCompetitionDate":
      return event.countsAsCompetitionDate ? "true" : "false";
    case "competitionDateNumber":
      return event.competitionDateNumber != null ? String(event.competitionDateNumber) : "";
  }
}

function currentDisplay(event: TeamScheduleEvent, field: ScheduleEventEditableField): string {
  const raw = currentRaw(event, field);
  if (DATE_FIELDS.has(field)) return raw ? formatDate(raw) : "";
  if (field === "eventType") return SCHEDULE_EVENT_TYPE_LABELS[event.eventType];
  if (field === "siteDesignation") return SITE_DESIGNATION_LABELS[event.siteDesignation];
  if (field === "status") return SCHEDULE_STATUS_LABELS[event.status];
  if (field === "seasonSegment") return SEASON_SEGMENT_LABELS[event.seasonSegment];
  if (field === "doubleheaderStatus") return DOUBLEHEADER_STATUS_LABELS[event.doubleheaderStatus];
  if (field === "travelRequired" || field === "ncac" || field === "countsAsCompetitionDate") {
    return raw === "true" ? "Yes" : "No";
  }
  return raw;
}

type SessionValue = {
  event: TeamScheduleEvent;
  isEditing: (field: ScheduleEventEditableField) => boolean;
  errorFor: (field: ScheduleEventEditableField) => string | undefined;
  startEdit: (field: ScheduleEventEditableField) => void;
  cancelEdit: () => void;
  commit: (field: ScheduleEventEditableField, raw: string, reason: InlineCommitReason) => Promise<void>;
};

const ScheduleEventFieldContext = createContext<SessionValue | null>(null);

export function ScheduleEventFieldSession({
  event,
  onEventChange,
  runSave,
  children,
}: {
  event: TeamScheduleEvent;
  onEventChange: (event: TeamScheduleEvent) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState<ScheduleEventEditableField | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const startEdit = useCallback((field: ScheduleEventEditableField) => {
    setFieldError(undefined);
    setEditing(field);
  }, []);

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const commit = useCallback(
    async (field: ScheduleEventEditableField, raw: string, reason: InlineCommitReason) => {
      void reason;
      if (raw === currentRaw(event, field)) {
        setEditing(null);
        setFieldError(undefined);
        return;
      }
      const next = applyField(event, field, raw);
      if ("error" in next) {
        setFieldError(next.error);
        return;
      }
      const previous = event;
      onEventChange({ ...event, ...next, id: event.id, createdAt: event.createdAt, updatedAt: event.updatedAt });
      const ok = await runSave(async () => {
        const result = await saveScheduleEventAction(event.id, next);
        if (!result.success) {
          setFieldError(result.error);
          onEventChange(previous);
          throw new Error(result.error);
        }
        onEventChange(result.event);
      });
      if (!ok) return;
      setEditing(null);
      setFieldError(undefined);
    },
    [event, onEventChange, runSave],
  );

  const value = useMemo<SessionValue>(
    () => ({
      event,
      isEditing: (field) => editing === field,
      errorFor: (field) => (editing === field ? fieldError : undefined),
      startEdit,
      cancelEdit,
      commit,
    }),
    [cancelEdit, commit, editing, event, fieldError, startEdit],
  );

  return (
    <ScheduleEventFieldContext.Provider value={value}>{children}</ScheduleEventFieldContext.Provider>
  );
}

export function ScheduleEventField({
  field,
  label,
  span,
}: {
  field: ScheduleEventEditableField;
  label: string;
  span?: boolean;
}) {
  const session = useContext(ScheduleEventFieldContext);
  if (!session) throw new Error("ScheduleEventField must be used within ScheduleEventFieldSession.");

  let type: "text" | "date" | "select" | "textarea" | "number" = "text";
  let options: InlineSelectOption[] | undefined;
  let rows: number | undefined;

  if (DATE_FIELDS.has(field)) type = "date";
  else if (field === "notes") {
    type = "textarea";
    rows = 6;
  } else if (field === "officialsNeeded" || field === "itaRank" || field === "competitionDateNumber") {
    type = "number";
  } else if (field === "eventType") {
    type = "select";
    options = SCHEDULE_EVENT_TYPES.map((value) => ({
      value,
      label: SCHEDULE_EVENT_TYPE_LABELS[value],
    }));
  } else if (field === "siteDesignation") {
    type = "select";
    options = SITE_DESIGNATIONS.map((value) => ({
      value,
      label: SITE_DESIGNATION_LABELS[value],
    }));
  } else if (field === "status") {
    type = "select";
    options = SCHEDULE_STATUSES.map((value) => ({
      value,
      label: SCHEDULE_STATUS_LABELS[value],
    }));
  } else if (field === "seasonSegment") {
    type = "select";
    options = SEASON_SEGMENTS.map((value) => ({
      value,
      label: SEASON_SEGMENT_LABELS[value],
    }));
  } else if (field === "doubleheaderStatus") {
    type = "select";
    options = DOUBLEHEADER_STATUSES.map((value) => ({
      value,
      label: DOUBLEHEADER_STATUS_LABELS[value],
    }));
  } else if (field === "travelRequired" || field === "ncac" || field === "countsAsCompetitionDate") {
    type = "select";
    options = BOOLEAN_OPTIONS;
  }

  return (
    <div className="min-w-0" style={span ? { gridColumn: "1 / -1" } : undefined}>
      <WorkspaceField label={label} span={span}>
        <InlineEditCell
          label={label}
          type={type}
          options={options}
          value={currentRaw(session.event, field)}
          displayValue={currentDisplay(session.event, field)}
          align="left"
          editOn="click"
          emphasis="workspace"
          density="compact"
          rows={rows}
          editing={session.isEditing(field)}
          error={session.errorFor(field)}
          onRequestEdit={() => session.startEdit(field)}
          onCancel={session.cancelEdit}
          onCommit={(raw, reason) => session.commit(field, raw, reason)}
        />
      </WorkspaceField>
    </div>
  );
}
