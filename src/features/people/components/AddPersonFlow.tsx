"use client";

import { useState, type FormEvent } from "react";

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

const fieldClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-denison-red focus:ring-1 focus:ring-denison-red";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

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
  onSuccess: (personId: string) => void;
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

  const showPlayerFields = roleKey === ROLE_KEYS.player;
  const showCoachFields = roleKey === ROLE_KEYS.coach;
  const showRecruitFields = roleKey === ROLE_KEYS.recruit;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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

    let parsedRecruitClassYear: number | undefined;
    if (showRecruitFields) {
      const classYearTrimmed = recruitClassYear.trim();
      if (classYearTrimmed) {
        const value = Number(classYearTrimmed);
        if (!Number.isInteger(value)) {
          setError("Recruit class year must be a whole number.");
          return;
        }
        parsedRecruitClassYear = value;
      }
    }

    if (showCoachFields && !coachDesignation) {
      setError("Coach designation is required.");
      return;
    }

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
          : roleKey === ROLE_KEYS.coach
            ? await createCoachAction({
                firstName,
                lastName,
                title: coachDesignation as CoachDesignation,
              })
            : await createRecruitAction({
                firstName,
                lastName,
                recruitClassYear: parsedRecruitClassYear,
              });

      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(result.personId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
          <span className={typeRole.sectionLabel}>Recruit Class Year</span>
          <input
            className={fieldClass}
            inputMode="numeric"
            placeholder="Optional HS / recruiting class"
            value={recruitClassYear}
            onChange={(event) => setRecruitClassYear(event.target.value)}
            autoComplete="off"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button type="submit" className={primaryButtonClass} disabled={saving}>
        {saving ? "Creating…" : submitLabel}
      </button>
    </form>
  );
}
