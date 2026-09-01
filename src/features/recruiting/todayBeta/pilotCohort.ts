/**
 * @deprecated No longer used for UTR automatic monitoring cohort selection.
 * Rank Board membership (`recruit_profiles.coach_rank`) is the single source of truth.
 * Retained for one-off validation scripts only.
 *
 * Controlled UTR monitoring pilot cohort (~17 recruits).
 * Five proven batch recruits plus twelve additional recruits with UTR URLs.
 */
export type UtrPilotRecruit = {
  personId: string;
  displayName: string;
  utrPlayerId: string;
};

/** Original five-recruit live batch (passed). */
export const UTR_PILOT_CORE_RECRUITS: readonly UtrPilotRecruit[] = [
  { personId: "recruit-xlsx-row-441", displayName: "Isaac Lewis", utrPlayerId: "3186547" },
  { personId: "recruit-xlsx-row-382", displayName: "Alexander Wriedt", utrPlayerId: "3107680" },
  { personId: "recruit-xlsx-row-380", displayName: "Finnegan Keenan", utrPlayerId: "2658468" },
  { personId: "recruit-xlsx-row-27", displayName: "Cole LaFors", utrPlayerId: "1352741" },
  { personId: "recruit-xlsx-row-175", displayName: "Adam Roman", utrPlayerId: "4338036" },
] as const;

/** Additional pilot recruits (UTR IDs from production_people.utr_url). */
export const UTR_PILOT_EXPANSION_RECRUITS: readonly UtrPilotRecruit[] = [
  { personId: "recruit-xlsx-row-181", displayName: "Koray Abramson", utrPlayerId: "256627" },
  { personId: "recruit-xlsx-row-280", displayName: "Daven Aga", utrPlayerId: "1821177" },
  { personId: "recruit-xlsx-row-47", displayName: "Shaw Akula", utrPlayerId: "3039610" },
  { personId: "recruit-xlsx-row-453", displayName: "(Sai) Amara", utrPlayerId: "1295236" },
  { personId: "recruit-xlsx-row-116", displayName: "Gideon Ames", utrPlayerId: "5850620" },
  { personId: "recruit-xlsx-row-194", displayName: "Brayden Amey", utrPlayerId: "266181" },
  { personId: "recruit-xlsx-row-46", displayName: "Aashray Arun", utrPlayerId: "371975" },
  { personId: "recruit-xlsx-row-304", displayName: "Finn Ashley", utrPlayerId: "3282993" },
  { personId: "recruit-xlsx-row-91", displayName: "Paxton Au", utrPlayerId: "3121148" },
  { personId: "recruit-xlsx-row-450", displayName: "Davis Aubrey", utrPlayerId: "389849" },
  { personId: "recruit-xlsx-row-203", displayName: "Adrian Baerga-Torres", utrPlayerId: "944783" },
  { personId: "recruit-xlsx-row-100", displayName: "Brandon Bao", utrPlayerId: "944878" },
] as const;

export const UTR_PILOT_COHORT: readonly UtrPilotRecruit[] = [
  ...UTR_PILOT_CORE_RECRUITS,
  ...UTR_PILOT_EXPANSION_RECRUITS,
] as const;

export const UTR_PILOT_PERSON_IDS = new Set(UTR_PILOT_COHORT.map((recruit) => recruit.personId));

export const UTR_PILOT_PLAYER_IDS = new Set(UTR_PILOT_COHORT.map((recruit) => recruit.utrPlayerId));
