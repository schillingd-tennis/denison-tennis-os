import {
  RANKINGS_CURRENT_ITA_ROUTE,
  RANKINGS_CURRENT_NPI_ROUTE,
  RANKINGS_LIVE_ITA_ROUTE,
  RANKINGS_LIVE_NPI_ROUTE,
} from "@/lib/module-routes";

import type { RankingsSubmodule, RankingsSubmoduleId } from "./types";

export const RANKINGS_SUBMODULES: readonly RankingsSubmodule[] = [
  { id: "current-ita", label: "Current ITA Rankings", href: RANKINGS_CURRENT_ITA_ROUTE },
  { id: "live-ita", label: "Live ITA Rankings", href: RANKINGS_LIVE_ITA_ROUTE },
  { id: "current-npi", label: "Current NPI Rankings", href: RANKINGS_CURRENT_NPI_ROUTE },
  { id: "live-npi", label: "Live NPI Rankings", href: RANKINGS_LIVE_NPI_ROUTE },
] as const;

export function rankingsSubmoduleById(id: RankingsSubmoduleId): RankingsSubmodule {
  const match = RANKINGS_SUBMODULES.find((item) => item.id === id);
  if (!match) throw new Error(`Unknown rankings submodule: ${id}`);
  return match;
}
