"use server";

import { formatPhoneDisplay } from "@/components/inline-edit/formatters";
import { listPeople } from "@/features/people/repository";
import type { Person } from "@/features/people/types";
import { personPaletteKeywords } from "@/features/people/personSearch";
import {
  formatDenisonIdDisplay,
  getDisplayName,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleBadges,
  getPersonRoleLabel,
  searchObjectTypeForPerson,
} from "@/features/people/utils";

import type { PersonPreviewData, SearchObjectType } from "@/components/command-palette/types";

export type PalettePersonItem = {
  id: string;
  objectType: Extract<SearchObjectType, "people" | "coaches" | "staff" | "recruits">;
  displayName: string;
  fullName: string;
  roleLabel: string;
  roles: string[];
  initials: string;
  keywords: string[];
  preview: PersonPreviewData;
};

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
    const objectType = searchObjectTypeForPerson(person);

    return {
      id: person.id,
      objectType,
      displayName,
      fullName,
      roleLabel,
      roles: [person.role.key],
      initials,
      keywords: personPaletteKeywords(person, [
        displayName,
        fullName,
        roleLabel,
        initials,
        hometown ?? "",
        email ?? "",
      ]),
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
