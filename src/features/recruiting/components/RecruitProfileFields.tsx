"use client";

/**
 * Recruit Profile inline-edit session — same InlineEditCell + server-action
 * path as List / Rank / Commit. Does not invent a workspace-only form.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  InlineEditCell,
  type InlineCommitReason,
  type InlineDensity,
  type InlineEmphasis,
  type InlineFieldType,
  type InlineSelectOption,
} from "@/components/inline-edit";
import type { LookupSeedRow } from "@/features/lookups/seed";

import { updateRecruitProfileAction } from "../actions";
import {
  applyVisitDateSaveResult,
  calendarDateOnly,
  persistVisitDateField,
  type PersistVisitDateResult,
} from "../visitDays";
import { VisitDateField } from "./VisitDateField";
import {
  GETABILITY_SELECT_OPTIONS,
  INTEREST_SELECT_OPTIONS,
  OUTCOME_SELECT_OPTIONS,
  PIPELINE_SELECT_OPTIONS,
  PREREAD_SELECT_OPTIONS,
  PRIORITY_SELECT_OPTIONS,
  RECRUIT_TYPE_SELECT_OPTIONS,
  lookupRefFromSeed,
} from "../directoryInline";
import {
  RECRUIT_GETABILITY_SEED,
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PREREAD_SEED,
  RECRUIT_PRIORITY_SEED,
  RECRUIT_TYPE_SEED,
} from "../lookupSeed";
import { parseRecruitTier, TIER_DETAIL_SELECT_OPTIONS } from "../tier";
import type { RecruitProfile, RecruitProfileWritePatch } from "../types";

export type RecruitProfileEditableField =
  | "recruitTypeId"
  | "pipelineStageId"
  | "priorityId"
  | "interestId"
  | "outcomeId"
  | "getabilityId"
  | "prereadStatusId"
  | "prereadScholarshipAmount"
  | "recruitClassYear"
  | "tier"
  | "academicInterests"
  | "schoolsOfInterest"
  | "schoolChosen"
  | "gpa"
  | "sat"
  | "act"
  | "notes"
  | "gameNotes"
  | "keyPitchAngle"
  | "focus"
  | "visitStartDate"
  | "visitEndDate"
  | "travelType"
  | "flightInfo";

const LOOKUP_FIELD: Record<
  | "recruitTypeId"
  | "pipelineStageId"
  | "priorityId"
  | "interestId"
  | "outcomeId"
  | "getabilityId"
  | "prereadStatusId",
  {
    refKey:
      | "recruitType"
      | "pipelineStage"
      | "priority"
      | "interest"
      | "outcome"
      | "getability"
      | "prereadStatus";
    seed: readonly LookupSeedRow[];
    options: InlineSelectOption[];
  }
> = {
  recruitTypeId: {
    refKey: "recruitType",
    seed: RECRUIT_TYPE_SEED,
    options: RECRUIT_TYPE_SELECT_OPTIONS,
  },
  pipelineStageId: {
    refKey: "pipelineStage",
    seed: RECRUIT_PIPELINE_SEED,
    options: PIPELINE_SELECT_OPTIONS,
  },
  priorityId: {
    refKey: "priority",
    seed: RECRUIT_PRIORITY_SEED,
    options: PRIORITY_SELECT_OPTIONS,
  },
  interestId: {
    refKey: "interest",
    seed: RECRUIT_INTEREST_SEED,
    options: INTEREST_SELECT_OPTIONS,
  },
  outcomeId: {
    refKey: "outcome",
    seed: RECRUIT_OUTCOME_SEED,
    options: OUTCOME_SELECT_OPTIONS,
  },
  getabilityId: {
    refKey: "getability",
    seed: RECRUIT_GETABILITY_SEED,
    options: GETABILITY_SELECT_OPTIONS,
  },
  prereadStatusId: {
    refKey: "prereadStatus",
    seed: RECRUIT_PREREAD_SEED,
    options: PREREAD_SELECT_OPTIONS,
  },
};

const BOOLEAN_OPTIONS: InlineSelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const TRAVEL_TYPE_OPTIONS: InlineSelectOption[] = [
  { value: "Flight", label: "Flight" },
  { value: "Drive", label: "Drive" },
  { value: "Other", label: "Other" },
];

export type RecruitProfileEditSlot = "workspace" | "summary";

type EditingCell = {
  field: RecruitProfileEditableField;
  slot: RecruitProfileEditSlot;
};

type SessionValue = {
  profile: RecruitProfile;
  isEditing: (field: RecruitProfileEditableField, slot?: RecruitProfileEditSlot) => boolean;
  errorFor: (field: RecruitProfileEditableField, slot?: RecruitProfileEditSlot) => string | undefined;
  startEdit: (field: RecruitProfileEditableField, slot?: RecruitProfileEditSlot) => void;
  cancelEdit: () => void;
  commit: (
    field: RecruitProfileEditableField,
    raw: string,
    reason: InlineCommitReason,
  ) => Promise<void>;
  saveVisitDate: (
    field: "visitStartDate" | "visitEndDate",
    raw: string,
  ) => Promise<PersistVisitDateResult>;
};

const RecruitProfileFieldContext = createContext<SessionValue | null>(null);

export function useRecruitProfileFieldSession(): SessionValue {
  const ctx = useContext(RecruitProfileFieldContext);
  if (!ctx) {
    throw new Error("RecruitProfileField must be used within RecruitProfileFieldSession.");
  }
  return ctx;
}

export function RecruitProfileFieldSession({
  profile,
  onProfileChange,
  runSave,
  children,
}: {
  profile: RecruitProfile;
  onProfileChange: (profile: RecruitProfile) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const pendingVisitRef = useRef(new Set<string>());

  const startEdit = useCallback((
    field: RecruitProfileEditableField,
    slot: RecruitProfileEditSlot = "workspace",
  ) => {
    setFieldError(undefined);
    setEditing({ field, slot });
  }, []);

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const saveVisitDate = useCallback(
    async (field: "visitStartDate" | "visitEndDate", raw: string) => {
      const current = profileRef.current;
      const previousValue = current[field];
      pendingVisitRef.current.add(field);
      const result = await persistVisitDateField({
        personId: current.personId,
        field,
        raw,
        currentStored: calendarDateOnly(current[field]) ?? "",
        visitStartDate: current.visitStartDate,
        visitEndDate: current.visitEndDate,
        update: async (personId, patch) => {
          const written =
            field === "visitStartDate"
              ? (patch as { visitStartDate: string | null }).visitStartDate
              : (patch as { visitEndDate: string | null }).visitEndDate;
          onProfileChange({
            ...profileRef.current,
            [field]: written || undefined,
          });
          let saved: RecruitProfile | undefined;
          const ok = await runSave(async () => {
            const actionResult = await updateRecruitProfileAction(personId, patch);
            if (!actionResult.success) throw new Error(actionResult.error);
            saved = actionResult.profile;
          });
          if (!ok || !saved) {
            return { success: false as const, error: "We couldn't save your changes. Please try again." };
          }
          return { success: true as const, profile: saved };
        },
      });
      if (result.status === "invalid" || result.status === "skipped") {
        pendingVisitRef.current.delete(field);
        return result;
      }
      pendingVisitRef.current.delete(field);
      if (result.status === "failed") {
        onProfileChange({ ...profileRef.current, [field]: previousValue });
        return result;
      }
      onProfileChange(
        applyVisitDateSaveResult(
          result.profile,
          profileRef.current,
          field,
          "visitStartDate" in result.patch
            ? result.patch.visitStartDate
            : result.patch.visitEndDate,
          pendingVisitRef.current,
        ),
      );
      return result;
    },
    [onProfileChange, runSave],
  );

  const commit = useCallback(
    async (
      field: RecruitProfileEditableField,
      raw: string,
      reason: InlineCommitReason,
    ) => {
      const finish = () => {
        if (reason === "tab" || reason === "shift-tab") {
          setEditing(null);
          return;
        }
        setEditing(null);
      };

      const lookup = field in LOOKUP_FIELD ? LOOKUP_FIELD[field as keyof typeof LOOKUP_FIELD] : undefined;
      if (lookup) {
        const currentId = (profile[field] as string | undefined) ?? "";
        if (raw === currentId) {
          finish();
          return;
        }
        const previous = profile;
        const optimistic: RecruitProfile = {
          ...profile,
          [field]: raw || undefined,
          [lookup.refKey]: raw ? lookupRefFromSeed(lookup.seed, raw) : undefined,
        };
        onProfileChange(optimistic);
        finish();
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(profile.personId, {
            [field]: raw || null,
          });
          if (!result.success) throw new Error(result.error);
          onProfileChange(result.profile);
        });
        if (!ok) onProfileChange(previous);
        return;
      }

      if (field === "visitStartDate" || field === "visitEndDate") {
        const result = await saveVisitDate(field, raw);
        if (result.status === "invalid") {
          setFieldError(result.error);
          return;
        }
        finish();
        return;
      }

      if (field === "tier") {
        const parsed = parseRecruitTier(raw);
        if (parsed === undefined) {
          setFieldError("Tier must be 1–5 or Unassigned.");
          return;
        }
        const currentTier = profile.tier ?? null;
        if (currentTier === parsed) {
          finish();
          return;
        }
        const previous = profile;
        onProfileChange({
          ...profile,
          tier: parsed === null ? undefined : parsed,
        });
        finish();
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(profile.personId, {
            tier: parsed,
          });
          if (!result.success) throw new Error(result.error);
          onProfileChange(result.profile);
        });
        if (!ok) onProfileChange(previous);
        return;
      }

      if (field === "travelType") {
        const next = raw.trim();
        if (next && !TRAVEL_TYPE_OPTIONS.some((option) => option.value === next)) {
          setFieldError("Travel type must be Flight, Drive, or Other.");
          return;
        }
        const current = profile.travelType ?? "";
        if (next === current) {
          finish();
          return;
        }
        const previous = profile;
        onProfileChange({ ...profile, travelType: next || undefined });
        finish();
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(profile.personId, {
            travelType: next || null,
          });
          if (!result.success) throw new Error(result.error);
          onProfileChange(result.profile);
        });
        if (!ok) onProfileChange(previous);
        return;
      }

      if (field === "focus") {
        const next = raw === "true";
        if (Boolean(profile.focus) === next) {
          finish();
          return;
        }
        const previous = profile;
        onProfileChange({ ...profile, focus: next });
        finish();
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(profile.personId, { focus: next });
          if (!result.success) throw new Error(result.error);
          onProfileChange(result.profile);
        });
        if (!ok) onProfileChange(previous);
        return;
      }

      if (
        field === "recruitClassYear" ||
        field === "sat" ||
        field === "act" ||
        field === "prereadScholarshipAmount"
      ) {
        const trimmed = raw.trim();
        const integerOnly = field !== "prereadScholarshipAmount";
        const next =
          trimmed === ""
            ? null
            : (() => {
                const parsed = Number(trimmed.replace(/[$,]/g, ""));
                if (!Number.isFinite(parsed)) return Number.NaN;
                if (integerOnly && !Number.isInteger(parsed)) return Number.NaN;
                return parsed;
              })();
        if (Number.isNaN(next as number)) {
          setFieldError(
            field === "recruitClassYear"
              ? "Class year must be a whole number."
              : field === "prereadScholarshipAmount"
                ? "Preread $ must be a number."
                : `${field === "sat" ? "SAT" : "ACT"} must be a whole number.`,
          );
          return;
        }
        const current =
          field === "recruitClassYear"
            ? (profile.recruitClassYear ?? null)
            : field === "sat"
              ? (profile.sat ?? null)
              : field === "act"
                ? (profile.act ?? null)
                : (profile.prereadScholarshipAmount ?? null);
        if (current === next) {
          finish();
          return;
        }
        const previous = profile;
        const optimistic: RecruitProfile = {
          ...profile,
          [field]: next === null ? undefined : next,
          ...(field === "recruitClassYear" ? { coachRank: undefined } : {}),
        };
        onProfileChange(optimistic);
        finish();
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(profile.personId, {
            [field]: next,
          } as RecruitProfileWritePatch);
          if (!result.success) throw new Error(result.error);
          onProfileChange(result.profile);
        });
        if (!ok) onProfileChange(previous);
        return;
      }

      const currentText = (profile[field] as string | undefined) ?? "";
      const nextText = raw.trim();
      if (nextText === currentText) {
        finish();
        return;
      }
      const previous = profile;
      onProfileChange({
        ...profile,
        [field]: nextText || undefined,
      });
      finish();
      const ok = await runSave(async () => {
        const result = await updateRecruitProfileAction(profile.personId, {
          [field]: nextText || null,
        } as RecruitProfileWritePatch);
        if (!result.success) throw new Error(result.error);
        onProfileChange(result.profile);
      });
      if (!ok) onProfileChange(previous);
    },
    [onProfileChange, profile, runSave, saveVisitDate],
  );

  const value = useMemo<SessionValue>(
    () => ({
      profile,
      isEditing: (field, slot = "workspace") =>
        editing?.field === field && editing.slot === slot,
      errorFor: (field, slot = "workspace") =>
        editing?.field === field && editing.slot === slot ? fieldError : undefined,
      startEdit,
      cancelEdit,
      commit,
      saveVisitDate,
    }),
    [cancelEdit, commit, editing, fieldError, profile, saveVisitDate, startEdit],
  );

  return (
    <RecruitProfileFieldContext.Provider value={value}>
      {children}
    </RecruitProfileFieldContext.Provider>
  );
}

function formatPrereadAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function RecruitProfileField({
  field,
  label,
  type = "text",
  align = "right",
  emphasis = "workspace",
  density = "compact",
  slot = "workspace",
  rows,
  className,
  renderDisplay,
}: {
  field: RecruitProfileEditableField;
  label: string;
  type?: InlineFieldType;
  align?: "left" | "right";
  emphasis?: InlineEmphasis;
  density?: InlineDensity;
  slot?: RecruitProfileEditSlot;
  rows?: number;
  className?: string;
  renderDisplay?: ReactNode;
}) {
  const session = useRecruitProfileFieldSession();
  if (field === "visitStartDate" || field === "visitEndDate") {
    return (
      <VisitDateField
        field={field}
        label={label}
        profile={session.profile}
        saveVisitDate={session.saveVisitDate}
      />
    );
  }
  const lookup = field in LOOKUP_FIELD ? LOOKUP_FIELD[field as keyof typeof LOOKUP_FIELD] : undefined;

  let value = "";
  let displayValue: string | undefined;
  let options: InlineSelectOption[] | undefined;
  let resolvedType: InlineFieldType = type;

  if (lookup) {
    resolvedType = "select";
    options = lookup.options;
    value = (session.profile[field] as string | undefined) ?? "";
    displayValue = session.profile[lookup.refKey]?.label;
  } else if (field === "focus") {
    resolvedType = "select";
    options = BOOLEAN_OPTIONS;
    value = session.profile.focus ? "true" : "false";
    displayValue = session.profile.focus ? "Yes" : "No";
  } else if (field === "travelType") {
    resolvedType = "select";
    options = TRAVEL_TYPE_OPTIONS;
    value = session.profile.travelType ?? "";
    displayValue = session.profile.travelType;
  } else if (field === "tier") {
    resolvedType = "select";
    options = [...TIER_DETAIL_SELECT_OPTIONS];
    value = session.profile.tier != null ? String(session.profile.tier) : "";
    displayValue =
      session.profile.tier != null ? `Tier ${session.profile.tier}` : "Unassigned";
  } else if (
    field === "recruitClassYear" ||
    field === "sat" ||
    field === "act" ||
    field === "prereadScholarshipAmount"
  ) {
    const numeric = session.profile[field];
    value = numeric !== undefined ? String(numeric) : "";
    displayValue =
      field === "prereadScholarshipAmount" && numeric !== undefined
        ? formatPrereadAmount(numeric)
        : value;
  } else {
    value = (session.profile[field] as string | undefined) ?? "";
    displayValue = value;
  }

  return (
    <InlineEditCell
      label={label}
      type={resolvedType}
      options={options}
      value={value}
      displayValue={displayValue}
      align={align}
      editOn="click"
      emphasis={emphasis}
      density={density}
      rows={rows}
      className={className}
      renderDisplay={renderDisplay}
      editing={session.isEditing(field, slot)}
      error={session.errorFor(field, slot)}
      onRequestEdit={() => session.startEdit(field, slot)}
      onCancel={session.cancelEdit}
      onCommit={(raw, reason) => session.commit(field, raw, reason)}
    />
  );
}
