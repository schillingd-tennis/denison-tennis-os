"use server";

import { formatPhoneDisplay } from "@/components/inline-edit/formatters";
import { listPeople } from "@/features/people/repository";
import type { Person, PersonRole } from "@/features/people/types";
import {
  formatDenisonIdDisplay,
  getDisplayName,
  getFullDisplayName,
  getHometown,
  getInitials,
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
  roles: PersonRole[];
  initials: string;
  keywords: string[];
  preview: PersonPreviewData;
};

function objectTypeForPerson(
  person: Person,
): Extract<SearchObjectType, "people" | "coaches" | "staff"> {
  if (hasRole(person, "coach")) return "coaches";
  if (hasRole(person, "staff")) return "staff";
  return "people";
}

function roleLabels(person: Person): string[] {
  const labels: string[] = [];
  if (person.title?.trim()) labels.push(person.title.trim());
  for (const role of person.roles) {
    const pretty = role.charAt(0).toUpperCase() + role.slice(1);
    if (!labels.some((label) => label.toLowerCase() === pretty.toLowerCase())) {
      labels.push(pretty);
    }
  }
  return labels.length > 0 ? labels : ["Person"];
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
      roles: person.roles,
      initials,
      keywords: [
        displayName,
        fullName,
        person.firstName,
        person.lastName,
        person.preferredName ?? "",
        person.title ?? "",
        ...person.roles,
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
