"use client";

import { useState } from "react";
import Link from "next/link";

import { formatDate } from "@/lib/formatting";
import {
  matchesEventPath,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  displayOpponentOrEvent,
} from "@/features/teamSchedule/types";

import {
  linkMatchEventToScheduleAction,
  suggestScheduleLinksAction,
} from "../actions";

export default function LinkSchedulePanel({ matchEventId }: { matchEventId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    existingMatchEventId: string;
    message: string;
    pendingScheduleId: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<
    Awaited<ReturnType<typeof suggestScheduleLinksAction>>["suggestions"]
  >([]);

  async function loadSuggestions() {
    setBusy(true);
    setError(null);
    setConflict(null);
    const result = await suggestScheduleLinksAction(matchEventId);
    setSuggestions(result.suggestions);
    if (result.error) setError(result.error);
    setOpen(true);
    setBusy(false);
  }

  async function link(scheduleEventId: string, resolveConflict?: "merge_into_existing") {
    setBusy(true);
    setError(null);
    const result = await linkMatchEventToScheduleAction({
      matchEventId,
      scheduleEventId,
      resolveConflict: resolveConflict ?? "abort",
    });
    if (!result.ok) {
      if (result.conflict) {
        setConflict({
          existingMatchEventId: result.conflict.existingMatchEventId,
          message: result.conflict.message,
          pendingScheduleId: scheduleEventId,
        });
      } else {
        setError(result.error);
      }
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mt-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-3">
      <p className="text-sm font-medium text-amber-950">Unlinked from Schedule</p>
      <p className="mt-1 text-xs text-amber-900">
        Legacy official results without a Schedule link. Linking preserves all results and history.
      </p>
      {!open ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadSuggestions()}
          className="mt-2 rounded-control bg-[var(--module-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Link to Schedule
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          {error ? <p className="text-xs text-red-800">{error}</p> : null}
          {conflict ? (
            <div className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              <p>{conflict.message}</p>
              <p className="mt-1">
                Existing container:{" "}
                <Link
                  href={matchesEventPath(conflict.existingMatchEventId)}
                  className="font-medium underline"
                >
                  open Matches event
                </Link>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void link(conflict.pendingScheduleId, "merge_into_existing")}
                  className="rounded-control bg-red-700 px-2.5 py-1 text-xs font-semibold text-white"
                >
                  Merge into existing container
                </button>
                <button
                  type="button"
                  onClick={() => setConflict(null)}
                  className="rounded-control border border-border px-2.5 py-1 text-xs font-semibold"
                >
                  Cancel — keep both
                </button>
              </div>
            </div>
          ) : null}
          {suggestions.length === 0 ? (
            <p className="text-xs text-text-secondary">No strong suggestions. Search Schedule manually.</p>
          ) : (
            <ul className="divide-y divide-amber-200/80 rounded-control border border-amber-200 bg-surface">
              {suggestions.map((s) => (
                <li key={s.schedule.id} className="flex items-start justify-between gap-2 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">{displayOpponentOrEvent(s.schedule)}</p>
                    <p className="text-text-secondary">
                      {formatDate(s.schedule.startDate)} ·{" "}
                      {SCHEDULE_EVENT_TYPE_LABELS[s.schedule.eventType]} · {s.reasons.join(", ")}
                      {s.alreadyLinked ? " · already linked elsewhere" : ""}
                    </p>
                    <Link
                      href={teamOperationsScheduleEventPath(s.schedule.id)}
                      className="text-[var(--module-accent)] hover:underline"
                    >
                      Open Schedule
                    </Link>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void link(s.schedule.id)}
                    className="shrink-0 rounded-control border border-border px-2 py-1 font-semibold disabled:opacity-50"
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
