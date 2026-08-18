"use client";

import { useRef, useState, type FormEvent } from "react";

import { moduleFieldClass, modulePrimaryButtonClass } from "@/components/module-theme";
import { typeRole } from "@/components/typography";
import { ROLE_KEYS } from "@/features/lookups/seed";
import {
  createCoachAction,
  createPlayerAction,
  createRecruitAction,
} from "@/features/people/personLifecycleActions";
import {
  COACH_DESIGNATIONS,
  type CoachDesignation,
  type PlayerStatus,
} from "@/features/people/types";

const fieldClass = moduleFieldClass;
const primaryButtonClass = modulePrimaryButtonClass;
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-app-background disabled:cursor-not-allowed disabled:opacity-40";
const cancelButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-text-secondary/60 disabled:cursor-not-allowed disabled:opacity-40";

export type AddPersonCreateIntent = "stay" | "open";

const PLAYER_STATUS_OPTIONS: { value: PlayerStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "injured", label: "Injured" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
];

/** Shared Add Person drawer (BP-041 / BP-042 / BP-045). */
export type AddPersonFlowRoleKey =
  | typeof ROLE_KEYS.player
  | typeof ROLE_KEYS.coach
  | typeof ROLE_KEYS.recruit;

export type AddPersonFlowProps = {
  roleKey: AddPersonFlowRoleKey;
  /** Drawer intro copy. */
  description: string;
  submitLabel: string;
  /** Called with the new Person id after a successful create. */
  onSuccess: (personId: string, intent?: AddPersonCreateIntent) => void;
  onCancel?: () => void;
};

/**
 * Shared Add Person drawer body (BP-041 / BP-042).
 * One form source of truth — roleKey selects create action + optional fields.
 * Submit lives in content (same pattern as Add Parent).
 */
export default function AddPersonFlow({
  roleKey,
  description,
  submitLabel,
  onSuccess,
  onCancel,
}: AddPersonFlowProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | "">("");
  const [coachDesignation, setCoachDesignation] = useState<CoachDesignation | "">(
    "",
  );
  const [recruitClassYear, setRecruitClassYear] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<AddPersonCreateIntent | null>(
    null,
  );
  const submittingRef = useRef(false);

  const showPlayerFields = roleKey === ROLE_KEYS.player;
  const showCoachFields = roleKey === ROLE_KEYS.coach;
  const showRecruitFields = roleKey === ROLE_KEYS.recruit;
  const recruitReady =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    recruitClassYear.trim().length > 0;

  async function submitRecruit(intent: AddPersonCreateIntent) {
    if (submittingRef.current || saving) return;
    setError(undefined);

    const classYearTrimmed = recruitClassYear.trim();
    if (!firstName.trim() || !lastName.trim() || !classYearTrimmed) {
      setError("First name, last name, and class year are required.");
      return;
    }
    const parsedRecruitClassYear = Number(classYearTrimmed);
    if (!Number.isInteger(parsedRecruitClassYear)) {
      setError("Recruit class year must be a whole number.");
      return;
    }

    submittingRef.current = true;
    setPendingIntent(intent);
    setSaving(true);
    try {
      const result = await createRecruitAction({
        firstName,
        lastName,
        recruitClassYear: parsedRecruitClassYear,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(result.personId, intent);
    } finally {
      submittingRef.current = false;
      setSaving(false);
      setPendingIntent(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (showRecruitFields) {
      await submitRecruit("open");
      return;
    }
    setError(undefined);

    let parsedClassYear: number | undefined;
    if (showPlayerFields) {
      const classYearTrimmed = classYear.trim();
      if (classYearTrimmed) {
        const value = Number(classYearTrimmed);
        if (!Number.isInteger(value)) {
          setError("Class year must be a whole number.");
          return;
        }
        parsedClassYear = value;
      }
    }

    if (showCoachFields && !coachDesignation) {
      setError("Coach designation is required.");
      return;
    }

    if (submittingRef.current || saving) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const result =
        roleKey === ROLE_KEYS.player
          ? await createPlayerAction({
              firstName,
              lastName,
              classYear: parsedClassYear,
              playerStatus: playerStatus || undefined,
            })
          : await createCoachAction({
              firstName,
              lastName,
              title: coachDesignation as CoachDesignation,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(result.personId);
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      className={`flex flex-col gap-4 ${showRecruitFields ? "min-h-full" : ""}`}
      onSubmit={handleSubmit}
    >
      <p className={typeRole.metadata}>{description}</p>

      <label className="flex flex-col gap-1.5">
        <span className={typeRole.sectionLabel}>First Name</span>
        <input
          className={fieldClass}
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="off"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={typeRole.sectionLabel}>Last Name</span>
        <input
          className={fieldClass}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="off"
          required
        />
      </label>

      {showPlayerFields ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={typeRole.sectionLabel}>Class Year</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              placeholder="Optional"
              value={classYear}
              onChange={(event) => setClassYear(event.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={typeRole.sectionLabel}>Player Status</span>
            <select
              className={fieldClass}
              value={playerStatus}
              onChange={(event) =>
                setPlayerStatus((event.target.value || "") as PlayerStatus | "")
              }
            >
              <option value="">Optional</option>
              {PLAYER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {showCoachFields ? (
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Coach Designation</span>
          <select
            className={fieldClass}
            value={coachDesignation}
            onChange={(event) =>
              setCoachDesignation(
                (event.target.value || "") as CoachDesignation | "",
              )
            }
            required
          >
            <option value="">Select designation</option>
            {COACH_DESIGNATIONS.map((designation) => (
              <option key={designation} value={designation}>
                {designation}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showRecruitFields ? (
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Class Year</span>
          <input
            className={fieldClass}
            inputMode="numeric"
            placeholder="HS / recruiting class"
            value={recruitClassYear}
            onChange={(event) => setRecruitClassYear(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {showRecruitFields ? (
        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className={cancelButtonClass}
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={saving || !recruitReady}
            onClick={() => void submitRecruit("stay")}
          >
            {saving && pendingIntent === "stay" ? "Creating…" : "Create"}
          </button>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={saving || !recruitReady}
          >
            {saving && pendingIntent === "open" ? "Creating…" : "Create and Open"}
          </button>
        </div>
      ) : (
        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Creating…" : submitLabel}
        </button>
      )}
    </form>
  );
}
