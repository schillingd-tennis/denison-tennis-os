"use client";

import { suggestScheduleForPaste } from "../pasteScheduleSuggestions";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { useDrawerManager } from "@/components/workspace-drawer";
import ScheduleForm from "@/features/teamSchedule/components/ScheduleForm";
import { scheduleDrawerTitle } from "@/features/teamSchedule/schoolIdentity";
import { DEFAULT_SEASON_YEAR } from "@/features/teamSchedule/seedData";
import {
  SCHEDULE_EVENT_TYPE_LABELS,
  displayOpponentOrEvent,
  type TeamScheduleEvent,
} from "@/features/teamSchedule/types";
import { formatDate } from "@/lib/formatting";
import { teamOperationsScheduleEventPath } from "@/lib/module-routes";

import {
  confirmMatchesImportAction,
  listScheduleEventsForMatchesAction,
  parseMatchesBoxScoreAction,
} from "../actions";
import {
  filterScheduleEventsForPicker,
  flagImportScheduleConflicts,
  scheduleResultsFormat,
} from "../scheduleLink";
import { validateImportDraft } from "../validateDraft";
import { resolveMatchSchoolName } from "../schoolNames";
import type {
  DualImportDraft,
  MatchesImportDraft,
  RosterPlayer,
  TournamentImportDraft,
} from "../types";
import { rosterPlayerDisplayName } from "../resolvePlayers";
import ManualResultsEntry from "./ManualResultsEntry";

