/**
 * @deprecated BP-021F — use `recordRecentOpen` / `listRecents` from
 * `favorites/recentsService` instead. Kept as a thin bridge for any leftover
 * imports.
 */
import { listRecents, recordRecentOpen } from "./favorites/recentsService";

export function readRecentCommandIds(): string[] {
  return listRecents()
    .map((item) => item.commandId)
    .filter((id): id is string => Boolean(id));
}

export function pushRecentCommandId(id: string): void {
  recordRecentOpen({
    objectId: id,
    objectType: "actions",
    displayName: id,
    commandId: id,
  });
}
