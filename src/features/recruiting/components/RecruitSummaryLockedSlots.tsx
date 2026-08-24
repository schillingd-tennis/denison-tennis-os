"use client";

import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";

import { RecruitProfileField } from "./RecruitProfileFields";

/**
 * LOCKED OS UI CONTRACT — do not modify for feature-specific work.
 *
 * Academic Interests and Schools of Interest exist only in these slots,
 * in the Recruit Card summary academic column. They are not Adaptive
 * Workspace sections. Geometry is `[data-recruit-summary-*]` in
 * `src/app/layout-lock.css`. Do not copy these class names into feature AWs.
 */
export function SummaryField({
  label,
  children,
  className,
  "data-recruit-summary-academic-interests": academicInterestsLock,
  "data-recruit-summary-schools": schoolsLock,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  "data-recruit-summary-academic-interests"?: string;
  "data-recruit-summary-schools"?: string;
}) {
  return (
    <div
      className={`min-w-0 ${className ?? ""}`}
      data-recruit-summary-academic-interests={academicInterestsLock}
      data-recruit-summary-schools={schoolsLock}
    >
      <p className={typeRole.workspaceFieldLabel}>{label}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}

const SUMMARY_TEXT_CLAMP =
  "[&>span]:line-clamp-2 [&>span]:break-words [&>span]:break-normal [&>span]:hyphens-none [&>span]:whitespace-normal md:[&>span]:break-normal";

export function RecruitSummaryAcademicInterestsSlot() {
  return (
    <SummaryField data-recruit-summary-academic-interests="" label="Academic interests">
      <RecruitProfileField
        field="academicInterests"
        label="Academic interests"
        type="textarea"
        align="left"
        slot="summary"
        rows={2}
        className={SUMMARY_TEXT_CLAMP}
      />
    </SummaryField>
  );
}

export function RecruitSummarySchoolsOfInterestSlot() {
  return (
    <SummaryField data-recruit-summary-schools="" label="Schools of interest" className="mt-2.5">
      <RecruitProfileField
        field="schoolsOfInterest"
        label="Schools of interest"
        type="textarea"
        align="left"
        slot="summary"
        rows={2}
        className={SUMMARY_TEXT_CLAMP}
      />
    </SummaryField>
  );
}

export function RecruitSummaryAcademicColumn({ children }: { children?: ReactNode }) {
  return (
    <div
      data-recruit-summary-academic=""
      className="min-w-0"
      aria-label="Academic summary"
    >
      {children ?? (
        <>
          <RecruitSummaryAcademicInterestsSlot />
          <RecruitSummarySchoolsOfInterestSlot />
        </>
      )}
    </div>
  );
}
