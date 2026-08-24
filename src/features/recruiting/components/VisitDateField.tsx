"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import ValidationMessage from "@/components/editor/ValidationMessage";

import type { RecruitProfile } from "../types";
import { calendarDateOnly } from "../visitDays";
import type { PersistVisitDateResult } from "../visitDays";

/** Compact AW editor chrome matching other Visit field controls. */
const compactDateClassName =
  "w-full min-w-0 rounded-control border border-[var(--module-accent)] bg-surface px-1.5 py-0.5 text-[15px] leading-snug text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]";

export function VisitDateField({
  field,
  label,
  profile,
  saveVisitDate,
}: {
  field: "visitStartDate" | "visitEndDate";
  label: string;
  profile: RecruitProfile;
  saveVisitDate: (
    field: "visitStartDate" | "visitEndDate",
    raw: string,
  ) => Promise<PersistVisitDateResult>;
}) {
  const stored = calendarDateOnly(profile[field]) ?? "";
  const [value, setValue] = useState(stored);
  const [error, setError] = useState<string | undefined>();
  const pendingRef = useRef(false);
  const lastSubmittedRef = useRef(stored);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (pendingRef.current) return;
    const incoming = calendarDateOnly(profile[field]) ?? "";
    setValue(incoming);
    lastSubmittedRef.current = incoming;
  }, [field, profile]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = calendarDateOnly(event.currentTarget.value) ?? "";
    setValue(next);
    setError(undefined);
    if (next === lastSubmittedRef.current) return;
    lastSubmittedRef.current = next;
    pendingRef.current = true;
    const result = await saveVisitDate(field, next);
    pendingRef.current = false;
    if (result.status === "skipped") return;
    if (result.status === "invalid") {
      lastSubmittedRef.current = calendarDateOnly(profileRef.current[field]) ?? "";
      setError(result.error);
      return;
    }
    if (result.status === "failed") {
      const storedValue = calendarDateOnly(profileRef.current[field]) ?? "";
      setValue(storedValue);
      lastSubmittedRef.current = storedValue;
      setError(result.error);
    }
  }

  return (
    <div className="min-w-0">
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={handleChange}
        className={compactDateClassName}
      />
      <ValidationMessage message={error} />
    </div>
  );
}
