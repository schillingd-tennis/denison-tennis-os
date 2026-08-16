"use client";

import { useState, type ReactNode } from "react";

import { typeRole } from "@/components/typography";
import type { LookupSeedRow } from "@/features/lookups/seed";
import type { RecruitAnalyticsResult } from "../analytics/types";
import { updateRecruitProfileAction } from "../actions";
import { getRecruitProfileFieldsBySection } from "../fieldCatalog";
import {
  RECRUIT_GETABILITY_SEED,
  RECRUIT_INTEREST_SEED,
  RECRUIT_OUTCOME_SEED,
  RECRUIT_PIPELINE_SEED,
  RECRUIT_PREREAD_SEED,
  RECRUIT_PRIORITY_SEED,
  RECRUIT_TYPE_SEED,
} from "../lookupSeed";
import type { RecruitProfile, RecruitProfileWritePatch } from "../types";

const fieldClass =
  "w-full rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-denison-red focus:ring-1 focus:ring-denison-red";

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd className="min-w-0 max-w-[60%] text-right">{children}</dd>
    </div>
  );
}

function FieldSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className={typeRole.sectionTitle}>{title}</h3>
      <dl className="mt-3 max-w-xl">{children}</dl>
    </section>
  );
}

function EnumSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly LookupSeedRow[];
  onChange: (id: string) => void;
}) {
  return (
    <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function RecruitingProfileWorkspace({
  profile,
  onProfileChange,
  runSave,
}: {
  profile: RecruitProfile;
  onProfileChange: (profile: RecruitProfile) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(profile);
  if (profile.id !== draft.id || profile.updatedAt !== draft.updatedAt) {
    setDraft(profile);
  }

  async function commit(patch: RecruitProfileWritePatch) {
    const previous = draft;
    await runSave(async () => {
      const result = await updateRecruitProfileAction(profile.personId, patch);
      if (!result.success) throw new Error(result.error);
      onProfileChange(result.profile);
      setDraft(result.profile);
    }).then((ok) => {
      if (!ok) setDraft(previous);
    });
  }

  return (
    <div className="space-y-6">
      <FieldSection title="Classification">
        {getRecruitProfileFieldsBySection("classification")
          .filter((field) => field.editable)
          .map((field) => {
            if (field.key === "recruitTypeId") {
              return (
                <FieldRow key={field.key} label={field.label}>
                  <EnumSelect
                    value={draft.recruitTypeId ?? ""}
                    options={RECRUIT_TYPE_SEED}
                    onChange={(id) => void commit({ recruitTypeId: id || null })}
                  />
                </FieldRow>
              );
            }
            if (field.key === "pipelineStageId") {
              return (
                <FieldRow key={field.key} label={field.label}>
                  <EnumSelect
                    value={draft.pipelineStageId ?? ""}
                    options={RECRUIT_PIPELINE_SEED}
                    onChange={(id) => void commit({ pipelineStageId: id || null })}
                  />
                </FieldRow>
              );
            }
            if (field.key === "interestId") {
              return (
                <FieldRow key={field.key} label={field.label}>
                  <EnumSelect
                    value={draft.interestId ?? ""}
                    options={RECRUIT_INTEREST_SEED}
                    onChange={(id) => void commit({ interestId: id || null })}
                  />
                </FieldRow>
              );
            }
            if (field.key === "outcomeId") {
              return (
                <FieldRow key={field.key} label={field.label}>
                  <EnumSelect
                    value={draft.outcomeId ?? ""}
                    options={RECRUIT_OUTCOME_SEED}
                    onChange={(id) => void commit({ outcomeId: id || null })}
                  />
                </FieldRow>
              );
            }
            return null;
          })}
      </FieldSection>

      <FieldSection title="Evaluation">
        <FieldRow label="Priority">
          <EnumSelect
            value={draft.priorityId ?? ""}
            options={RECRUIT_PRIORITY_SEED}
            onChange={(id) => void commit({ priorityId: id || null })}
          />
        </FieldRow>
        <FieldRow label="Getability">
          <EnumSelect
            value={draft.getabilityId ?? ""}
            options={RECRUIT_GETABILITY_SEED}
            onChange={(id) => void commit({ getabilityId: id || null })}
          />
        </FieldRow>
        <FieldRow label="Focus">
          <input
            type="checkbox"
            checked={Boolean(draft.focus)}
            onChange={(event) => void commit({ focus: event.target.checked })}
          />
        </FieldRow>
      </FieldSection>

      <FieldSection title="Academic">
        <FieldRow label="Recruit Class Year">
          <input
            className={fieldClass}
            inputMode="numeric"
            defaultValue={draft.recruitClassYear ?? ""}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              if (!raw) {
                if (draft.recruitClassYear !== undefined) void commit({ recruitClassYear: null });
                return;
              }
              const year = Number(raw);
              if (!Number.isInteger(year) || year === draft.recruitClassYear) return;
              void commit({ recruitClassYear: year });
            }}
          />
        </FieldRow>
        <FieldRow label="GPA">
          <input
            className={fieldClass}
            defaultValue={draft.gpa ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if ((draft.gpa ?? null) === next) return;
              void commit({ gpa: next });
            }}
          />
        </FieldRow>
        <FieldRow label="SAT">
          <input
            className={fieldClass}
            inputMode="numeric"
            defaultValue={draft.sat ?? ""}
            onBlur={(event) => {
              const raw = event.target.value.trim();
              if (!raw) {
                if (draft.sat !== undefined) void commit({ sat: null });
                return;
              }
              const sat = Number(raw);
              if (!Number.isInteger(sat) || sat === draft.sat) return;
              void commit({ sat });
            }}
          />
        </FieldRow>
        <FieldRow label="Academic Interests">
          <input
            className={fieldClass}
            defaultValue={draft.academicInterests ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if ((draft.academicInterests ?? null) === next) return;
              void commit({ academicInterests: next });
            }}
          />
        </FieldRow>
      </FieldSection>

      <FieldSection title="Admissions">
        <FieldRow label="Preread">
          <EnumSelect
            value={draft.prereadStatusId ?? ""}
            options={RECRUIT_PREREAD_SEED}
            onChange={(id) => void commit({ prereadStatusId: id || null })}
          />
        </FieldRow>
      </FieldSection>

      <FieldSection title="Intelligence">
        <FieldRow label="Schools of Interest">
          <input
            className={fieldClass}
            defaultValue={draft.schoolsOfInterest ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if ((draft.schoolsOfInterest ?? null) === next) return;
              void commit({ schoolsOfInterest: next });
            }}
          />
        </FieldRow>
        <FieldRow label="School Chosen">
          <input
            className={fieldClass}
            defaultValue={draft.schoolChosen ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if ((draft.schoolChosen ?? null) === next) return;
              void commit({ schoolChosen: next });
            }}
          />
        </FieldRow>
        <FieldRow label="Recruiting Notes">
          <textarea
            className={`${fieldClass} min-h-[4.5rem]`}
            defaultValue={draft.notes ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim() || null;
              if ((draft.notes ?? null) === next) return;
              void commit({ notes: next });
            }}
          />
        </FieldRow>
      </FieldSection>
    </div>
  );
}

