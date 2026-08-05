import type { StatusDotTone } from "@/components/StatusDot";
import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";
import {
  getPlayerStatusLabel,
  getStatusLabel,
  hasRole,
} from "@/features/people/utils";

export type PersonStatusIndicator = {
  tone: StatusDotTone;
  label: string;
};

/**
 * Resolves the compact People / Team status dot for a person.
 * Status and role come from lookups — never inferred from each other.
 */
export function getPersonStatusIndicator(person: Person): PersonStatusIndicator {
  if (person.status.key === STATUS_KEYS.former) {
    return { tone: "alumni", label: getStatusLabel(person) };
  }

  switch (person.playerStatus) {
    case "active":
      return { tone: "active", label: getPlayerStatusLabel("active") };
    case "injured":
      return { tone: "injured", label: getPlayerStatusLabel("injured") };
    case "inactive":
      return { tone: "inactive", label: getPlayerStatusLabel("inactive") };
    case "graduated":
      return { tone: "alumni", label: getPlayerStatusLabel("graduated") };
    default:
      if (hasRole(person, ROLE_KEYS.recruit)) {
        return { tone: "recruit", label: person.role.label };
      }
      if (hasRole(person, ROLE_KEYS.coach) || hasRole(person, ROLE_KEYS.staff)) {
        return { tone: "coach", label: person.title?.trim() || person.role.label };
      }
      if (person.status.key === STATUS_KEYS.current) {
        return { tone: "active", label: getStatusLabel(person) };
      }
      return { tone: "muted", label: getStatusLabel(person) };
  }
}
