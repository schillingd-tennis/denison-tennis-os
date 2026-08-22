import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pin,
  Users,
} from "lucide-react";

import { resolvePersonWorkspacePath } from "@/lib/module-routes";
import type { CommandDefinition, SearchObjectType } from "@/components/command-palette/types";

import type { PinnedFavorite } from "./types";

const ICON_BY_KEY: Record<string, LucideIcon> = {
  Users,
  FileText,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Pin,
};

export function defaultIconKeyForType(objectType: SearchObjectType): string {
  switch (objectType) {
    case "people":
    case "coaches":
    case "staff":
    case "recruits":
      return "Users";
    case "documents":
      return "FileText";
    case "operations":
    case "practices":
    case "trips":
      return "ClipboardList";
    case "research_projects":
      return "FlaskConical";
    case "pages":
      return "LayoutDashboard";
    default:
      return "Pin";
  }
}

export function iconFromKey(iconKey: string | undefined, objectType: SearchObjectType): LucideIcon {
  const key = iconKey ?? defaultIconKeyForType(objectType);
  return ICON_BY_KEY[key] ?? Pin;
}

export function objectIdFromCommand(command: CommandDefinition): string {
  const id = command.id;
  if (id.startsWith("person:")) return id.slice("person:".length);
  if (id.startsWith("page:")) return id.slice("page:".length);
  if (id.startsWith("action:")) return id.slice("action:".length);
  return id;
}

export function displayNameFromCommand(command: CommandDefinition): string {
  return command.label.replace(/^(Open|Go to)\s+/i, "").trim() || command.label;
}

export function hrefFromCommand(command: CommandDefinition): string | undefined {
  if (command.id.startsWith("page:")) {
    const path = command.id.slice("page:".length);
    return path.length > 0 ? path : "/";
  }
  if (command.id.startsWith("person:")) {
    return resolvePersonWorkspacePath(command.id.slice("person:".length), {
      objectType: command.objectType,
    });
  }
  return undefined;
}

export function favoriteFromCommand(command: CommandDefinition): PinnedFavorite {
  return {
    objectId: objectIdFromCommand(command),
    objectType: command.objectType,
    displayName: displayNameFromCommand(command),
    commandId: command.id,
    iconKey: defaultIconKeyForType(command.objectType),
    href: hrefFromCommand(command),
  };
}

export function hrefFromFavorite(favorite: PinnedFavorite): string | undefined {
  if (favorite.objectType === "recruits") {
    return resolvePersonWorkspacePath(favorite.objectId, {
      objectType: favorite.objectType,
    });
  }
  if (favorite.href) return favorite.href;
  switch (favorite.objectType) {
    case "people":
    case "coaches":
    case "staff":
      return resolvePersonWorkspacePath(favorite.objectId, {
        objectType: favorite.objectType,
      });
    case "pages":
      return favorite.objectId || "/";
    default:
      return undefined;
  }
}

/**
 * Turn a stored favorite/recent into a runnable command, preferring a live
 * registry entry when available.
 */
export function resolvePinnedToCommand(
  favorite: PinnedFavorite,
  byCommandId: Map<string, CommandDefinition>,
  byObjectKey: Map<string, CommandDefinition>,
): CommandDefinition {
  if (favorite.commandId) {
    const live = byCommandId.get(favorite.commandId);
    if (live) return live;
  }

  const objectKey = `${favorite.objectType}:${favorite.objectId}`;
  const byObject = byObjectKey.get(objectKey);
  if (byObject) return byObject;

  const href = hrefFromFavorite(favorite);
  const Icon = iconFromKey(favorite.iconKey, favorite.objectType);

  return {
    id: favorite.commandId ?? `favorite:${favorite.objectType}:${favorite.objectId}`,
    objectType: favorite.objectType,
    label: favorite.displayName,
    subtitle: favorite.objectType.replace(/_/g, " "),
    icon: Icon,
    preview: {
      kind: "generic",
      title: favorite.displayName,
      body: "Pinned favorite",
    },
    perform: ({ navigate, close, notify }) => {
      if (!href) {
        notify("This favorite is unavailable until its module is registered.");
        return;
      }
      navigate(href);
      close();
    },
  };
}

export function buildCommandIndexes(commands: CommandDefinition[]): {
  byCommandId: Map<string, CommandDefinition>;
  byObjectKey: Map<string, CommandDefinition>;
} {
  const byCommandId = new Map<string, CommandDefinition>();
  const byObjectKey = new Map<string, CommandDefinition>();
  for (const command of commands) {
    byCommandId.set(command.id, command);
    byObjectKey.set(`${command.objectType}:${objectIdFromCommand(command)}`, command);
  }
  return { byCommandId, byObjectKey };
}
