"use server";

import { formatPhoneDisplay } from "@/components/inline-edit/formatters";
import { listPeople } from "@/features/people/repository";
import { ROLE_KEYS } from "@/features/lookups/seed";
import type { Person } from "@/features/people/types";
import {
  formatDenisonIdDisplay,
  getDisplayName,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleBadges,
  getPersonRoleLabel,
  hasRole,
} from "@/features/people/utils";

import type { PersonPreviewData, SearchObjectType } from "@/components/command-palette/types";

export type PalettePersonItem = {
  id: string;
  objectType: Extract<SearchObjectType, "people" | "coaches" | "staff">;
  displayName: string;
  fullName: string;
  roleLabel: string;
  roles: string[];
  initials: string;
  keywords: string[];
  preview: PersonPreviewData;
};

function objectTypeForPerson(
  person: Person,
): Extract<SearchObjectType, "people" | "coaches" | "staff"> {
  if (hasRole(person, ROLE_KEYS.coach)) return "coaches";
  if (hasRole(person, ROLE_KEYS.staff)) return "staff";
  return "people";
}

function roleLabels(person: Person): string[] {
  return getPersonRoleBadges(person).map((badge) => badge.label);
}

/** Lightweight people rows for the global command palette + preview rail. */
export async function listPalettePeople(): Promise<PalettePersonItem[]> {
  const people = await listPeople();
  return people.map((person) => {
    const displayName = getDisplayName(person);
    const fullName = getFullDisplayName(person);
    const roleLabel = getPersonRoleLabel(person);
    const initials = getInitials(person);
    const hometown = getHometown(person);
    const email = person.denisonEmail ?? person.personalEmail;
    const phone = formatPhoneDisplay(person.cellPhone);
    const roles = roleLabels(person);
    const objectType = objectTypeForPerson(person);

    return {
      id: person.id,
      objectType,
      displayName,
      fullName,
      roleLabel,
      roles: [person.role.key],
      initials,
      keywords: [
        displayName,
        fullName,
        person.firstName,
        person.lastName,
        person.preferredName ?? "",
        person.title ?? "",
        person.role.key,
        person.role.label,
        person.status.key,
        person.status.label,
        roleLabel,
        initials,
        hometown ?? "",
        person.city ?? "",
        person.state ?? "",
        person.major ?? "",
        formatDenisonIdDisplay(person.denisonId),
        person.denisonId ?? "",
        email ?? "",
      ].filter(Boolean),
      preview: {
        kind: "person",
        photoUrl: person.photoUrl,
        initials,
        name: displayName,
        roles,
        roleLabel,
        classYear: person.classYear,
        denisonIdDisplay: formatDenisonIdDisplay(person.denisonId),
        utr: person.utr,
        wtn: person.wtn,
        hometown,
        email,
        phone: phone || undefined,
        recentActivity: undefined,
      },
    };
  });
}