export default function ImportBoxScoreFlow({
  roster,
  seasonYear,
  initialScheduleEventId = null,
  initialMethod = "paste",
  onClose,
  onSaved,
}: {
  roster: RosterPlayer[];
  seasonYear: number;
  initialScheduleEventId?: string | null;
  initialMethod?: "paste" | "manual";
  onClose: () => void;
  onSaved: (eventId: string) => void;
}) {
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [scheduleEvents, setScheduleEvents] = useState<TeamScheduleEvent[]>([]);
  const [linkedScheduleIds, setLinkedScheduleIds] = useState<string[]>([]);
  const [scheduleLoadError, setScheduleLoadError] = useState<string | null>(null);
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    initialScheduleEventId,
  );
  const [pickerSeason, setPickerSeason] = useState<number>(seasonYear || DEFAULT_SEASON_YEAR);
  const [entryMethod, setEntryMethod] = useState<"paste" | "manual">(initialMethod);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsChoice, setNeedsChoice] = useState(false);
  const [draft, setDraft] = useState<MatchesImportDraft | null>(null);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const selectedSchedule = useMemo(
    () => scheduleEvents.find((e) => e.id === selectedScheduleId) ?? null,
    [scheduleEvents, selectedScheduleId],
  );

  const resultsFormat = selectedSchedule ? scheduleResultsFormat(selectedSchedule) : null;

  const validation = useMemo(
    () => (draft ? validateImportDraft(draft, { scheduleLinked: Boolean(selectedScheduleId) }) : null),
    [draft, selectedScheduleId],
  );

  const scheduleSuggestions = useMemo(() => suggestScheduleForPaste(text, scheduleEvents), [text, scheduleEvents]);

  const filteredSchedule = useMemo(
    () => filterScheduleEventsForPicker(scheduleEvents, scheduleQuery, pickerSeason),
    [scheduleEvents, scheduleQuery, pickerSeason],
  );

  useEffect(() => {
    let cancelled = false;
    void listScheduleEventsForMatchesAction({ seasonYear: pickerSeason }).then((result) => {
      if (cancelled) return;
      setScheduleEvents(result.events);
      setLinkedScheduleIds(result.linkedScheduleIds);
      setScheduleLoadError(result.loadError);
    }).catch((error: unknown) => {
      if (!cancelled) setScheduleLoadError(error instanceof Error ? error.message : "Could not load schedule.");
    });
    return () => { cancelled = true; };
  }, [pickerSeason]);

  const conflicts = useMemo(
    () => selectedSchedule && draft ? flagImportScheduleConflicts(draft, selectedSchedule) : [],
    [selectedSchedule, draft],
  );

  function openCreateSchedule() {
    openDrawer({
      id: "matches-import-add-schedule",
      title: scheduleDrawerTitle(undefined),
      subtitle: "Team Operations · Schedule",
      hideFooter: true,
      content: (
        <ScheduleForm
          seasonYear={pickerSeason}
          onCancel={closeDrawer}
          onSaved={(saved) => {
            setScheduleEvents((current) => [...current, saved]);
            setSelectedScheduleId(saved.id);
            closeDrawer();
          }}
        />
      ),
    });
  }

  async function runParse() {
    if (!selectedScheduleId || !selectedSchedule) {
      setError("Select a Schedule event before parsing.");
      return;
    }
    if (resultsFormat?.ambiguous) {
      setError(resultsFormat.reason);
      return;
    }
    setBusy(true);
    setError(null);
    setNeedsChoice(false);
    try {
      const result = await parseMatchesBoxScoreAction({
        text,
        forcedType: resultsFormat?.status ?? "auto",
        seasonYear: selectedSchedule.seasonYear,
        scheduleEventId: selectedScheduleId,
      });
      if (!result.ok) {
        setNeedsChoice(result.needsUserChoice);
        setError(result.error);
        setText(result.preservedText);
        setDraft(null);
        setImportBatchId(result.importBatchId ?? null);
        return;
      }
      setDraft(result.draft);
      setImportBatchId(result.importBatchId);
      setSource(result.source);
      setNeedsChoice(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSave() {
    if (!draft || !selectedScheduleId) return;
    if (resultsFormat?.ambiguous) {
      setError(resultsFormat.reason);
      return;
    }
    const blocking = conflicts.filter(
      (c) => c.code === "type_mismatch" || c.code === "ambiguous_schedule_type",
    );
    if (blocking.length > 0) {
      setError(blocking.map((c) => c.message).join(" "));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await confirmMatchesImportAction({
        draft,
        sourceText: text,
        importBatchId,
        scheduleEventId: selectedScheduleId,
      });
      if (!result.ok) {
        setError([result.error, ...(result.errors ?? [])].filter(Boolean).join(" "));
        setDraft(result.preservedDraft);
        setText(result.preservedText);
        return;
      }
      onSaved(result.eventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import box score"
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-card border border-border bg-surface shadow-xl sm:rounded-card"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Enter official results</h2>
            <p className="text-xs text-text-secondary">
              Paste results, then confirm the matching Schedule event and review before saving.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-control p-2 hover:bg-app-background">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {entryMethod === "paste" ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">1. Paste results</h3>
            {resultsFormat && !resultsFormat.ambiguous ? (
              <p className="text-xs text-text-secondary">
                Results format from Schedule:{" "}
                <span className="font-medium capitalize text-text-primary">{resultsFormat.status}</span>
                . Type corrections happen on Schedule — not by silently overriding here.
              </p>
            ) : null}
            <label className="block text-xs font-medium text-text-secondary">
              Paste box score
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--module-accent)]"
                placeholder="Paste dual box score or tournament results…"
              />
            </label>
          </section>
          ) : null}
          <section className="space-y-2 rounded-card border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">1. Schedule event</h3>
              <button
                type="button"
                onClick={openCreateSchedule}
                className="rounded-control border border-border px-2.5 py-1 text-xs font-semibold"
              >
                Add Schedule Event
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-text-secondary">
                Season{" "}
                <select
                  value={pickerSeason}
                  onChange={(e) => setPickerSeason(Number(e.target.value))}
                  className="ml-1 h-8 rounded-control border border-border bg-surface px-2 text-xs"
                >
                  {[pickerSeason, pickerSeason - 1, pickerSeason + 1, DEFAULT_SEASON_YEAR]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .sort((a, b) => b - a)
                    .map((year) => (
                      <option key={year} value={year}>
                        {year - 1}–{String(year).slice(-2)}
                      </option>
                    ))}
                </select>
              </label>
              <input
                value={scheduleQuery}
                onChange={(e) => setScheduleQuery(e.target.value)}
                placeholder="Search name, opponent, site, type…"
                className="h-8 min-w-[12rem] flex-1 rounded-control border border-border bg-surface px-2 text-xs"
              />
            </div>
            {entryMethod === "paste" && scheduleSuggestions.length > 0 ? <div className="space-y-1 rounded-control border border-border p-2">
              <p className="text-xs font-semibold">Suggested Schedule events — confirm the correct event</p>
              {scheduleSuggestions.map(({event,reason}) => <button key={event.id} type="button" onClick={() => {setSelectedScheduleId(event.id);setDraft(null);}} className="block w-full rounded-control p-2 text-left text-xs hover:bg-app-background">
                <span className="font-semibold">{displayOpponentOrEvent(event)}</span><span className="block text-text-secondary">{reason}</span>
              </button>)}
            </div> : null}
            {scheduleLoadError ? (
              <p className="text-xs text-amber-800">{scheduleLoadError}</p>
            ) : null}
            <div className="max-h-40 overflow-y-auto rounded-control border border-border">
              {filteredSchedule.length === 0 ? (
                <p className="px-3 py-4 text-xs text-text-secondary">
                  No Schedule events in this season. Add one to continue.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredSchedule.map((event) => {
                    const selected = event.id === selectedScheduleId;
                    const hasResults = linkedScheduleIds.includes(event.id);
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => {setSelectedScheduleId(event.id);setDraft(null);}}
                          className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs ${
                            selected ? "bg-[var(--module-tint)]" : "hover:bg-app-background"
                          }`}
                        >
                          <span className="font-medium text-text-primary">
                            {displayOpponentOrEvent(event)}
                            {hasResults ? (
                              <span className="ml-2 text-[10px] font-normal text-text-secondary">
                                (has official results)
                              </span>
                            ) : null}
                          </span>
                          <span className="text-text-secondary">
                            {formatDate(event.startDate)}
                            {event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ""}
                            {" · "}
                            {SCHEDULE_EVENT_TYPE_LABELS[event.eventType]}
                            {" · "}
                            {event.siteDesignation}
                            {event.venueName || event.locationText
                              ? ` · ${event.venueName || event.locationText}`
                              : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {selectedSchedule ? (
              <ScheduleSummaryCard event={selectedSchedule} format={resultsFormat} />
            ) : (
              <p className="text-xs text-amber-800">Required: select a Schedule event before parse/confirm.</p>
            )}
          </section>

          <div className="flex gap-1 rounded-card border border-border bg-app-background/50 p-1">
            <button
              type="button"
              onClick={() => setEntryMethod("paste")}
              className={`h-8 flex-1 rounded-control text-xs font-semibold ${
                entryMethod === "paste"
                  ? "bg-[var(--module-accent)] text-white"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              Paste results
            </button>
            <button
              type="button"
              onClick={() => setEntryMethod("manual")}
              className={`h-8 flex-1 rounded-control text-xs font-semibold ${
                entryMethod === "manual"
                  ? "bg-[var(--module-accent)] text-white"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              Manual entry
            </button>
          </div>

          {entryMethod === "manual" ? (
            selectedSchedule ? (
              <ManualResultsEntry
                roster={roster}
                schedule={selectedSchedule}
                onSaved={onSaved}
                onCancel={onClose}
              />
            ) : (
              <p className="text-sm text-amber-800">Select a Schedule event to enter results manually.</p>
            )
          ) : (
            <>


          {needsChoice ? (
            <div className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Could not auto-detect</p>
              <p className="mt-1 text-xs">
                Paste is preserved. Confirm the Schedule event type (Team Match vs Tournament), then parse again.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          ) : null}

          {conflicts.length > 0 ? (
            <ul className="list-disc space-y-1 rounded-control border border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900">
              {conflicts.map((c) => (
                <li key={`${c.code}-${c.message}`}>{c.message}</li>
              ))}
            </ul>
          ) : null}

          {draft ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">3. Review results</h3>
              {selectedSchedule ? <ScheduleSummaryCard event={selectedSchedule} format={resultsFormat} /> : null}
              <p className="text-xs text-text-secondary">
                Draft source: {source === "deterministic" ? "Built-in parser (AI not used)" : source === "ai" || source === "deterministic+ai" ? "AI interpretation" : "—"} · confidence {Math.round(draft.confidence * 100)}% ·{" "}
                {draft.interpretation}
              </p>
              {draft.kind === "dual" ? (
                <DualReviewPanel draft={draft} roster={roster} onChange={setDraft} />
              ) : (
                <TournamentReviewPanel draft={draft} roster={roster} onChange={setDraft} />
              )}
              {validation && validation.warnings.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
                  {validation.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              {validation && validation.errors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-red-800">
                  {validation.errors.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
            </>
          )}
        </div>

        {entryMethod === "paste" ? (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-border px-3 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !text.trim() || !selectedScheduleId || Boolean(resultsFormat?.ambiguous)}
            onClick={() => void runParse()}
            className="rounded-control border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Working…" : "Parse draft"}
          </button>
          <button
            type="button"
            disabled={
              busy ||
              !draft ||
              !selectedScheduleId ||
              Boolean(resultsFormat?.ambiguous) ||
              (validation != null && !validation.ok)
            }
            onClick={() => void confirmSave()}
            className="rounded-control bg-[var(--module-accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Confirm save
          </button>
        </footer>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleSummaryCard({
  event,
  format,
}: {
  event: TeamScheduleEvent;
  format: ReturnType<typeof scheduleResultsFormat> | null;
}) {
  return (
    <div className="rounded-control border border-[var(--module-border)] bg-[var(--module-tint)]/40 px-3 py-2 text-xs">
      <p className="font-medium text-text-primary">{displayOpponentOrEvent(event)}</p>
      <p className="mt-0.5 text-text-secondary">
        {formatDate(event.startDate)}
        {event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ""}
        {" · "}
        {SCHEDULE_EVENT_TYPE_LABELS[event.eventType]}
        {" · "}
        <span className="capitalize">{event.siteDesignation}</span>
        {event.venueName ? ` · ${event.venueName}` : ""}
        {format && !format.ambiguous ? ` · import as ${format.status}` : ""}
      </p>
      <Link
        href={teamOperationsScheduleEventPath(event.id)}
        className="mt-1 inline-block font-medium text-[var(--module-accent)] hover:underline"
        target="_blank"
      >
        Open / edit Schedule event
      </Link>
    </div>
  );
}

function DualReviewPanel({
  draft,
  roster,
  onChange,
}: {
  draft: DualImportDraft;
  roster: RosterPlayer[];
  onChange: (draft: MatchesImportDraft) => void;
}) {
  return (
    <div className="space-y-3 rounded-card border border-border p-3">
      <p className="text-xs text-text-secondary">
        Event identity comes from Schedule. Review team score and line results below.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field
          label="Reported score (Denison)"
          value={draft.reportedTeamScoreDenison?.toString() ?? ""}
          onChange={(value) =>
            onChange({
              ...draft,
              reportedTeamScoreDenison: value === "" ? null : Number(value),
            })
          }
        />
        <Field
          label="Reported score (Opponent)"
          value={draft.reportedTeamScoreOpponent?.toString() ?? ""}
          onChange={(value) =>
            onChange({
              ...draft,
              reportedTeamScoreOpponent: value === "" ? null : Number(value),
            })
          }
        />
      </div>
      <p className="text-xs text-text-secondary">
        Calculated: {draft.calculatedTeamScoreDenison}–{draft.calculatedTeamScoreOpponent}
        {draft.teamScoreDiscrepancy ? " · discrepancy flagged" : ""} · format {draft.scoringFormat}
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-text-secondary">
            <tr>
              <th className="py-1 pr-2">Pos</th>
              <th className="py-1 pr-2">Denison</th>
              <th className="py-1 pr-2">Opponent</th>
              <th className="py-1 pr-2">Score</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1">Winner</th>
            </tr>
          </thead>
          <tbody>
            {draft.results.map((row, index) => (
              <tr key={`${row.sourceExcerpt}-${index}`} className="border-t border-border align-top">
                <td className="py-2 pr-2">{row.lineupPosition ?? "—"}</td>
                <td className="py-2 pr-2">
                  <PlayerSelect
                    roster={roster}
                    participant={row.denisonA}
                    onSelect={(personId) => {
                      const results = [...draft.results];
                      results[index] = {
                        ...row,
                        denisonA: { ...row.denisonA, personId, resolution: "manual" },
                      };
                      onChange({ ...draft, results });
                    }}
                  />
                  {row.denisonB ? (
                    <PlayerSelect
                      roster={roster}
                      participant={row.denisonB}
                      onSelect={(personId) => {
                        const results = [...draft.results];
                        results[index] = {
                          ...row,
                          denisonB: { ...row.denisonB!, personId, resolution: "manual" },
                        };
                        onChange({ ...draft, results });
                      }}
                    />
                  ) : null}
                </td>
                <td className="py-2 pr-2 text-text-secondary">
                  {[row.opponentAName, row.opponentBName].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="py-2 pr-2 tabular-nums">{row.scoreText ?? "—"}</td>
                <td className="py-2 pr-2 capitalize">{row.status}</td>
                <td className="py-2 capitalize">{row.winnerSide ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TournamentReviewPanel({
  draft,
  roster,
  onChange,
}: {
  draft: TournamentImportDraft;
  roster: RosterPlayer[];
  onChange: (draft: MatchesImportDraft) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, TournamentImportDraft["results"]>();
    for (const row of draft.results) {
      const key =
        [row.drawName, row.flightName, row.roundLabel].filter(Boolean).join(" · ") || "Results";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [draft.results]);

  return (
    <div className="space-y-3 rounded-card border border-border p-3">
      <p className="text-xs text-text-secondary">
        Event identity comes from Schedule. No team score / dual W–L for tournament imports. Incremental
        rounds add into the same Schedule-linked container.
      </p>
      {grouped.map(([group, rows]) => (
        <div key={group}>
          <h3 className="mb-1 text-xs font-semibold text-text-secondary">{group}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-text-secondary">
                <tr>
                  <th className="py-1 pr-2">Denison</th>
                  <th className="py-1 pr-2">Opponent</th>
                  <th className="py-1 pr-2">Score</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const index = draft.results.indexOf(row);
                  return (
                    <tr key={`${row.sourceExcerpt}-${index}`} className="border-t border-border align-top">
                      <td className="py-2 pr-2">
                        <PlayerSelect
                          roster={roster}
                          participant={row.denisonA}
                          onSelect={(personId) => {
                            const results = [...draft.results];
                            results[index] = {
                              ...row,
                              denisonA: { ...row.denisonA, personId, resolution: "manual" },
                            };
                            onChange({ ...draft, results });
                          }}
                        />
                        {row.denisonB ? (
                          <PlayerSelect
                            roster={roster}
                            participant={row.denisonB}
                            onSelect={(personId) => {
                              const results = [...draft.results];
                              results[index] = {
                                ...row,
                                denisonB: {
                                  ...row.denisonB!,
                                  personId,
                                  resolution: "manual",
                                },
                              };
                              onChange({ ...draft, results });
                            }}
                          />
                        ) : null}
                      </td>
                      <td className="min-w-52 py-2 pr-2 text-text-secondary">
                        <span className="block">
                          {[row.opponentAName, row.opponentBName].filter(Boolean).join(" / ") || "—"}
                        </span>
                        <label className="mt-1 block text-[10px] font-semibold tracking-wide uppercase">
                          School
                          <input
                            value={row.opponentSchool ?? ""}
                            onChange={(event) => {
                              const results = [...draft.results];
                              const opponentSchool = event.target.value || null;
                              const school = resolveMatchSchoolName(opponentSchool);
                              const flags = row.flags.filter((flag) => !flag.startsWith("Unknown school abbreviation "));
                              if (school.needsConfirmation && opponentSchool) {
                                flags.push(`Unknown school abbreviation ${opponentSchool} — enter the full school name before saving.`);
                              }
                              results[index] = { ...row, opponentSchool, flags };
                              onChange({
                                ...draft,
                                results,
                                flags: [...new Set(results.flatMap((result) => result.flags))],
                              });
                            }}
                            placeholder="Enter full school name"
                            className="mt-0.5 h-8 w-full rounded-control border border-border bg-surface px-2 text-xs font-normal normal-case tracking-normal text-text-primary outline-none focus:border-[var(--module-accent)]"
                          />
                        </label>
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{row.scoreText ?? "—"}</td>
                      <td className="py-2 capitalize">{row.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-text-secondary">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
      />
    </label>
  );
}

function PlayerSelect({
  roster,
  participant,
  onSelect,
}: {
  roster: RosterPlayer[];
  participant: {
    rawName: string;
    personId: string | null;
    resolution: string;
    candidateIds?: string[];
  };
  onSelect: (personId: string) => void;
}) {
  const options =
    participant.candidateIds && participant.candidateIds.length > 0
      ? roster.filter((p) => participant.candidateIds!.includes(p.id))
      : roster;
  return (
    <div className="mb-1">
      <select
        value={participant.personId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className={`h-8 w-full max-w-[14rem] rounded-control border px-1 text-xs ${
          participant.personId ? "border-border" : "border-amber-300 bg-amber-50"
        }`}
      >
        <option value="">{participant.rawName || "Select player…"}</option>
        {options.map((player) => (
          <option key={player.id} value={player.id}>
            {rosterPlayerDisplayName(player)}
          </option>
        ))}
      </select>
    </div>
  );
}
