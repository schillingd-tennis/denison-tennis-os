"use client";

import {
  ClipboardCopy,
  Download,
  RefreshCw,
  RotateCcw,
  Settings,
  TerminalSquare,
  UserPlus,
  Users,
} from "lucide-react";

import {
  copyFoundSetSnapshot,
  exportFoundSetSnapshotCsv,
  readCurrentFoundSetSnapshot,
} from "@/components/found-set";
import { commandRegistry } from "@/components/command-palette/registry";
import type { CommandContext, CommandDefinition } from "@/components/command-palette/types";
import { primaryNavItems, settingsNavItem } from "@/components/nav-items";
import {
  rerunSeedAction,
  resetLocalDatabaseAction,
} from "@/features/developer/actions";
import { detectEnvironment } from "@/features/developer/detectEnvironment";
import { listPalettePeople } from "@/features/people/paletteActions";
import { TEAM_FOUND_SET_MODULE_KEY } from "@/features/people/foundSet";

function developerToolsEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return detectEnvironment(url) === "local";
}

function pageCommands(): CommandDefinition[] {
  const fromNav: CommandDefinition[] = primaryNavItems.map((item) => {
    const isPeople = item.href === "/team";
    return {
      id: `page:${item.href}`,
      objectType: "pages",
      label: isPeople ? "Go to People" : `Go to ${item.label}`,
      subtitle: item.href === "/" ? "Home" : item.href,
      keywords: isPeople
        ? ["team", "people", "directory", "players", "coaches", "alumni"]
        : [item.label, item.href.replace(/^\//, "")],
      icon: item.icon,
      preview: {
        kind: "generic",
        title: isPeople ? "People" : item.label,
        body: `Navigate to ${isPeople ? "People" : item.label}.`,
        lines: [{ label: "Path", value: item.href }],
      },
      perform: ({ navigate, close }: CommandContext) => {
        navigate(item.href);
        close();
      },
    };
  });

  return [
    ...fromNav,
    {
      id: `page:${settingsNavItem.href}`,
      objectType: "pages",
      label: "Go to Settings",
      subtitle: settingsNavItem.href,
      keywords: ["settings", "preferences"],
      icon: Settings,
      preview: {
        kind: "generic",
        title: "Settings",
        body: "Workspace preferences and developer tools.",
        lines: [{ label: "Path", value: settingsNavItem.href }],
      },
      perform: ({ navigate, close }: CommandContext) => {
        navigate(settingsNavItem.href);
        close();
      },
    },
    {
      id: "page:/settings/developer",
      objectType: "pages",
      label: "Open Developer Settings",
      subtitle: "/settings/developer",
      keywords: ["developer", "diagnostics", "local", "supabase", "database"],
      icon: TerminalSquare,
      preview: {
        kind: "generic",
        title: "Developer Settings",
        body: "Local diagnostics: environment, database status, and developer utilities.",
        lines: [{ label: "Path", value: "/settings/developer" }],
      },
      perform: ({ navigate, close }: CommandContext) => {
        navigate("/settings/developer");
        close();
      },
    },
  ];
}

function actionCommands(): CommandDefinition[] {
  return [
    {
      id: "action:new-person",
      objectType: "actions",
      label: "New Person",
      subtitle: "Coming soon — opens People",
      keywords: ["add", "create", "player", "person"],
      icon: UserPlus,
      preview: {
        kind: "action",
        explanation:
          "Opens People. Creating a new person record is not available yet — this is a placeholder until the create flow ships.",
      },
      perform: ({ navigate, close, notify }) => {
        notify("New Person is coming soon");
        navigate("/team");
        close();
      },
    },
    {
      id: "action:export-found-set",
      objectType: "actions",
      label: "Export Current Found Set (CSV)",
      subtitle: "Downloads the last filtered list as CSV",
      keywords: ["export", "csv", "download", "found set"],
      icon: Download,
      preview: {
        kind: "action",
        explanation:
          "Downloads a CSV of the current found set (the last filtered People list published this session).",
      },
      perform: ({ close, notify }) => {
        const snapshot = readCurrentFoundSetSnapshot(TEAM_FOUND_SET_MODULE_KEY);
        if (!snapshot || snapshot.rows.length === 0) {
          notify("No found set — open People and apply a filter first");
          return;
        }
        exportFoundSetSnapshotCsv(snapshot);
        notify(`Exported ${snapshot.rows.length} rows`);
        close();
      },
    },
    {
      id: "action:copy-found-set",
      objectType: "actions",
      label: "Copy Current Found Set",
      subtitle: "Copies the last filtered list for paste into Sheets",
      keywords: ["copy", "clipboard", "found set"],
      icon: ClipboardCopy,
      preview: {
        kind: "action",
        explanation:
          "Copies the current found set to the clipboard as tab-delimited text for paste into Sheets or Excel.",
      },
      perform: async ({ close, notify }) => {
        const snapshot = readCurrentFoundSetSnapshot(TEAM_FOUND_SET_MODULE_KEY);
        if (!snapshot || snapshot.rows.length === 0) {
          notify("No found set — open People and apply a filter first");
          return;
        }
        try {
          await copyFoundSetSnapshot(snapshot);
          notify(`Copied ${snapshot.rows.length} rows`);
          close();
        } catch {
          notify("Copy failed");
        }
      },
    },
    {
      id: "action:reset-local-db",
      objectType: "actions",
      label: "Reset Local Database",
      subtitle: "DESTRUCTIVE — destroys all local data, then migrations + seed",
      keywords: ["reset", "database", "supabase", "local"],
      icon: RotateCcw,
      enabled: developerToolsEnabled,
      preview: {
        kind: "action",
        explanation:
          "DESTRUCTIVE: drops the local database (UTR, WTN, notes, and all manual edits are lost), then re-applies migrations + seed. Local development only.",
      },
      perform: async ({ notify }) => {
        if (
          !window.confirm(
            "DESTRUCTIVE: Reset the local database? This permanently destroys all local People data (including UTR, WTN, notes, and manual edits).",
          )
        ) {
          return;
        }
        notify("Resetting local database…");
        const result = await resetLocalDatabaseAction();
        if (result.success) {
          commandRegistry.invalidateProviderCache();
          notify(result.message);
        } else {
          notify(result.error);
        }
      },
    },
    {
      id: "action:rerun-seed",
      objectType: "actions",
      label: "Re-run Seed",
      subtitle: "Updates provider-synced fields — preserves UTR / WTN / notes",
      keywords: ["seed", "database", "supabase", "local"],
      icon: RefreshCw,
      enabled: developerToolsEnabled,
      preview: {
        kind: "action",
        explanation:
          "Applies supabase/seed.sql without dropping the database. Updates provider-synced columns; preserves application-owned fields (UTR, WTN, notes, …). Never falls back to db reset.",
      },
      perform: async ({ notify }) => {
        if (
          !window.confirm(
            "Re-apply seed.sql? Updates provider-synced fields. Preserves UTR, WTN, notes, and other app-owned fields.",
          )
        ) {
          return;
        }
        notify("Re-running seed…");
        const result = await rerunSeedAction();
        if (result.success) {
          commandRegistry.invalidateProviderCache();
          notify(result.message);
        } else {
          notify(result.error);
        }
      },
    },
  ];
}

let registered = false;

/**
 * Registers built-in Pages / Actions and the People provider.
 * Future modules (Recruits, Operations, Documents, …) should call
 * `commandRegistry.registerCommand` / `registerProvider` from their own
 * feature bootstrap — never by editing the palette UI.
 */
export function registerDefaultCommands(): void {
  if (registered) return;
  registered = true;

  commandRegistry.registerCommands([...pageCommands(), ...actionCommands()]);

  commandRegistry.registerProvider({
    id: "people",
    cacheTtlMs: 60_000,
    async getCommands() {
      try {
        const people = await listPalettePeople();
        return people.map((person) => ({
          id: `person:${person.id}`,
          objectType: person.objectType,
          label: `Open ${person.displayName}`,
          subtitle: person.roleLabel,
          keywords: person.keywords,
          initials: person.initials,
          icon: Users,
          preview: person.preview,
          perform: ({ navigate, close }: CommandContext) => {
            navigate(`/team/${person.id}`);
            close();
          },
        }));
      } catch {
        return [];
      }
    },
  });
}

/** Register defaults (if needed) and prefetch provider indexes. */
export function warmCommandPalette(): void {
  registerDefaultCommands();
  commandRegistry.warm();
}
