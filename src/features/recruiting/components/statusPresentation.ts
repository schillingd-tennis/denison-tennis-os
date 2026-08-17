/**
 * Recruiting-only status color. Semantic tokens for meaning; Denison crimson
 * for identity / highest-priority. Analytics tiers use research violet.
 * Labels are unchanged — this is presentation only.
 */
import type { RecruitTier } from "../analytics/types";
import {
  RECRUIT_GETABILITY_KEYS,
  RECRUIT_INTEREST_KEYS,
  RECRUIT_OUTCOME_KEYS,
  RECRUIT_PIPELINE_KEYS,
  RECRUIT_PREREAD_KEYS,
  RECRUIT_PRIORITY_KEYS,
} from "../lookupSeed";

export type RecruitStatusTone =
  | "crimson"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "research"
  | "muted";

export const recruitStatusToneClass: Record<RecruitStatusTone, string> = {
  crimson: "bg-[var(--module-tint)] text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/15",
  success: "bg-success/[0.08] text-success ring-1 ring-success/15",
  warning: "bg-warning/[0.12] text-warning ring-1 ring-warning/25",
  danger: "bg-danger/[0.08] text-danger ring-1 ring-danger/15",
  info: "bg-info/[0.08] text-info ring-1 ring-info/15",
  research: "bg-research/[0.08] text-research ring-1 ring-research/15",
  muted: "bg-app-background text-text-secondary ring-1 ring-black/[0.04]",
};

export function pipelineTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_PIPELINE_KEYS.active:
      return "info";
    case RECRUIT_PIPELINE_KEYS.committed:
      return "success";
    case RECRUIT_PIPELINE_KEYS.potential:
      return "warning";
    case RECRUIT_PIPELINE_KEYS.closed:
      return "muted";
    default:
      return "muted";
  }
}

export function priorityTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_PRIORITY_KEYS.elite:
      return "crimson";
    case RECRUIT_PRIORITY_KEYS.significant:
      return "info";
    case RECRUIT_PRIORITY_KEYS.potential:
      return "warning";
    default:
      return "muted";
  }
}

export function interestTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_INTEREST_KEYS.high:
      return "info";
    case RECRUIT_INTEREST_KEYS.medium:
      return "warning";
    case RECRUIT_INTEREST_KEYS.low:
      return "danger";
    default:
      return "muted";
  }
}

export function getabilityTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_GETABILITY_KEYS.highlyLikely:
      return "success";
    case RECRUIT_GETABILITY_KEYS.greatChance:
      return "info";
    case RECRUIT_GETABILITY_KEYS.haveAChance:
      return "warning";
    case RECRUIT_GETABILITY_KEYS.noChance:
      return "danger";
    default:
      return "muted";
  }
}

export function prereadTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_PREREAD_KEYS.green:
      return "success";
    case RECRUIT_PREREAD_KEYS.yellow:
      return "warning";
    default:
      return "muted";
  }
}

export function outcomeTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case RECRUIT_OUTCOME_KEYS.committedDenison:
      return "success";
    case RECRUIT_OUTCOME_KEYS.committedElsewhere:
      return "danger";
    case RECRUIT_OUTCOME_KEYS.noLongerRecruiting:
      return "muted";
    default:
      return "muted";
  }
}

export function tierTone(tier: RecruitTier | undefined): RecruitStatusTone {
  switch (tier) {
    case "1 - Elite":
      return "research";
    case "2 - Strong":
      return "info";
    case "3 - Core":
      return "success";
    case "4 - Fringe":
      return "warning";
    case "5 - Long Shot":
      return "muted";
    default:
      return "muted";
  }
}

export function pipelineCardAccent(
  key: string | undefined,
): "module" | "success" | "warning" | "info" | "neutral" {
  switch (key) {
    case RECRUIT_PIPELINE_KEYS.active:
      return "info";
    case RECRUIT_PIPELINE_KEYS.committed:
      return "success";
    case RECRUIT_PIPELINE_KEYS.potential:
      return "warning";
    default:
      return "neutral";
  }
}
