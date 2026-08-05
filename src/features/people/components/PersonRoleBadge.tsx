import type { Person } from "@/features/people/types";
import { getPersonRoleLabel } from "@/features/people/utils";

/**
 * Compact role / title line under a person's name (BP-021).
 *
 * Prefers `Person.title` (e.g. Head Coach from Airtable). Falls back to a
 * role-derived label (Player, Coach, Alumni, Staff) so new roles display
 * without custom per-surface code.
 */
export default function PersonRoleBadge({
  person,
  className = "",
}: {
  person: Person;
  className?: string;
}) {
  const label = getPersonRoleLabel(person);

  return (
    <span
      className={`block truncate text-xs text-text-secondary ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
