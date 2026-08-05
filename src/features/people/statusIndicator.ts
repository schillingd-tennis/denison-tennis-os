import type { StatusDotTone } from "@/components/StatusDot";
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
 *
 * Current / Active → Denison red. Alumni → neutral gray.
 */
export function getPersonStatusIndicator(person: Person): PersonStatusIndicator {
  if (person.status === "alumni") {
    return { tone: "alumni", label: getStatusLabel(person.status) };
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
      if (hasRole(person, "coach") && !hasRole(person, "player")) {
        return { tone: "active", label: person.title?.trim() || "Coach" };
      }
      if (person.status === "current") {
        return { tone: "active", label: getStatusLabel("current") };
      }
      return { tone: "muted", label: "Status unknown" };
  }
}
