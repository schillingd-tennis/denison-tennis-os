"use client";

import { useState, type FormEvent } from "react";

import { saveScheduleEventAction } from "../actions";
import {
  isDoubleheaderStatus,
  isScheduleEventType,
  isScheduleStatus,
  isSeasonSegment,
  isSiteDesignation,
} from "../mapping";
import {
  DOUBLEHEADER_STATUSES,
  DOUBLEHEADER_STATUS_LABELS,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_EVENT_TYPE_LABELS,
  SCHEDULE_STATUSES,
  SCHEDULE_STATUS_LABELS,
  SEASON_SEGMENTS,
  SEASON_SEGMENT_LABELS,
  SITE_DESIGNATIONS,
  SITE_DESIGNATION_LABELS,
  type TeamScheduleEvent,
  type TeamScheduleEventInput,
} from "../types";

const control =
  "mt-1 h-9 w-full rounded-control border border-border bg-surface px-2.5 text-sm text-text-primary";
const labelClass = "block text-xs font-semibold text-text-secondary";

function boolField(name: keyof TeamScheduleEventInput, defaultValue: boolean) {
  return defaultValue;
}

export default function ScheduleForm({
  event,
  seasonYear,
  onSaved,
  onCancel,
}: {
  event?: TeamScheduleEvent;
  seasonYear: number;
  onSaved: (event: TeamScheduleEvent) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countsAsDate, setCountsAsDate] = useState(event?.countsAsCompetitionDate ?? true);

  async function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(formEvent.currentTarget);
    const eventTypeRaw = String(form.get("eventType"));
    const siteRaw = String(form.get("siteDesignation"));
    const segmentRaw = String(form.get("seasonSegment"));
    const statusRaw = String(form.get("status"));
    const dhRaw = String(form.get("doubleheaderStatus"));
    if (
      !isScheduleEventType(eventTypeRaw) ||
      !isSiteDesignation(siteRaw) ||
      !isSeasonSegment(segmentRaw) ||
      !isScheduleStatus(statusRaw) ||
      !isDoubleheaderStatus(dhRaw)
    ) {
      setError("Invalid form values.");
      setSaving(false);
      return;
    }
    const input: Partial<TeamScheduleEventInput> = {
      seasonYear,
      eventType: eventTypeRaw,
      opponentName: String(form.get("opponentName") || ""),
      eventName: String(form.get("eventName") || ""),
      itaRank: form.get("itaRank") ? Number(form.get("itaRank")) : null,
      startDate: String(form.get("startDate")),
      endDate: String(form.get("endDate")),
      timeText: String(form.get("timeText") || ""),
      venueName: String(form.get("venueName") || ""),
      city: String(form.get("city") || ""),
      state: String(form.get("state") || ""),
      locationText: String(form.get("locationText") || ""),
      siteDesignation: siteRaw,
      travelRequired: form.get("travelRequired") === "on",
      ncac: form.get("ncac") === "on",
      seasonSegment: segmentRaw,
      status: statusRaw,
      doubleheaderStatus: dhRaw,
      officialsNeeded: form.get("officialsNeeded") ? Number(form.get("officialsNeeded")) : null,
      teamsInEvent: String(form.get("teamsInEvent") || ""),
      countsAsCompetitionDate: form.get("countsAsCompetitionDate") === "on",
      competitionDateNumber: form.get("competitionDateNumber")
        ? Number(form.get("competitionDateNumber"))
        : null,
      competitionDateGroup: String(form.get("competitionDateGroup") || ""),
      notes: String(form.get("notes") || ""),
      sortOrder: event?.sortOrder ?? 0,
    };

    const result = await saveScheduleEventAction(event?.id ?? null, input);
    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onSaved(result.event);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-5">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className={labelClass}>
          Event Type
          <select name="eventType" className={control} defaultValue={event?.eventType ?? "team_match"}>
            {SCHEDULE_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {SCHEDULE_EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Season Segment
          <select name="seasonSegment" className={control} defaultValue={event?.seasonSegment ?? "spring"}>
            {SEASON_SEGMENTS.map((segment) => (
              <option key={segment} value={segment}>
                {SEASON_SEGMENT_LABELS[segment]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Opponent
          <input name="opponentName" className={control} defaultValue={event?.opponentName ?? ""} />
        </label>
        <label className={labelClass}>
          Event Name
          <input name="eventName" className={control} defaultValue={event?.eventName ?? ""} />
        </label>
        <label className={labelClass}>
          ITA Rank
          <input name="itaRank" type="number" className={control} defaultValue={event?.itaRank ?? ""} />
        </label>
        <label className={labelClass}>
          Start Date
          <input name="startDate" type="date" className={control} defaultValue={event?.startDate} required />
        </label>
        <label className={labelClass}>
          End Date
          <input name="endDate" type="date" className={control} defaultValue={event?.endDate} required />
        </label>
        <label className={labelClass}>
          Time
          <input name="timeText" className={control} defaultValue={event?.timeText ?? ""} />
        </label>
        <label className={labelClass}>
          Site
          <select name="siteDesignation" className={control} defaultValue={event?.siteDesignation ?? "neutral"}>
            {SITE_DESIGNATIONS.map((site) => (
              <option key={site} value={site}>
                {SITE_DESIGNATION_LABELS[site]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Venue
          <input name="venueName" className={control} defaultValue={event?.venueName ?? ""} />
        </label>
        <label className={labelClass}>
          City
          <input name="city" className={control} defaultValue={event?.city ?? ""} />
        </label>
        <label className={labelClass}>
          State
          <input name="state" className={control} defaultValue={event?.state ?? ""} />
        </label>
        <label className={`col-span-2 ${labelClass}`}>
          Location (display)
          <input name="locationText" className={control} defaultValue={event?.locationText ?? ""} />
        </label>
        <label className={labelClass}>
          Status
          <select name="status" className={control} defaultValue={event?.status ?? "confirmed"}>
            {SCHEDULE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SCHEDULE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Doubleheader Status
          <select name="doubleheaderStatus" className={control} defaultValue={event?.doubleheaderStatus ?? "none"}>
            {DOUBLEHEADER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DOUBLEHEADER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Competition Date #
          <input
            name="competitionDateNumber"
            type="number"
            className={control}
            defaultValue={event?.competitionDateNumber ?? ""}
            disabled={!countsAsDate}
          />
        </label>
        <label className={labelClass}>
          Shared Date Group
          <input name="competitionDateGroup" className={control} defaultValue={event?.competitionDateGroup ?? ""} />
        </label>
        <label className={labelClass}>
          Officials Needed
          <input name="officialsNeeded" type="number" className={control} defaultValue={event?.officialsNeeded ?? ""} />
        </label>
        <label className={`col-span-2 ${labelClass}`}>
          Teams in Event
          <input name="teamsInEvent" className={control} defaultValue={event?.teamsInEvent ?? ""} />
        </label>
        <label className={`col-span-2 ${labelClass}`}>
          Notes
          <textarea name="notes" rows={3} className={`${control} h-auto py-2`} defaultValue={event?.notes ?? ""} />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-text-primary">
        <label className="inline-flex items-center gap-2">
          <input
            name="countsAsCompetitionDate"
            type="checkbox"
            defaultChecked={boolField("countsAsCompetitionDate", event?.countsAsCompetitionDate ?? true)}
            onChange={(e) => setCountsAsDate(e.target.checked)}
          />
          Counts as competition date
        </label>
        <label className="inline-flex items-center gap-2">
          <input name="ncac" type="checkbox" defaultChecked={event?.ncac ?? false} />
          NCAC
        </label>
        <label className="inline-flex items-center gap-2">
          <input name="travelRequired" type="checkbox" defaultChecked={event?.travelRequired ?? false} />
          Travel required
        </label>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
        <button type="button" className="h-9 rounded-control border border-border px-3 text-xs font-semibold" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-control bg-[var(--module-accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : event ? "Save Changes" : "Save Match"}
        </button>
      </div>
    </form>
  );
}
