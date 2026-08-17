/**
 * Coach Rank pure engine (Phase B).
 *
 * Dense integer ranks within one recruit class year.
 * Filters never create a separate ranking — they only hide rows.
 */

export class CoachRankError extends Error {}

/** 1-based dense assignments for a ranked person-id order. */
export function densifyCoachRanks(
  rankedPersonIds: readonly string[],
): { personId: string; coachRank: number }[] {
  return rankedPersonIds.map((personId, index) => ({
    personId,
    coachRank: index + 1,
  }));
}

/** True when ranks are exactly 1…N with no gaps or duplicates. */
export function isDenseCoachRankSequence(ranks: readonly number[]): boolean {
  if (ranks.length === 0) return true;
  const sorted = [...ranks].sort((a, b) => a - b);
  return sorted.every((rank, index) => rank === index + 1);
}

/**
 * Canonical ranked ID order for a class: sort by stored Coach Rank, then id.
 * Callers assign 1…N from this array — never from stored numbers.
 */
export function masterRankedPersonIds(
  entries: readonly { personId: string; coachRank: number }[],
): string[] {
  return [...entries]
    .sort((a, b) => a.coachRank - b.coachRank || a.personId.localeCompare(b.personId))
    .map((entry) => entry.personId);
}

/** Dense 1…N map from an ordered ranked ID list. */
export function denseRankByPersonId(
  rankedPersonIds: readonly string[],
): Map<string, number> {
  return new Map(rankedPersonIds.map((personId, index) => [personId, index + 1]));
}

/**
 * Move an item within an ordered list by 0-based indices.
 * Returns a new array; does not mutate the input.
 */
export function moveInOrder(
  order: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex < 0 || fromIndex >= order.length) {
    throw new CoachRankError(`fromIndex ${fromIndex} is out of range.`);
  }
  if (toIndex < 0 || toIndex >= order.length) {
    throw new CoachRankError(`toIndex ${toIndex} is out of range.`);
  }
  if (fromIndex === toIndex) return [...order];

  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Move by 1-based Coach Rank positions within a fully ranked list. */
export function moveByRank(
  rankedPersonIds: readonly string[],
  fromRank: number,
  toRank: number,
): string[] {
  assertPositiveRank(fromRank, "fromRank");
  assertPositiveRank(toRank, "toRank");
  if (fromRank > rankedPersonIds.length) {
    throw new CoachRankError(`fromRank ${fromRank} exceeds ranked length ${rankedPersonIds.length}.`);
  }
  if (toRank > rankedPersonIds.length) {
    throw new CoachRankError(`toRank ${toRank} exceeds ranked length ${rankedPersonIds.length}.`);
  }
  return moveInOrder(rankedPersonIds, fromRank - 1, toRank - 1);
}

/**
 * Filtered reorder: change relative order of `visiblePersonIds` while preserving
 * hidden master positions.
 *
 * Example master A B C D E F, visible A C E, move E above C → A B E D C F.
 */
export function reorderFilteredMaster(
  masterRankedPersonIds: readonly string[],
  visiblePersonIds: readonly string[],
  fromVisibleIndex: number,
  toVisibleIndex: number,
): string[] {
  validateVisibleSubsequence(masterRankedPersonIds, visiblePersonIds);

  const nextVisible = moveInOrder(visiblePersonIds, fromVisibleIndex, toVisibleIndex);
  const visibleSet = new Set(visiblePersonIds);
  let visibleCursor = 0;

  return masterRankedPersonIds.map((personId) => {
    if (!visibleSet.has(personId)) return personId;
    const next = nextVisible[visibleCursor];
    visibleCursor += 1;
    return next;
  });
}

/** Move by 1-based positions within the visible filtered subset. */
export function moveVisibleByRank(
  masterRankedPersonIds: readonly string[],
  visiblePersonIds: readonly string[],
  fromVisibleRank: number,
  toVisibleRank: number,
): string[] {
  assertPositiveRank(fromVisibleRank, "fromVisibleRank");
  assertPositiveRank(toVisibleRank, "toVisibleRank");
  if (fromVisibleRank > visiblePersonIds.length || toVisibleRank > visiblePersonIds.length) {
    throw new CoachRankError("Visible rank is out of range.");
  }
  return reorderFilteredMaster(
    masterRankedPersonIds,
    visiblePersonIds,
    fromVisibleRank - 1,
    toVisibleRank - 1,
  );
}

/**
 * Apply a new visible ranked order onto the master list, preserving hidden
 * ranked positions. `nextVisiblePersonIds` must be a permutation of
 * `visiblePersonIds`.
 */
