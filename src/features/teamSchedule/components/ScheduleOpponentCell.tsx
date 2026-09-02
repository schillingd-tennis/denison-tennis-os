"use client";

import { Car } from "lucide-react";

import { resolveScheduleIdentity } from "../schoolIdentity";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  displayOpponentOrEvent,
  type TeamScheduleEvent,
} from "../types";
import ScheduleIdentityMark from "./ScheduleIdentityMark";

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

export default function ScheduleOpponentCell({ event }: { event: TeamScheduleEvent }) {
  const identity = resolveScheduleIdentity(event);
  const primary = displayOpponentOrEvent(event);
  const secondary = opponentSecondaryLine(event);

  return (
    <div className="flex min-w-[10rem] items-start gap-2">
      <ScheduleIdentityMark identity={identity} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-text-primary">{primary}</p>
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
