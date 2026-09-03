"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";

import { saveValidatedQuickMatchAction } from "../actions";
import { freshQuickMatchDateState, resolveQuickMatchDate, todayLocalIsoDate } from "../dates";
import { formatPlayedAtLabel } from "../display";
import { AI_PARSE_UNAVAILABLE } from "../aiMatchExtract";
import { HIGH_PARSE_CONFIDENCE } from "../hybridParse";
import { interpretMatchEntry } from "../parseMatchText";
import { SCORE_FORMAT_HINT } from "../parseScore";
import { formatSignedCredit, rankingCreditForOutcome } from "../resultModel";
import { rosterPlayerFullName, rosterPlayerShortName } from "../roster";
import {
  INTRA_SQUAD_WEIGHTS,
  MATCH_STATUSES,
  PARSE_ERROR_HINT,
  type IntraSquadMatch,
  type IntraSquadWeight,
  type MatchStatus,
  type RosterPlayer,
} from "../types";
import styles from "./intraSquadDashboard.module.css";

const WEIGHTS: IntraSquadWeight[] = [1, 2, 3];

const EXAMPLE_RESULTS = [
  "Chika was leading Jackson 64, 32",
  "Nick beat Minato yesterday 36 60 62 weight 3",
  "Kyle lost to Balraj 1-6, 1-6",
] as const;

