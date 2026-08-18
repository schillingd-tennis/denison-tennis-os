"use client";

import type { ReactNode } from "react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
} from "@/components/adaptive-workspace";
import {
  FieldRenderer,
  PersonFieldSession,
} from "@/features/field-engine";
import {
  getPersonFieldKeysForWorkspace,
  getPersonFieldsForWorkspace,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

/**
 * Travel Adaptive Workspace body.
 * Field membership unchanged; section chrome matches Recruit Personal Info.
 */

const TRAVEL_WORKSPACE_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
}[] = [
  { group: "travel.identity", title: "Identity" },
  { group: "travel.documents", title: "Travel Documents" },
  { group: "travel.air", title: "Air Travel" },
  { group: "travel.government", title: "Government ID" },
];

const TRAVEL_FIELDS = getPersonFieldKeysForWorkspace("travel");

function PersonalInfoFieldGrid({ children }: { children: ReactNode }) {
  return (
    <dl
      className="mt-[5px] grid gap-x-6 gap-y-[7px]"
      style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
    >
      {children}
    </dl>
  );
}

export default function TravelWorkspace({
  person,
  onPersonChange,
  runSave,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={TRAVEL_FIELDS}
    >
      <div className="space-y-[14px]">
        {TRAVEL_WORKSPACE_SECTIONS.map((section, index) => {
          const fields = getPersonFieldsForWorkspace("travel", section.group);
          if (fields.length === 0) return null;
          const block = (
            <section aria-label={section.title}>
              <WorkspaceAccentHeading>{section.title}</WorkspaceAccentHeading>
              <PersonalInfoFieldGrid>
                {fields.map((field) => (
                  <WorkspaceField key={field.key} label={field.label}>
                    <FieldRenderer
                      field={field.key}
                      align="left"
                      editOn="click"
                      emphasis="workspace"
                      density="compact"
                    />
                  </WorkspaceField>
                ))}
              </PersonalInfoFieldGrid>
            </section>
          );
          return index === 0 ? (
            <div key={section.group}>{block}</div>
          ) : (
            <div key={section.group} className="border-t border-border/50 pt-[14px]">
              {block}
            </div>
          );
        })}
      </div>
    </PersonFieldSession>
  );
}
