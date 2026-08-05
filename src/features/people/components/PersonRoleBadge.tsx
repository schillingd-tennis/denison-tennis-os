import type { Person } from "@/features/people/types";
import { getPersonRoleBadges } from "@/features/people/utils";

import RoleBadge from "@/components/RoleBadge";

/**
 * Quiet identity metadata under a person's name (BP-022D).
 *
 * Renders nothing for plain Players. Surfaces titles and meaningful roles
 * (Head Coach, Recruit, Alumni, …) as plain secondary text — not a pill.
 */
export default function PersonRoleBadge({
  person,
  className = "",
  compact = false,
}: {
  person: Person;
  className?: string;
  /** Single primary label only (dense list rows). */
  compact?: boolean;
}) {
  const badges = getPersonRoleBadges(person);
  const visible = compact ? badges.slice(0, 1) : badges;
  if (visible.length === 0) return null;

  const label = visible.map((badge) => badge.label).join(" · ");

  return <RoleBadge label={label} className={className} />;
}
