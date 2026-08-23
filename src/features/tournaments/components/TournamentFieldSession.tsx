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

import { saveTournamentAction } from "../actions";
import { cityStateFromLocation, tournamentToInput } from "../editor";
import { joinCityState, joinDistance, splitDistance } from "../location";
import { isLifecycleStatus, isRecruitingPlan, isTournamentStatus } from "../mapping";
import { isTravelMethod } from "../types";
import {
  RECRUITING_PLAN_LABELS,
  RECRUITING_PLANS,
  TOURNAMENT_ENTRY_TYPE_OPTIONS,
  TOURNAMENT_LEVEL_OPTIONS,
  TOURNAMENT_LIFECYCLE_LABELS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_SURFACE_OPTIONS,
  TRAVEL_METHOD_LABELS,
  TRAVEL_METHODS,
  type Tournament,
  type TournamentInput,
} from "../types";

export type TournamentEditableField =
  | "name"
  | "level"
  | "entryType"
  | "surface"
  | "lifecycleStatus"
  | "status"
  | "recruitingPlan"
  | "attended"
  | "startDate"
  | "endDate"
  | "city"
  | "state"
  | "venue"
  | "distanceMiles"
  | "distanceExtra"
  | "websiteUrl"
  | "notes"
  | "additionalNotes"
  | "recruitsAttendingText"
  | "estimatedDriveTime"
  | "travelMethod"
  | "departureDate"
  | "returnDate"
  | "hotelName"
  | "hotelAddress"
  | "hotelConfirmation"
  | "hotelCheckIn"
  | "hotelCheckOut"
  | "airport"
  | "flightInfo"
  | "rentalCar"
  | "drawsUrl"
  | "ustaUrl"
  | "scheduleUrl"
  | "resultsUrl";

const URL_FIELDS = new Set<TournamentEditableField>([
  "websiteUrl",
  "drawsUrl",
  "ustaUrl",
  "scheduleUrl",
  "resultsUrl",
]);