const LOOKS_LIKE_RESULT =
  /\s+(defeated|beats|beat|def\.?|won over|lost to|(?:was\s+)?leading|led|was up on|was ahead of|was beating|was trailing|didn'?t finish|v\.?|vs\.?|versus|against)\s+|\bunfinished\b/i;

type PreviewState = {
  source: "deterministic" | "ai";
  confidence: number;
  needsConfirmation: boolean;
  interpretation: string;
  status: MatchStatus;
  primaryId: string;
  opponentId: string;
  scoreText: string;
  weight: IntraSquadWeight;
  weightFromText: boolean;
  playedAt: string;
  dateFromText: boolean;
  dateText: string | null;
  sourceText: string;
  confirmed: boolean;
};

type ParseApiOk = {
  ok: true;
  source: "deterministic" | "ai";
  confidence: number;
  needsConfirmation: boolean;
  interpretation: string;
  status: MatchStatus;
  primaryPlayerId: string;
  opponentPlayerId: string;
  scoreText: string;
  weight: IntraSquadWeight;
  weightFromText: boolean;
  playedAt: string;
  dateFromText: boolean;
  dateText: string | null;
  sourceText: string;
};

type BusyPhase = "understanding" | "saving" | null;

function playerById(roster: readonly RosterPlayer[], id: string): RosterPlayer | undefined {
  return roster.find((player) => player.id === id);
}

function previewFromDeterministic(
  deterministic: Extract<ReturnType<typeof interpretMatchEntry>, { ok: true }>,
  trimmed: string,
  selectedDate: string,
): PreviewState {
  const playedAt =
    deterministic.dateFromText && deterministic.playedAt ? deterministic.playedAt : selectedDate;
  return {
    source: "deterministic",
    confidence: deterministic.confidence,
    needsConfirmation: deterministic.confidence < HIGH_PARSE_CONFIDENCE,
    interpretation: deterministic.interpretation,
    status: deterministic.status,
    primaryId: deterministic.status === "unfinished" ? deterministic.leader.id : deterministic.winner.id,
    opponentId:
      deterministic.status === "unfinished" ? deterministic.trailing.id : deterministic.loser.id,
    scoreText: deterministic.scoreText,
    weight: deterministic.weight,
    weightFromText: deterministic.weightFromText,
    playedAt,
    dateFromText: deterministic.dateFromText,
    dateText: deterministic.dateText,
    sourceText: trimmed,
    confirmed: deterministic.confidence >= HIGH_PARSE_CONFIDENCE,
  };
}

function previewFromApi(payload: ParseApiOk): PreviewState {
  return {
    source: payload.source,
    confidence: payload.confidence,
    needsConfirmation: payload.needsConfirmation,
    interpretation: payload.interpretation,
    status: payload.status,
    primaryId: payload.primaryPlayerId,
    opponentId: payload.opponentPlayerId,
    scoreText: payload.scoreText,
    weight: payload.weight,
    weightFromText: payload.weightFromText,
    playedAt: payload.playedAt,
    dateFromText: payload.dateFromText,
    dateText: payload.dateText,
    sourceText: payload.sourceText,
    confirmed: !payload.needsConfirmation,
  };
}

export default function QuickMatchEntry({
  roster,
  onSaved,
}: {
  roster: RosterPlayer[];
  onSaved: (match: IntraSquadMatch) => void;
}) {
  const [text, setText] = useState("");
  const [weight, setWeight] = useState<IntraSquadWeight>(1);
  const [dateState, setDateState] = useState(freshQuickMatchDateState);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewUnderstanding, setPreviewUnderstanding] = useState(false);
  const [busyPhase, setBusyPhase] = useState<BusyPhase>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const parseSeq = useRef(0);
  const dateValue = resolveQuickMatchDate(dateState);
  const selectedWeightRef = useRef(weight);
  const selectedDateRef = useRef(dateValue);
  selectedWeightRef.current = weight;
  selectedDateRef.current = dateValue;

  const dateLabel = formatPlayedAtLabel(dateValue);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const buttonDisabled = !hasText || busyPhase !== null;

  useLayoutEffect(() => {
    const el = dateInputRef.current;
    if (el && el.value !== dateValue) el.value = dateValue;
  }, [dateValue]);

  // Background preview only — never gates the Add Match button.
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPreview(null);
      setPreviewUnderstanding(false);
      setEditing(false);
      return;
    }

    const seq = ++parseSeq.current;
    const selectedWeight = selectedWeightRef.current;
    const selectedDate = selectedDateRef.current;
    const deterministic = interpretMatchEntry(trimmed, roster, {
      defaultWeight: selectedWeight,
    });

    if ("ok" in deterministic) {
      setPreviewUnderstanding(false);
      setPreview(previewFromDeterministic(deterministic, trimmed, selectedDate));
      setSubmitError(null);
      return;
    }

    if (deterministic.ambiguous) {
      setPreview(null);
      setPreviewUnderstanding(false);
      setSubmitError(deterministic.error);
      return;
    }

    const shouldHide =
      (deterministic.error === PARSE_ERROR_HINT && !LOOKS_LIKE_RESULT.test(trimmed)) ||
      (deterministic.error === SCORE_FORMAT_HINT && !/\d/.test(trimmed));
    if (shouldHide) {
      setPreview(null);
      setPreviewUnderstanding(false);
      setSubmitError(null);
      return;
    }

    if (
      !/Couldn’t determine|Add the current score|tied/i.test(deterministic.error) &&
      deterministic.error !== PARSE_ERROR_HINT
    ) {
      setPreview(null);
      setPreviewUnderstanding(false);
      setSubmitError(deterministic.error);
      return;
    }

    setPreviewUnderstanding(true);
    setPreview(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/team-operations/intra-squad/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            selectedDate,
            selectedWeight,
          }),
        });
        const payload = (await response.json()) as ParseApiOk | { ok: false; error: string };
        if (seq !== parseSeq.current) return;
        setPreviewUnderstanding(false);
        if (!payload.ok) {
          setPreview(null);
          setSubmitError(payload.error || AI_PARSE_UNAVAILABLE);
          return;
        }
        setSubmitError(null);
        const next = previewFromApi(payload);
        setPreview(next);
        if (payload.dateFromText) {
          setDateState({ playedAt: payload.playedAt, dateTouched: true });
        }
        if (payload.weightFromText) {
          setWeight(payload.weight);
        }
      } catch {
        if (seq !== parseSeq.current) return;
        setPreviewUnderstanding(false);
        setPreview(null);
        setSubmitError(AI_PARSE_UNAVAILABLE);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [text, roster]);

  async function savePreview(next: PreviewState) {
    setBusyPhase("saving");
    const result = await saveValidatedQuickMatchAction({
      sourceText: next.sourceText || text.trim(),
      status: next.status,
      playedAt: next.playedAt,
      primaryPlayerId: next.primaryId,
      opponentPlayerId: next.opponentId,
      scoreText: next.scoreText,
      weight: next.weight,
    });
    setBusyPhase(null);
    submitLockRef.current = false;

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }

    onSaved(result.match);
    setText("");
    setWeight(1);
    setDateState(freshQuickMatchDateState());
    setPreview(null);
    setEditing(false);
    setSubmitError(null);
  }

  async function parseViaApi(
    trimmed: string,
    selectedDate: string,
    selectedWeight: IntraSquadWeight,
  ): Promise<PreviewState | { error: string }> {
    try {
      const response = await fetch("/api/team-operations/intra-squad/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          selectedDate,
          selectedWeight,
        }),
      });
      const payload = (await response.json()) as ParseApiOk | { ok: false; error: string };
      if (!payload.ok) return { error: payload.error || AI_PARSE_UNAVAILABLE };
      return previewFromApi(payload);
    } catch {
      return { error: AI_PARSE_UNAVAILABLE };
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLockRef.current) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitError(null);

    // Already confirmed interpretation for this exact text → save immediately.
    if (
      preview &&
      preview.sourceText === trimmed &&
      (!preview.needsConfirmation || preview.confirmed)
    ) {
      submitLockRef.current = true;
      await savePreview(preview);
      return;
    }

    // Clarification already shown for this text — Confirm Match saves it.
    if (preview && preview.sourceText === trimmed && preview.needsConfirmation && !preview.confirmed) {
      const confirmed = { ...preview, confirmed: true };
      setPreview(confirmed);
      submitLockRef.current = true;
      await savePreview(confirmed);
      return;
    }

    submitLockRef.current = true;
    setBusyPhase("understanding");
    parseSeq.current += 1;

    const selectedWeight = weight;
    const selectedDate = dateValue;
    const deterministic = interpretMatchEntry(trimmed, roster, {
      defaultWeight: selectedWeight,
    });

    if ("ok" in deterministic) {
      const next = previewFromDeterministic(deterministic, trimmed, selectedDate);
      setPreview(next);
      setPreviewUnderstanding(false);
      if (next.weightFromText) setWeight(next.weight);
      if (next.dateFromText) {
        setDateState({ playedAt: next.playedAt, dateTouched: true });
      }

      if (next.needsConfirmation && !next.confirmed) {
        setBusyPhase(null);
        submitLockRef.current = false;
        return;
      }

      await savePreview(next);
      return;
    }

    if (deterministic.ambiguous) {
      setBusyPhase(null);
      submitLockRef.current = false;
      setPreview(null);
      setSubmitError(deterministic.error);
      return;
    }

    const shouldAi =
      deterministic.error === PARSE_ERROR_HINT ||
      /Couldn’t determine|Add the current score|tied/i.test(deterministic.error);

    if (!shouldAi) {
      setBusyPhase(null);
      submitLockRef.current = false;
      setPreview(null);
      setSubmitError(deterministic.error);
      return;
    }

    const apiResult = await parseViaApi(trimmed, selectedDate, selectedWeight);
    if ("error" in apiResult) {
      setBusyPhase(null);
      submitLockRef.current = false;
      setPreview(null);
      setSubmitError(apiResult.error);
      return;
    }

    setPreview(apiResult);
    setPreviewUnderstanding(false);
    if (apiResult.weightFromText) setWeight(apiResult.weight);
    if (apiResult.dateFromText) {
      setDateState({ playedAt: apiResult.playedAt, dateTouched: true });
    }

    if (apiResult.needsConfirmation && !apiResult.confirmed) {
      setBusyPhase(null);
      submitLockRef.current = false;
      return;
    }

    await savePreview(apiResult);
  }

  const primary = preview ? playerById(roster, preview.primaryId) : null;
  const opponent = preview ? playerById(roster, preview.opponentId) : null;
  const previewDateLabel = preview ? formatPlayedAtLabel(preview.playedAt) : dateLabel;
  const showConfirmActions = Boolean(preview?.needsConfirmation && !preview.confirmed);
  const addMatchLabel =
    busyPhase === "understanding"
      ? "Understanding..."
      : busyPhase === "saving"
        ? "Adding..."
        : showConfirmActions
          ? "Confirm Match"
          : "Add Match";

  return (
    <section data-intra-squad-section="quick-entry" className={styles.card}>
      <span aria-hidden="true" className={styles.cardAccent} />
      <form data-intra-squad-quick-form="" onSubmit={onSubmit} className={`${styles.cardBody} gap-3`}>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Quick Match Entry (Natural Language)</h2>
          <p className="mt-0.5 text-xs leading-snug text-text-secondary">
            Type results the way you’d say them. Examples:
          </p>
          <div className={styles.chips}>
            {EXAMPLE_RESULTS.map((example) => (
              <button
                key={example}
                type="button"
                className={styles.chip}
                onClick={() => {
                  setText(example);
                  setEditing(false);
                  setSubmitError(null);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <label className="block min-w-0">
          <span className="sr-only">Match result</span>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setEditing(false);
              setSubmitError(null);
            }}
            rows={3}
            placeholder="Enter match result..."
            className={styles.textarea}
          />
        </label>

        <div className={styles.dateRow}>
          <span className="text-xs font-semibold text-text-secondary">Match Date</span>
          <span data-intra-squad-date-label="" className="text-sm text-text-primary">
            {preview?.dateFromText ? previewDateLabel : dateLabel}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            name="intra-squad-quick-match-date"
            data-intra-squad-date-input=""
            autoComplete="off"
            key={dateState.dateTouched ? `custom-${dateState.playedAt}` : `today-${dateValue}`}
            value={preview?.dateFromText ? preview.playedAt : dateValue}
            onChange={(event) => {
              const next = event.target.value;
              if (!next) {
                setDateState(freshQuickMatchDateState());
                return;
              }
              setDateState({ playedAt: next, dateTouched: next !== todayLocalIsoDate() });
              setPreview((current) =>
                current ? { ...current, playedAt: next, dateFromText: true, dateText: next } : current,
              );
            }}
            className={styles.dateInput}
            aria-label="Match date"
          />
        </div>

        <div data-intra-squad-weight-controls="" className={styles.controls}>
          <div className={styles.weightCluster}>
            <p className="text-xs font-semibold text-text-secondary">Weight</p>
            <div className={styles.weightButtons} role="group" aria-label="Match weight">
              {WEIGHTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setWeight(value);
                    setPreview((current) =>
                      current ? { ...current, weight: value, weightFromText: false } : current,
                    );
                  }}
                  aria-pressed={(preview?.weight ?? weight) === value}
                  className={styles.weightBtn}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-secondary">Impact on rankings</p>
          </div>

          <button
            type="submit"
            data-intra-squad-add-match=""
            disabled={buttonDisabled}
            className={styles.addMatch}
          >
            {addMatchLabel}
          </button>
        </div>

        {previewUnderstanding && busyPhase === null ? (
          <p data-intra-squad-understanding="" className={styles.understanding}>
            Understanding match...
          </p>
        ) : null}

        {preview && primary && opponent && !editing ? (
          <div data-intra-squad-parse-preview="" className={styles.previewCard}>
            {showConfirmActions ? <p className={styles.previewHint}>I think you mean…</p> : null}
            <p className={styles.previewStatus}>
              {preview.status === "unfinished" ? "Unfinished" : "Completed"}
            </p>
            <p className={styles.previewHeadline}>
              {preview.status === "unfinished"
                ? `${rosterPlayerShortName(primary, roster)} leading ${rosterPlayerShortName(opponent, roster)}`
                : `${rosterPlayerShortName(primary, roster)} def. ${rosterPlayerShortName(opponent, roster)}`}
            </p>
            <p className={styles.previewScore}>{preview.scoreText}</p>
            <p className={styles.previewMeta}>
              Weight {preview.weight}
              {preview.weightFromText ? " (from text)" : ""}
              {"   ·   "}
              {previewDateLabel}
              {preview.dateFromText ? " (from text)" : ""}
            </p>
            <p className={styles.previewCredit}>
              {preview.status === "unfinished" ? "Partial credit" : "Ranking credit"}:{" "}
              {rosterPlayerShortName(primary, roster)}{" "}
              {formatSignedCredit(
                rankingCreditForOutcome(preview.status === "unfinished" ? "leading" : "W", preview.weight),
              )}
              {" · "}
              {rosterPlayerShortName(opponent, roster)}{" "}
              {formatSignedCredit(
                rankingCreditForOutcome(preview.status === "unfinished" ? "trailing" : "L", preview.weight),
              )}
            </p>
            <div className={styles.previewActions}>
              {showConfirmActions ? (
                <>
                  <button
                    type="button"
                    data-intra-squad-use-interpretation=""
                    className="h-8 rounded-control bg-[var(--module-accent)] px-2.5 text-xs font-semibold text-white"
                    onClick={() => {
                      const confirmed = { ...preview, confirmed: true };
                      setPreview(confirmed);
                      setSubmitError(null);
                      void (async () => {
                        if (submitLockRef.current) return;
                        submitLockRef.current = true;
                        await savePreview(confirmed);
                      })();
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-control border border-border px-2.5 text-xs font-semibold"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-intra-squad-edit-interpretation=""
                  className="h-8 rounded-control border border-border px-2.5 text-xs font-semibold"
                  onClick={() => setEditing(true)}
                >
                  Edit Interpretation
                </button>
              )}
            </div>
          </div>
        ) : null}

        {preview && editing ? (
          <div data-intra-squad-edit-interpretation="" className={styles.editPanel}>
            <label>
              Status
              <select
                className={styles.editControl}
                value={preview.status}
                onChange={(event) =>
                  setPreview({ ...preview, status: event.target.value as MatchStatus, confirmed: true })
                }
              >
                {MATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "unfinished" ? "Unfinished" : "Completed"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Weight
              <select
                className={styles.editControl}
                value={preview.weight}
                onChange={(event) =>
                  setPreview({
                    ...preview,
                    weight: Number(event.target.value) as IntraSquadWeight,
                    weightFromText: false,
                    confirmed: true,
                  })
                }
              >
                {INTRA_SQUAD_WEIGHTS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {preview.status === "unfinished" ? "Leader" : "Winner"}
              <select
                className={styles.editControl}
                value={preview.primaryId}
                onChange={(event) =>
                  setPreview({ ...preview, primaryId: event.target.value, confirmed: true })
                }
              >
                {roster.map((player) => (
                  <option key={player.id} value={player.id}>
                    {rosterPlayerFullName(player)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {preview.status === "unfinished" ? "Trailing" : "Loser"}
              <select
                className={styles.editControl}
                value={preview.opponentId}
                onChange={(event) =>
                  setPreview({ ...preview, opponentId: event.target.value, confirmed: true })
                }
              >
                {roster.map((player) => (
                  <option key={player.id} value={player.id}>
                    {rosterPlayerFullName(player)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.span2}>
              Score
              <input
                className={styles.editControl}
                value={preview.scoreText}
                onChange={(event) =>
                  setPreview({ ...preview, scoreText: event.target.value, confirmed: true })
                }
              />
            </label>
            <label className={styles.span2}>
              Date
              <input
                type="date"
                className={styles.editControl}
                value={preview.playedAt}
                onChange={(event) => {
                  const next = event.target.value;
                  setPreview({ ...preview, playedAt: next, dateFromText: true, confirmed: true });
                  setDateState({ playedAt: next, dateTouched: true });
                }}
              />
            </label>
            <div className={`${styles.previewActions} ${styles.span2}`}>
              <button
                type="button"
                className="h-8 rounded-control bg-[var(--module-accent)] px-2.5 text-xs font-semibold text-white"
                onClick={() => setEditing(false)}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <p data-intra-squad-parse-error="" className={styles.entryError}>
            {submitError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