export function applyVisibleOrderToMaster(
  masterRankedPersonIds: readonly string[],
  visiblePersonIds: readonly string[],
  nextVisiblePersonIds: readonly string[],
): string[] {
  validateVisibleSubsequence(masterRankedPersonIds, visiblePersonIds);

  if (nextVisiblePersonIds.length !== visiblePersonIds.length) {
    throw new CoachRankError("Visible order length must match the filtered ranked subset.");
  }

  const originalSet = new Set(visiblePersonIds);
  const nextSet = new Set(nextVisiblePersonIds);
  if (nextSet.size !== nextVisiblePersonIds.length) {
    throw new CoachRankError("duplicate person ids in visible order.");
  }
  for (const id of nextVisiblePersonIds) {
    if (!originalSet.has(id)) {
      throw new CoachRankError(`Visible person ${id} is not in the filtered ranked subset.`);
    }
  }
  if (nextSet.size !== originalSet.size) {
    throw new CoachRankError("Visible order must be a permutation of the filtered ranked subset.");
  }

  let visibleCursor = 0;
  return masterRankedPersonIds.map((personId) => {
    if (!originalSet.has(personId)) return personId;
    const next = nextVisiblePersonIds[visibleCursor];
    visibleCursor += 1;
    return next;
  });
}

/**
 * Insert an unranked person into the ranked list at 1-based `atRank`.
 * `atRank === ranked.length + 1` appends.
 */
export function insertUnrankedAt(
  rankedPersonIds: readonly string[],
  personId: string,
  atRank: number,
): string[] {
  const id = personId.trim();
  if (!id) throw new CoachRankError("personId is required.");
  if (rankedPersonIds.includes(id)) {
    throw new CoachRankError(`Person ${id} is already ranked.`);
  }
  assertPositiveRank(atRank, "atRank");
  if (atRank > rankedPersonIds.length + 1) {
    throw new CoachRankError(
      `atRank ${atRank} exceeds append position ${rankedPersonIds.length + 1}.`,
    );
  }
  const next = [...rankedPersonIds];
  next.splice(atRank - 1, 0, id);
  return next;
}

/** Append an unranked person to the bottom of the ranked list. */
export function appendUnranked(
  rankedPersonIds: readonly string[],
  personId: string,
): string[] {
  return insertUnrankedAt(rankedPersonIds, personId, rankedPersonIds.length + 1);
}

/**
 * Insert an unranked person into the visible ranked subsequence at
 * `atVisibleIndex` (0…visible.length, where length appends after the last
 * visible recruit). Hidden ranked positions are preserved.
 */
export function insertUnrankedIntoVisible(
  masterRankedPersonIds: readonly string[],
  visibleRankedPersonIds: readonly string[],
  personId: string,
  atVisibleIndex: number,
): string[] {
  const id = personId.trim();
  if (!id) throw new CoachRankError("personId is required.");
  if (masterRankedPersonIds.includes(id)) {
    throw new CoachRankError(`Person ${id} is already ranked.`);
  }
  if (visibleRankedPersonIds.includes(id)) {
    throw new CoachRankError(`Person ${id} is already in the visible ranked list.`);
  }
  if (
    !Number.isInteger(atVisibleIndex) ||
    atVisibleIndex < 0 ||
    atVisibleIndex > visibleRankedPersonIds.length
  ) {
    throw new CoachRankError("Visible insert index is out of range.");
  }

  if (visibleRankedPersonIds.length === 0) {
    return insertUnrankedAt(
      masterRankedPersonIds,
      id,
      masterRankedPersonIds.length + 1,
    );
  }

  validateVisibleSubsequence(masterRankedPersonIds, visibleRankedPersonIds);

  if (atVisibleIndex >= visibleRankedPersonIds.length) {
    const lastVisible = visibleRankedPersonIds[visibleRankedPersonIds.length - 1];
    const lastMasterIndex = masterRankedPersonIds.indexOf(lastVisible);
    return insertUnrankedAt(masterRankedPersonIds, id, lastMasterIndex + 2);
  }

  const targetId = visibleRankedPersonIds[atVisibleIndex];
  const masterIndex = masterRankedPersonIds.indexOf(targetId);
  return insertUnrankedAt(masterRankedPersonIds, id, masterIndex + 1);
}

/** Remove a person from the ranked list (caller densifies via densifyCoachRanks). */
export function removeFromRanked(
  rankedPersonIds: readonly string[],
  personId: string,
): string[] {
  const id = personId.trim();
  return rankedPersonIds.filter((entry) => entry !== id);
}

function assertPositiveRank(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new CoachRankError(`${label} must be a positive integer.`);
  }
}

function validateVisibleSubsequence(
  master: readonly string[],
  visible: readonly string[],
): void {
  const masterIndex = new Map(master.map((id, index) => [id, index]));
  let last = -1;
  for (const id of visible) {
    const index = masterIndex.get(id);
    if (index === undefined) {
      throw new CoachRankError(`Visible person ${id} is not in the master ranked list.`);
    }
    if (index <= last) {
      throw new CoachRankError("Visible list must preserve master relative order before the move.");
    }
    last = index;
  }
}
