/**
 * Recruit Profile domain model (BP-043C).
 *
 * A recruit is a Person. This profile is 1:1 with Person and is not a second
 * identity. Calculated Coda analytics are not stored here.
 */
import type { LookupRef } from "@/features/lookups/types";

/**
 * Complete original Coda export row. Keys are Coda column names; values are
 * unnormalized JSON. Do not use `any`.
 */
export type CodaExportPayload = Record<string, unknown>;

export type RecruitProfile = {
  id: string;
  personId: string;
  createdAt: string;
  updatedAt: string;

  recruitTypeId?: string;
  recruitType?: LookupRef;
  pipelineStageId?: string;
  pipelineStage?: LookupRef;
  interestId?: string;
  interest?: LookupRef;
  outcomeId?: string;
  outcome?: LookupRef;

  /** Raw Coda Pipeline Stage (lossless). */
  codaPipelineStage?: string;
  /** Raw Coda Interest (lossless; overloaded in source). */
  codaInterest?: string;

  priorityId?: string;
  priority?: LookupRef;
  getabilityId?: string;
  getability?: LookupRef;
  focus?: boolean;

  /**
   * High school graduation / recruiting class (Coda Class Year).
   * Distinct from Person.classYear (Denison college graduation). BP-043E.
   */
  recruitClassYear?: number;

  /**
   * Coach Rank — manual preference order within recruitClassYear.
   * NULL / undefined = unranked. Dense 1…N when ranked.
   * Independent of Priority, Analytics Tier, TRN, UTR, WTN, Pipeline.
   */
  coachRank?: number;

  gpa?: string;
  sat?: number;
  act?: number;
  academicInterests?: string;

  prereadStatusId?: string;
  prereadStatus?: LookupRef;
  /** Expected scholarship from admissions preread. Input, not calculated. */
  prereadScholarshipAmount?: number;

  schoolsOfInterest?: string;
  schoolChosen?: string;
  notes?: string;
  gameNotes?: string;
  keyPitchAngle?: string;

  codaRowId?: string;
  codaExport?: CodaExportPayload;
};

/**
 * Patch accepted by Recruit Profile writes.
 * `null` clears a nullable column. Do not send `undefined` for clears.
 */
export type RecruitProfileWritePatch = {
  [K in keyof RecruitProfile]?: RecruitProfile[K] | null;
};

export type CreateRecruitProfileInput = {
  personId: string;
} & Omit<RecruitProfileWritePatch, "id" | "personId" | "createdAt" | "updatedAt">;
