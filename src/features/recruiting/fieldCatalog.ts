/**
 * Recruit Profile field catalog (BP-043C).
 *
 * Recruiting-only metadata. Do not merge into PERSON_FIELD_CATALOG — Player,
 * Coach, and Family Adaptive Workspaces must not pick these up.
 */

import type { FieldType } from "@/features/field-engine/types";

import type { RecruitProfile } from "./types";

export type RecruitProfileFieldSection =
  | "system"
  | "classification"
  | "evaluation"
  | "academic"
  | "admissions"
  | "intelligence"
  | "visit"
  | "source";

export type RecruitProfileFieldDefinition = {
  key: keyof RecruitProfile;
  label: string;
  section: RecruitProfileFieldSection;
  type: FieldType;
  required?: boolean;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  description?: string;
  dbColumn?: string;
};

export const RECRUIT_PROFILE_FIELD_CATALOG: readonly RecruitProfileFieldDefinition[] = [
  {
    key: "id",
    label: "ID",
    section: "system",
    type: "system",
    editable: false,
    exportable: true,
    dbColumn: "id",
  },
  {
    key: "personId",
    label: "Person",
    section: "system",
    type: "relationship",
    editable: false,
    exportable: true,
    dbColumn: "person_id",
    description: "Person this recruiting profile belongs to. One profile per Person.",
  },
  {
    key: "createdAt",
    label: "Created",
    section: "system",
    type: "system",
    editable: false,
    exportable: true,
    dbColumn: "created_at",
  },
  {
    key: "updatedAt",
    label: "Updated",
    section: "system",
    type: "system",
    editable: false,
    exportable: true,
    dbColumn: "updated_at",
  },

  {
    key: "recruitTypeId",
    label: "Recruit Type",
    section: "classification",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "recruit_type_id",
    description: "High School / Transfer / International. Independent of pipeline.",
  },
  {
    key: "pipelineStageId",
    label: "Pipeline Stage",
    section: "classification",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "pipeline_stage_id",
    description: "Recruiting workflow position. Independent of interest and outcome.",
  },
  {
    key: "interestId",
    label: "Interest",
    section: "classification",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "interest_id",
    description: "Recruit interest only. Not contact state and not outcome.",
  },
  {
    key: "outcomeId",
    label: "Outcome",
    section: "classification",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "outcome_id",
    description: "Terminal result. Null means none.",
  },
  {
    key: "codaPipelineStage",
    label: "Coda Pipeline Stage",
    section: "source",
    type: "text",
    editable: false,
    exportable: true,
    dbColumn: "coda_pipeline_stage",
    description: "Lossless Coda Pipeline Stage string.",
  },
  {
    key: "codaInterest",
    label: "Coda Interest",
    section: "source",
    type: "text",
    editable: false,
    exportable: true,
    dbColumn: "coda_interest",
    description: "Lossless Coda Interest string (overloaded in source).",
  },

  {
    key: "priorityId",
    label: "Priority",
    section: "evaluation",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "priority_id",
    description: "Coach priority. Not calculated Tier.",
  },
  {
    key: "getabilityId",
    label: "Getability",
    section: "evaluation",
    type: "enum",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "getability_id",
  },
  {
    key: "focus",
    label: "Focus",
    section: "evaluation",
    type: "boolean",
    editable: true,
    filterable: true,
    exportable: true,
    dbColumn: "focus",
  },

  {
    key: "recruitClassYear",
    label: "Recruit Class Year",
    section: "academic",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "recruit_class_year",
    description:
      "High school graduation / recruiting class (Coda Class Year). Not Person.classYear (Denison college graduation).",
  },
  {
    key: "coachRank",
    label: "Coach Rank",
    section: "evaluation",
    type: "number",
    editable: false,
    sortable: true,
    filterable: false,
    exportable: true,
    dbColumn: "coach_rank",
    description:
      "Manual preference order within recruit class year. NULL = unranked. Not Priority or Analytics Tier. Mutations use Coach Rank APIs only.",
  },
  {
    key: "tier",
    label: "Tier",
    section: "evaluation",
    type: "number",
    editable: true,
    sortable: true,
    filterable: true,
    exportable: true,
    dbColumn: "tier",
    description:
      "Coach Rank Board tier 1–5. NULL = Unassigned. Not Coach Rank order and not calculated Analytics Tier.",
  },
  {
    key: "gpa",
    label: "GPA",
    section: "academic",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "gpa",
    description: "Recruiting-time GPA. Stored as text to preserve source values like 4.7 w.",
  },
  {
    key: "sat",
    label: "SAT",
    section: "academic",
    type: "number",
    editable: true,
    exportable: true,
    dbColumn: "sat",
  },
  {
    key: "act",
    label: "ACT",
    section: "academic",
    type: "number",
    editable: true,
    exportable: true,
    dbColumn: "act",
  },
  {
    key: "academicInterests",
    label: "Academic Interests",
    section: "academic",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "academic_interests",
  },

  {
    key: "prereadStatusId",
    label: "Preread",
    section: "admissions",
    type: "enum",
    editable: true,
    filterable: true,
    exportable: true,
    dbColumn: "preread_status_id",
  },
  {
    key: "prereadScholarshipAmount",
    label: "Preread $",
    section: "admissions",
    type: "currency",
    editable: true,
    exportable: true,
    dbColumn: "preread_scholarship_amount",
    description:
      "Expected scholarship from the admissions/financial preread. External input; not calculated.",
  },

  {
    key: "schoolsOfInterest",
    label: "Schools of Interest",
    section: "intelligence",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "schools_of_interest",
  },
  {
    key: "schoolChosen",
    label: "School Chosen",
    section: "intelligence",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "school_chosen",
  },
  {
    key: "notes",
    label: "Recruiting Notes",
    section: "intelligence",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "notes",
    description: "Recruiting intelligence. Distinct from Person.notes.",
  },
  {
    key: "gameNotes",
    label: "Game Notes",
    section: "intelligence",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "game_notes",
  },
  {
    key: "keyPitchAngle",
    label: "Key Pitch Angle",
    section: "intelligence",
    type: "longText",
    editable: true,
    exportable: true,
    dbColumn: "key_pitch_angle",
  },

  {
    key: "visitStartDate",
    label: "Visit Start Date",
    section: "visit",
    type: "date",
    editable: true,
    exportable: true,
    dbColumn: "visit_start_date",
  },
  {
    key: "visitEndDate",
    label: "Visit End Date",
    section: "visit",
    type: "date",
    editable: true,
    exportable: true,
    dbColumn: "visit_end_date",
  },
  {
    key: "travelType",
    label: "Travel Type",
    section: "visit",
    type: "enum",
    editable: true,
    exportable: true,
    dbColumn: "travel_type",
  },
  {
    key: "flightInfo",
    label: "Flight Info",
    section: "visit",
    type: "text",
    editable: true,
    exportable: true,
    dbColumn: "flight_info",
  },

  {
    key: "codaRowId",
    label: "Coda Row ID",
    section: "source",
    type: "text",
    editable: false,
    exportable: true,
    dbColumn: "coda_row_id",
  },
  {
    key: "codaExport",
    label: "Coda Export",
    section: "source",
    type: "json",
    editable: false,
    exportable: false,
    dbColumn: "coda_export",
    description: "Complete original Coda row. Do not normalize.",
  },
];

