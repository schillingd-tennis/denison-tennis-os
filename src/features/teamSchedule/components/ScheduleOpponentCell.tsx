"use client";

import { Car } from "lucide-react";

import { resolveScheduleIdentity } from "../schoolIdentity";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  displayOpponentOrEvent,
  type TeamScheduleEvent,
} from "../types";
import ScheduleIdentityMark from "./ScheduleIdentityMark";
import { ScheduleOpponentInlineCell } from "./ScheduleInlineCells";
import { SCHEDULE_LOGO_OFFSET, SCHEDULE_OPPONENT_CELL, SCHEDULE_OPPONENT_PRIMARY } from "./scheduleTableChrome";
import type { ScheduleInlineEditApi } from "../useScheduleInlineEdit";

function opponentSecondaryLine(event: TeamScheduleEvent): string | null {
  if (event.eventType === "team_match") {
    const parts: string[] = [];
    if (event.itaRank != null) parts.push(`#${event.itaRank}`);
    if (event.ncac) parts.push("NCAC");
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (event.eventType === "tournament" || event.eventType === "non_team_event") {
    const eventName = event.eventName?.toLowerCase() ?? "";
    if (eventName.includes("ita indoors")) return "ITA Indoors";
    if (eventName.includes("ita regionals")) return "ITA Regionals";
    return SCHEDULE_EVENT_TYPE_LABELS[event.eventType];
  }

  if (event.eventType === "team_match_placeholder") {
    return "Placeholder";
  }

  return null;
}

export default function ScheduleOpponentCell({
  event,
  edit,
}: {
  event: TeamScheduleEvent;
  edit?: ScheduleInlineEditApi;
}) {
  const identity = resolveScheduleIdentity(event);
  const primary = displayOpponentOrEvent(event);
  const secondary = opponentSecondaryLine(event);

  return (
    <div className={SCHEDULE_OPPONENT_CELL}>
      <div className={SCHEDULE_LOGO_OFFSET}>
        <ScheduleIdentityMark identity={identity} />
      </div>
      <div className="min-w-0 flex-1">
        {edit ? (
          <ScheduleOpponentInlineCell event={event} edit={edit} />
        ) : (
          <p className={SCHEDULE_OPPONENT_PRIMARY}>{primary}</p>
        )}
        {secondary ? <p className="truncate text-[11px] text-text-secondary">{secondary}</p> : null}
        {event.travelRequired ? (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-secondary">
            <Car className="h-3 w-3 shrink-0" aria-hidden />
            Travel
          </p>
        ) : null}
      </div>
    </div>
  );
}
