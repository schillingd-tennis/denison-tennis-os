/**
 * Person program lookup FK fields (roles / statuses) — inline select options.
 * Shared by FieldRenderer and PersonFieldSession (BP-025A).
 */
import type { InlineSelectOption } from "@/components/inline-edit";
import type { LookupRecord } from "@/features/lookups/types";
import type { Person } from "@/features/people/types";

export const PERSON_LOOKUP_FIELD_KEYS = ["roleId", "statusId"] as const;

export type PersonLookupFieldKey = (typeof PERSON_LOOKUP_FIELD_KEYS)[number];

export function isPersonLookupField(
  field: keyof Person,
): field is PersonLookupFieldKey {
  return PERSON_LOOKUP_FIELD_KEYS.includes(field as PersonLookupFieldKey);
}

export function personLookupOptions(
  field: PersonLookupFieldKey,
  roles: readonly LookupRecord[],
  statuses: readonly LookupRecord[],
): InlineSelectOption[] {
  const source = field === "roleId" ? roles : statuses;
  return source.map((entry) => ({ value: entry.id, label: entry.label }));
}

export function personLookupDisplayLabel(
  person: Person,
  field: PersonLookupFieldKey,
  roles: readonly LookupRecord[],
  statuses: readonly LookupRecord[],
): string | undefined {
  const id = person[field];
  if (!id) return undefined;
  const joined = field === "roleId" ? person.role : person.status;
  if (joined?.id === id && joined.label) return joined.label;
  const source = field === "roleId" ? roles : statuses;
  return source.find((entry) => entry.id === id)?.label;
}

export function personLookupJoinPatch(
  field: PersonLookupFieldKey,
  id: string,
  roles: readonly LookupRecord[],
  statuses: readonly LookupRecord[],
): Partial<Pick<Person, "roleId" | "statusId" | "role" | "status">> {
  if (field === "roleId") {
    const role = roles.find((entry) => entry.id === id);
    if (!role) return { roleId: id };
    return {
      roleId: role.id,
      role: { id: role.id, key: role.key, label: role.label },
    };
  }
  const status = statuses.find((entry) => entry.id === id);
  if (!status) return { statusId: id };
  return {
    statusId: status.id,
    status: { id: status.id, key: status.key, label: status.label },
  };
}
