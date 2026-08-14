"use client";

import { useState, type FormEvent } from "react";

import { typeRole } from "@/components/typography";
import { createPlayerAction } from "@/features/people/personLifecycleActions";
import type { PlayerStatus } from "@/features/people/types";

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

/**
 * Add Player drawer body (BP-041).
 * Minimal create form — submit lives in content (same pattern as Add Parent).
 */
export default function AddPlayerFlow({ onSuccess }: { onSuccess: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | "">("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);

    let parsedClassYear: number | undefined;
    const classYearTrimmed = classYear.trim();
    if (classYearTrimmed) {
      const value = Number(classYearTrimmed);
      if (!Number.isInteger(value)) {
        setError("Class year must be a whole number.");
        return;
      }
      parsedClassYear = value;
    }

    setSaving(true);
    try {
      const result = await createPlayerAction({
        firstName,
        lastName,
        classYear: parsedClassYear,
        playerStatus: playerStatus || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <p className={typeRole.metadata}>
        Creates a new Player on the Team. Required fields only — more details can be
        edited after opening the record.
      </p>

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

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button type="submit" className={primaryButtonClass} disabled={saving}>
        {saving ? "Creating…" : "Create Player"}
      </button>
    </form>
  );
}
