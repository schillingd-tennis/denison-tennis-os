import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { RecruitStatusTone } from "@/features/recruiting/components/statusPresentation";

/** Compact pill tones for Person program status (matches Recruit badge system). */
export function personProgramStatusTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case STATUS_KEYS.current:
      return "success";
    case STATUS_KEYS.former:
      return "muted";
    default:
      return "muted";
  }
}

/** Compact pill tones for Person program role (matches Recruit badge system). */
export function personProgramRoleTone(key: string | undefined): RecruitStatusTone {
  switch (key) {
    case ROLE_KEYS.player:
      return "info";
    case ROLE_KEYS.coach:
      return "crimson";
    case ROLE_KEYS.recruit:
      return "research";
    case ROLE_KEYS.alumni:
      return "muted";
    case ROLE_KEYS.staff:
      return "warning";
    case ROLE_KEYS.family:
      return "success";
    default:
      return "muted";
  }
}
