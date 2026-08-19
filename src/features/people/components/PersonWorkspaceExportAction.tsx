"use client";

import { useCallback, useRef, useState } from "react";
import { Download } from "lucide-react";

import { useDrawerManager } from "@/components/workspace-drawer";
import ExportBuilder from "@/features/export-engine/components/ExportBuilder";
import { TEAM_EXPORT_MODULE } from "@/features/export-engine";
import { listPeopleAction } from "@/features/people/peopleReadActions";
import type { Person } from "@/features/people/types";
import { isTeamDirectoryPerson } from "@/features/people/utils";

/**
 * Contextual Export control for Player adaptive workspaces.
 * Opens the shared Export Builder with a workspace preset and
 * Current Player / All Players — never a Team List found set.
 */
export type PersonWorkspaceExportPresetId =
  | "personalInfo"
  | "academics"
  | "equipment"
  | "travel";

function withCurrentPlayer(all: readonly Person[], current: Person): Person[] {
  const members = all.filter(isTeamDirectoryPerson);
  const index = members.findIndex((person) => person.id === current.id);
  if (index >= 0) {
    const next = [...members];
    next[index] = current;
    return next;
  }
  if (isTeamDirectoryPerson(current)) return [current, ...members];
  return members;
}

export default function PersonWorkspaceExportAction({
  person,
  presetId,
}: {
  person: Person;
  presetId: PersonWorkspaceExportPresetId;
}) {
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [opening, setOpening] = useState(false);
  const runExportRef = useRef<() => boolean>(() => false);
  const bindExport = useCallback((run: () => boolean) => {
    runExportRef.current = run;
  }, []);

  async function handleExport() {
    if (opening) return;
    setOpening(true);
    try {
      const people = await listPeopleAction();
      const all = withCurrentPlayer(people, person);
      openDrawer({
        id: "person-workspace-export",
        title: "Export",
        subtitle: "Team",
        content: (
          <ExportBuilder
            entry={{
              module: TEAM_EXPORT_MODULE,
              populations: {
                all,
                current: person,
              },
              initialPresetId: presetId,
              initialWho: "current",
            }}
            bindExport={bindExport}
          />
        ),
        primaryAction: {
          label: "Export",
          onClick: () => {
            if (runExportRef.current()) closeDrawer();
          },
        },
        cancelAction: { label: "Cancel" },
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={opening}
      aria-label="Export"
      className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-black/[0.06] transition-colors hover:bg-app-background hover:text-text-primary disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      Export
    </button>
  );
}
