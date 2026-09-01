export type TodayBetaTestPlayerConfig = {
  displayName: string;
  /** Alternate directory names to match existing recruit records. */
  nameAliases: string[];
  trnPlayerId: string;
  trnProfileUrl: string;
  /** Optional seed UTR identity (Isaac Lewis proof-of-concept). */
  utrPlayerId?: string;
};

/** Fixed Today Beta v0.1 cohort — do not create duplicate recruits. */
export const TODAY_BETA_TEST_PLAYERS: readonly TodayBetaTestPlayerConfig[] = [
  {
    displayName: "Isaac Lewis",
    nameAliases: ["Isaac Lewis"],
    trnPlayerId: "971115",
    trnProfileUrl: "https://tennisrecruiting.net/player/overview.asp?id=971115",
    utrPlayerId: "3186547",
  },
  {
    displayName: "Alexander Wriedt",
    nameAliases: ["Alexander Wriedt", "Xander Wriedt"],
    trnPlayerId: "945312",
    trnProfileUrl: "https://tennisrecruiting.net/player.asp?id=945312",
    utrPlayerId: "3107680",
  },
  {
    displayName: "Finnegan Keenan",
    nameAliases: ["Finnegan Keenan", "Finn Keenan"],
    trnPlayerId: "966840",
    trnProfileUrl: "https://tennisrecruiting.net/player/overview.asp?id=966840",
    utrPlayerId: "2658468",
  },
  {
    displayName: "Cole LaFors",
    nameAliases: ["Cole LaFors"],
    trnPlayerId: "993017",
    trnProfileUrl: "https://tennisrecruiting.net/player.asp?id=993017",
    utrPlayerId: "1352741",
  },
  {
    displayName: "Adam Roman",
    nameAliases: ["Adam Roman"],
    trnPlayerId: "987712",
    trnProfileUrl: "https://tennisrecruiting.net/player.asp?id=987712",
    utrPlayerId: "4338036",
  },
] as const;

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function personNameMatchesConfig(
  displayName: string,
  aliases: readonly string[],
): boolean {
  const normalized = normalizePersonName(displayName);
  return aliases.some((alias) => normalizePersonName(alias) === normalized);
}