const catalogByKey = new Map<keyof RecruitProfile, RecruitProfileFieldDefinition>(
  RECRUIT_PROFILE_FIELD_CATALOG.map((field) => [field.key, field]),
);

export function getRecruitProfileField(
  key: keyof RecruitProfile,
): RecruitProfileFieldDefinition | undefined {
  return catalogByKey.get(key);
}

export function getRecruitProfileFields(): readonly RecruitProfileFieldDefinition[] {
  return RECRUIT_PROFILE_FIELD_CATALOG;
}

export function getRecruitProfileFieldsBySection(
  section: RecruitProfileFieldSection,
): RecruitProfileFieldDefinition[] {
  return RECRUIT_PROFILE_FIELD_CATALOG.filter((field) => field.section === section);
}

export function getRecruitProfileFieldsWithDbColumn(): RecruitProfileFieldDefinition[] {
  return RECRUIT_PROFILE_FIELD_CATALOG.filter((field) => Boolean(field.dbColumn));
}

export function getWritableRecruitProfileFieldMap(): Partial<
  Record<keyof RecruitProfile, string>
> {
  const map: Partial<Record<keyof RecruitProfile, string>> = {};
  for (const field of getRecruitProfileFieldsWithDbColumn()) {
    if (
      field.key === "id" ||
      field.key === "createdAt" ||
      field.key === "updatedAt" ||
      // Coach Rank mutations go through apply_recruit_class_coach_ranks only.
      field.key === "coachRank"
    ) {
      continue;
    }
    map[field.key] = field.dbColumn;
  }
  return map;
}
