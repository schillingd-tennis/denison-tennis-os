"use client";

import type { LucideIcon } from "lucide-react";
import { FileText, IdCard, Plane, UserRound } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
  WorkspaceFieldGrid,
  type WorkspaceSectionTone,
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
  icon: LucideIcon;
  tone: WorkspaceSectionTone;
}[] = [
  { group: "travel.identity", title: "Identity", icon: UserRound, tone: "module" },
  { group: "travel.documents", title: "Travel Documents", icon: FileText, tone: "warning" },
  { group: "travel.air", title: "Air Travel", icon: Plane, tone: "warning" },
  { group: "travel.government", title: "Government ID", icon: IdCard, tone: "neutral" },
];

const TRAVEL_FIELDS = getPersonFieldKeysForWorkspace("travel");

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
              <WorkspaceAccentHeading icon={section.icon} tone={section.tone}>
                {section.title}
              </WorkspaceAccentHeading>
              <WorkspaceFieldGrid columns={3} className="mt-[5px]">
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
              </WorkspaceFieldGrid>
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
