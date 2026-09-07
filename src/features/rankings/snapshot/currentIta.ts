import { validateRankingSnapshot } from "../validate";
import type { RankingSnapshot } from "../types";
import raw from "./currentItaNationalTeamMenDiv3-2026-06-03.json";

/**
 * Team-average WTN values returned by ITA's `getRosterById` lookup for the
 * roster ids in this ranking release, in official rank order.
 */
const CURRENT_ITA_TEAM_WTN_BY_RANK = [
  10.42, 11.66, 10.62, 11.96, 11.04, 11.44, 12.01, 10.74, 11.9, 11.17,
  12.3, 12.44, 11.78, 12.44, 13.15, 12.26, 11.55, 12.83, 11.8, 11.99,
  14.87, 14.32, 14, 12.51, 13.81, 15.3, 13.41, 15.93, 14.63, 15.6,
  14.91, 14.95, 14.37, 15.96, 16.66, 15.68, 14.39, 15.12, 12.9, 16.64,
  12.48, 16.18, 13.32, 14.28, 14.63, 15.91, 13.99, 12.66, 18.22, 15.2,
  13.56, 16.15, 14.09, 15.87, 15.55, 16.79, 15.98, 16.07, 14.66, 15.35,
  13.52, 18.07, 15.52, 19.05, 15.08, 16.15, 17.58, 16.36, 15.57, 13.68,
  19.09, 16.36, 14.64, 16.88, 17.05,
] as const;

const validatedCurrentIta = validateRankingSnapshot(raw);
if (CURRENT_ITA_TEAM_WTN_BY_RANK.length !== validatedCurrentIta.entries.length) {
  throw new Error("Current ITA WTN snapshot must match the official ranking row count");
}

/** Deterministic local snapshot of ITA DIII Men National Team rankings (June 3, 2026). */
export const CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT: RankingSnapshot = {
  ...validatedCurrentIta,
  entries: validatedCurrentIta.entries.map((entry, index) => ({
    ...entry,
    wtn: CURRENT_ITA_TEAM_WTN_BY_RANK[index],
  })),
};

export const CURRENT_ITA_SOURCE_URL =
  CURRENT_ITA_NATIONAL_TEAM_MEN_DIV3_SNAPSHOT.metadata.sourceUrl;