const DATE_FIELDS = new Set<TournamentEditableField>([
  "startDate",
  "endDate",
  "departureDate",
  "returnDate",
  "hotelCheckIn",
  "hotelCheckOut",
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const BOOLEAN_OPTIONS: InlineSelectOption[] = [
  { value: "", label: "—" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function selectOptions(
  values: readonly string[],
  labels?: Record<string, string>,
  includeEmpty = true,
  current?: string | null,
): InlineSelectOption[] {
  const options: InlineSelectOption[] = includeEmpty ? [{ value: "", label: "—" }] : [];
  const seen = new Set<string>();
  for (const value of values) {
    options.push({ value, label: labels?.[value] ?? value });
    seen.add(value);
  }
  const extra = current?.trim();
  if (extra && !seen.has(extra)) options.push({ value: extra, label: extra });
  return options;
}

function applyField(
  tournament: Tournament,
  field: TournamentEditableField,
  raw: string,
): TournamentInput | { error: string } {
  const current = tournamentToInput(tournament);
  const trimmed = raw.trim();
  const { city, state } = cityStateFromLocation(tournament.location);
  const distance = splitDistance(tournament.distanceFromColumbus);

  if (field === "name") {
    if (!trimmed) return { error: "Tournament name is required." };
    return { ...current, name: trimmed };
  }
  if (field === "startDate" || field === "endDate") {
    if (trimmed && !DATE_PATTERN.test(trimmed)) return { error: "Use a valid date." };
    const startDate = field === "startDate" ? trimmed || null : current.startDate;
    const endDate = field === "endDate" ? trimmed || null : current.endDate;
    if (startDate && endDate && endDate < startDate) {
      return { error: "End date cannot be before the start date." };
    }
    return { ...current, startDate, endDate };
  }
  if (field === "status") {
    if (!isTournamentStatus(trimmed)) return { error: "Choose a valid operational status." };
    return { ...current, status: trimmed };
  }
  if (field === "recruitingPlan") {
    if (!isRecruitingPlan(trimmed)) return { error: "Choose a recruiting plan." };
    return { ...current, recruitingPlan: trimmed };
  }
  if (field === "lifecycleStatus") {
    if (trimmed && !isLifecycleStatus(trimmed)) return { error: "Choose a valid tournament status." };
    return { ...current, lifecycleStatus: isLifecycleStatus(trimmed) ? trimmed : null };
  }
  if (field === "attended") {
    return { ...current, attended: trimmed === "" ? null : trimmed === "true" };
  }
  if (field === "city") return { ...current, location: joinCityState(trimmed, state ?? "") };
  if (field === "state") return { ...current, location: joinCityState(city ?? "", trimmed) };
  if (field === "distanceMiles") {
    if (trimmed && !Number.isFinite(Number(trimmed))) return { error: "Distance must be a number." };
    return { ...current, distanceFromColumbus: joinDistance(trimmed, distance.extra) };
  }
  if (field === "distanceExtra") {
    return { ...current, distanceFromColumbus: joinDistance(distance.miles, trimmed) };
  }
  if (field === "level") return { ...current, level: trimmed || null };
  if (field === "entryType") return { ...current, entryType: trimmed || null };
  if (field === "surface") return { ...current, surface: trimmed || null };
  if (field === "venue") return { ...current, venue: trimmed || null };
  if (field === "websiteUrl") return { ...current, websiteUrl: trimmed || null };
  if (field === "notes") return { ...current, notes: trimmed || null };
  if (field === "additionalNotes") return { ...current, additionalNotes: trimmed || null };
  if (field === "recruitsAttendingText") return { ...current, recruitsAttendingText: trimmed || null };
  if (field === "estimatedDriveTime") return { ...current, estimatedDriveTime: trimmed || null };
  if (field === "travelMethod") {
    if (trimmed && !isTravelMethod(trimmed)) return { error: "Choose a valid travel method." };
    return { ...current, travelMethod: trimmed && isTravelMethod(trimmed) ? trimmed : null };
  }
  if (field === "departureDate" || field === "returnDate") {
    if (trimmed && !DATE_PATTERN.test(trimmed)) return { error: "Use a valid date." };
    const departureDate = field === "departureDate" ? trimmed || null : current.departureDate;
    const returnDate = field === "returnDate" ? trimmed || null : current.returnDate;
    if (departureDate && returnDate && returnDate < departureDate) {
      return { error: "Return date cannot be before the departure date." };
    }
    return { ...current, departureDate, returnDate };
  }
  if (field === "hotelName") return { ...current, hotelName: trimmed || null };
  if (field === "hotelAddress") return { ...current, hotelAddress: trimmed || null };
  if (field === "hotelConfirmation") return { ...current, hotelConfirmation: trimmed || null };
  if (field === "hotelCheckIn" || field === "hotelCheckOut") {
    if (trimmed && !DATE_PATTERN.test(trimmed)) return { error: "Use a valid date." };
    const hotelCheckIn = field === "hotelCheckIn" ? trimmed || null : current.hotelCheckIn;
    const hotelCheckOut = field === "hotelCheckOut" ? trimmed || null : current.hotelCheckOut;
    if (hotelCheckIn && hotelCheckOut && hotelCheckOut < hotelCheckIn) {
      return { error: "Hotel check-out cannot be before check-in." };
    }
    return { ...current, hotelCheckIn, hotelCheckOut };
  }
  if (field === "airport") return { ...current, airport: trimmed || null };
  if (field === "flightInfo") return { ...current, flightInfo: trimmed || null };
  if (field === "rentalCar") return { ...current, rentalCar: trimmed || null };
  if (field === "drawsUrl") return { ...current, drawsUrl: trimmed || null };
  if (field === "ustaUrl") return { ...current, ustaUrl: trimmed || null };
  if (field === "scheduleUrl") return { ...current, scheduleUrl: trimmed || null };
  return { ...current, resultsUrl: trimmed || null };
}

function currentRaw(tournament: Tournament, field: TournamentEditableField): string {
  const { city, state } = cityStateFromLocation(tournament.location);
  const distance = splitDistance(tournament.distanceFromColumbus);
  switch (field) {
    case "name":
      return tournament.name;
    case "level":
      return tournament.level ?? "";
    case "entryType":
      return tournament.entryType ?? "";
    case "surface":
      return tournament.surface ?? "";
    case "lifecycleStatus":
      return tournament.lifecycleStatus ?? "";
    case "status":
      return tournament.status;
    case "recruitingPlan":
      return tournament.recruitingPlan;
    case "attended":
      return tournament.attended === null ? "" : tournament.attended ? "true" : "false";
    case "startDate":
      return tournament.startDate ?? "";
    case "endDate":
      return tournament.endDate ?? "";
    case "city":
      return city ?? "";
    case "state":
      return state ?? "";
    case "venue":
      return tournament.venue ?? "";
    case "distanceMiles":
      return distance.miles;
    case "distanceExtra":
      return distance.extra;
    case "websiteUrl":
      return tournament.websiteUrl ?? "";
    case "notes":
      return tournament.notes ?? "";
    case "additionalNotes":
      return tournament.additionalNotes ?? "";
    case "recruitsAttendingText":
      return tournament.recruitsAttendingText ?? "";
    case "estimatedDriveTime":
      return tournament.estimatedDriveTime ?? "";
    case "travelMethod":
      return tournament.travelMethod ?? "";
    case "departureDate":
      return tournament.departureDate ?? "";
    case "returnDate":
      return tournament.returnDate ?? "";
    case "hotelName":
      return tournament.hotelName ?? "";
    case "hotelAddress":
      return tournament.hotelAddress ?? "";
    case "hotelConfirmation":
      return tournament.hotelConfirmation ?? "";
    case "hotelCheckIn":
      return tournament.hotelCheckIn ?? "";
    case "hotelCheckOut":
      return tournament.hotelCheckOut ?? "";
    case "airport":
      return tournament.airport ?? "";
    case "flightInfo":
      return tournament.flightInfo ?? "";
    case "rentalCar":
      return tournament.rentalCar ?? "";
    case "drawsUrl":
      return tournament.drawsUrl ?? "";
    case "ustaUrl":
      return tournament.ustaUrl ?? "";
    case "scheduleUrl":
      return tournament.scheduleUrl ?? "";
    case "resultsUrl":
      return tournament.resultsUrl ?? "";
  }
}

function currentDisplay(tournament: Tournament, field: TournamentEditableField): string {
  const raw = currentRaw(tournament, field);
  if (DATE_FIELDS.has(field)) return raw ? formatDate(raw) : "";
  if (field === "attended") return raw === "true" ? "Yes" : raw === "false" ? "No" : "";
  if (field === "travelMethod") {
    return tournament.travelMethod ? TRAVEL_METHOD_LABELS[tournament.travelMethod] : "";
  }
  if (field === "status") return TOURNAMENT_STATUS_LABELS[tournament.status];
  if (field === "recruitingPlan") return RECRUITING_PLAN_LABELS[tournament.recruitingPlan];
  if (field === "lifecycleStatus") {
    return tournament.lifecycleStatus ? TOURNAMENT_LIFECYCLE_LABELS[tournament.lifecycleStatus] : "";
  }
  if (field === "distanceMiles") return raw ? `${raw} mi` : "";
  return raw;
}

type SessionValue = {
  tournament: Tournament;
  isEditing: (field: TournamentEditableField) => boolean;
  errorFor: (field: TournamentEditableField) => string | undefined;
  startEdit: (field: TournamentEditableField) => void;
  cancelEdit: () => void;
  commit: (field: TournamentEditableField, raw: string, reason: InlineCommitReason) => Promise<void>;
};

const TournamentFieldContext = createContext<SessionValue | null>(null);

export function useTournamentFieldSession(): SessionValue {
  const ctx = useContext(TournamentFieldContext);
  if (!ctx) {
    throw new Error("TournamentField must be used within TournamentFieldSession.");
  }
  return ctx;
}

export function TournamentFieldSession({
  tournament,
  onTournamentChange,
  runSave,
  children,
}: {
  tournament: Tournament;
  onTournamentChange: (tournament: Tournament) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState<TournamentEditableField | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const startEdit = useCallback((field: TournamentEditableField) => {
    setFieldError(undefined);
    setEditing(field);
  }, []);

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const commit = useCallback(
    async (field: TournamentEditableField, raw: string, reason: InlineCommitReason) => {
      void reason;
      if (raw === currentRaw(tournament, field)) {
        setEditing(null);
        setFieldError(undefined);
        return;
      }
      const next = applyField(tournament, field, raw);
      if ("error" in next) {
        setFieldError(next.error);
        return;
      }
      const ok = await runSave(async () => {
        const result = await saveTournamentAction(tournament.id, next);
        if (!result.success) {
          setFieldError(result.error);
          throw new Error(result.error);
        }
        onTournamentChange(result.tournament);
      });
      if (!ok) return;
      setEditing(null);
      setFieldError(undefined);
    },
    [onTournamentChange, runSave, tournament],
  );

  const value = useMemo<SessionValue>(
    () => ({
      tournament,
      isEditing: (field) => editing === field,
      errorFor: (field) => (editing === field ? fieldError : undefined),
      startEdit,
      cancelEdit,
      commit,
    }),
    [cancelEdit, commit, editing, fieldError, startEdit, tournament],
  );

  return <TournamentFieldContext.Provider value={value}>{children}</TournamentFieldContext.Provider>;
}

export function TournamentField({
  field,
  label,
  span,
}: {
  field: TournamentEditableField;
  label: string;
  span?: boolean;
}) {
  const session = useTournamentFieldSession();
  let type: "text" | "date" | "select" | "url" | "textarea" | "number" = "text";
  let options: InlineSelectOption[] | undefined;
  let rows: number | undefined;

  if (DATE_FIELDS.has(field)) type = "date";
  else if (URL_FIELDS.has(field)) type = "url";
  else if (
    field === "notes" ||
    field === "additionalNotes" ||
    field === "recruitsAttendingText" ||
    field === "hotelAddress" ||
    field === "flightInfo"
  ) {
    type = "textarea";
    rows = field === "notes" ? 12 : field === "flightInfo" || field === "hotelAddress" ? 3 : 4;
  } else if (field === "distanceMiles") type = "number";
  else if (field === "status") {
    type = "select";
    options = selectOptions([...TOURNAMENT_STATUSES], TOURNAMENT_STATUS_LABELS, false);
  } else if (field === "recruitingPlan") {
    type = "select";
    options = selectOptions([...RECRUITING_PLANS], RECRUITING_PLAN_LABELS, false);
  } else if (field === "lifecycleStatus") {
    type = "select";
    options = selectOptions(["upcoming", "past"], TOURNAMENT_LIFECYCLE_LABELS, true, session.tournament.lifecycleStatus);
  } else if (field === "attended") {
    type = "select";
    options = BOOLEAN_OPTIONS;
  } else if (field === "level") {
    type = "select";
    options = selectOptions(TOURNAMENT_LEVEL_OPTIONS, undefined, true, session.tournament.level);
  } else if (field === "entryType") {
    type = "select";
    options = selectOptions(TOURNAMENT_ENTRY_TYPE_OPTIONS, undefined, true, session.tournament.entryType);
  } else if (field === "surface") {
    type = "select";
    options = selectOptions(TOURNAMENT_SURFACE_OPTIONS, undefined, true, session.tournament.surface);
  } else if (field === "travelMethod") {
    type = "select";
    options = selectOptions([...TRAVEL_METHODS], TRAVEL_METHOD_LABELS, true, session.tournament.travelMethod);
  }

  const url = URL_FIELDS.has(field) ? currentRaw(session.tournament, field) : "";

  return (
    <div className="min-w-0" style={span ? { gridColumn: "1 / -1" } : undefined}>
    <WorkspaceField label={label} span={span}>
      <InlineEditCell
        label={label}
        type={type}
        options={options}
        value={currentRaw(session.tournament, field)}
        displayValue={currentDisplay(session.tournament, field)}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        rows={rows}
        renderDisplay={
          URL_FIELDS.has(field) && url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[var(--module-accent)] hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {url}
            </a>
          ) : undefined
        }
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
