import type { ExportPopulations, ExportWho } from "./types";

/** Resolve the row set for a Who choice. Unknown / empty selection → []. */
export function resolveExportRows<TRow>(
  who: ExportWho,
  populations: ExportPopulations<TRow>,
): readonly TRow[] {
  switch (who) {
    case "all":
      return populations.all;
    case "found_set":
      return populations.foundSet ?? [];
    case "selection":
      return populations.selection ?? [];
    case "current":
      return populations.current ? [populations.current] : [];
    default:
      return [];
  }
}

export function availableWhoOptions<TRow>(
  populations: ExportPopulations<TRow>,
): ExportWho[] {
  const options: ExportWho[] = [];
  if (populations.current) {
    options.push("current");
  }
  options.push("all");
  if (populations.foundSet !== undefined) {
    options.push("found_set");
  }
  if (populations.selection && populations.selection.length > 0) {
    options.push("selection");
  }
  return options;
}