export function RecruitingAnalyticsWorkspace({
  analytics,
  inCurrentCohort,
}: {
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
}) {
  if (!inCurrentCohort || !analytics) {
    return (
      <div className="space-y-3">
        <p className={typeRole.metadata}>
          This Person has a historical Recruit Profile. Current recruiting analytics only score
          People with role Recruit. The profile is preserved and is not part of the live WTN pool.
        </p>
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "In analytics pool", value: analytics.inPool ? "Yes (WTN present)" : "No" },
    { label: "Tier", value: analytics.tier ?? "—" },
    { label: "Composite Rank", value: formatMaybe(analytics.compositeRank) },
    { label: "Composite Z", value: formatMaybe(analytics.compositeZ) },
    { label: "Weighted Score", value: formatMaybe(analytics.weightedScore) },
    { label: "Reliability Score", value: formatMaybe(analytics.reliabilityScore) },
    { label: "Reliability", value: formatMaybe(analytics.reliability) },
    { label: "WTN Rank", value: formatMaybe(analytics.wtnRank) },
    { label: "TR Rank", value: formatMaybe(analytics.trRank) },
    { label: "UTR Rank", value: formatMaybe(analytics.utrRank) },
    { label: "WTN Z", value: formatMaybe(analytics.wtnZ) },
    { label: "TR Z", value: formatMaybe(analytics.trZ) },
    { label: "UTR Z", value: formatMaybe(analytics.utrZ) },
    { label: "Adjusted TR Rank", value: formatMaybe(analytics.adjustedTrRank) },
  ];

  return (
    <div className="space-y-3">
      <p className={typeRole.metadata}>
        Computed from current Recruit tennis facts against the current recruiting WTN pool (role
        Recruit + Recruit Profile). Not stored on Person or Recruit Profile.
      </p>
      <dl className="max-w-xl">
        {rows.map((row) => (
          <FieldRow key={row.label} label={row.label}>
            <span className="text-sm font-medium tabular-nums text-text-primary">{row.value}</span>
          </FieldRow>
        ))}
      </dl>
    </div>
  );
}

function formatMaybe(value: number | undefined): string {
  if (value === undefined) return "—";
  return String(value);
}
