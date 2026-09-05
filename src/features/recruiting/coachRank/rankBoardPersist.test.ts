import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "../directory";
import { recruitProfilePatchToRow, rowToRecruitProfile } from "../supabaseMapping";
import type { RecruitProfileRow } from "../supabaseMapping";
import type { RecruitProfile } from "../types";
import { densifyCoachRanks } from "./engine";
import {
  buildRankBoardReorderArgs,
  enqueueRankBoardPersist,
  refreshModelVisibleOrder,
  resolveOrderPersistAfterDrag,
  resolveTierPersistAfterDrag,
  sameRankedPersonIds,
  type RankBoardPersistQueue,
} from "./rankBoardPersist";
import { moveRankedToTierSection } from "./tierBoard";

function person(id: string): Person {
  return {
    id,
    firstName: id,
    lastName: "Test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    relationships: [],
  } as Person;
}

function row(
  id: string,
  coachRank: number,
  tier: number | undefined,
): RecruitDirectoryRow {
  return {
    person: person(id),
    profile: {
      id: `rp-${id}`,
      personId: id,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      coachRank,
      tier,
      recruitClassYear: 2027,
    } as RecruitProfile,
    analytics: { id } as RecruitDirectoryRow["analytics"],
  };
}

/** Exact test model: Tier1 A B C; Tier5 X. */
function exactModelBoard(): RecruitDirectoryRow[] {
  return [
    row("A", 1, 1),
    row("B", 2, 1),
    row("C", 3, 1),
    row("X", 20, 5),
  ];
}

describe("Rank Board persist queue — cross-tier stickiness", () => {
  it("order-only enqueue does not wipe a pending tierUpdate (T5→T1 race)", () => {
    const queue: RankBoardPersistQueue = { order: null, tier: null };
    enqueueRankBoardPersist(queue, {
      order: ["a", "b", "c"],
      tier: { personId: "c", tier: 1 },
    });
    // Densify / repair path enqueues order only — must preserve tier.
    enqueueRankBoardPersist(queue, {
      order: ["c", "a", "b"],
      tier: null,
    });
    assert.deepEqual(queue.order, ["c", "a", "b"]);
    assert.deepEqual(queue.tier, { personId: "c", tier: 1 });

    const args = buildRankBoardReorderArgs({
      classYear: 2027,
      rankedPersonIds: queue.order!,
      tier: queue.tier,
    });
    assert.deepEqual(args.tierUpdate, { personId: "c", tier: 1 });
    assert.deepEqual(args.rankedPersonIds, ["c", "a", "b"]);
  });

  it("undefined tier enqueue leaves queued tier intact", () => {
    const queue: RankBoardPersistQueue = {
      order: ["x"],
      tier: { personId: "x", tier: 3 },
    };
    enqueueRankBoardPersist(queue, { order: ["x", "y"] });
    assert.deepEqual(queue.tier, { personId: "x", tier: 3 });
  });

  it("explicit tier payload replaces prior tier", () => {
    const queue: RankBoardPersistQueue = {
      order: ["a"],
      tier: { personId: "a", tier: 5 },
    };
    enqueueRankBoardPersist(queue, {
      order: ["a"],
      tier: { personId: "a", tier: 1 },
    });
    assert.deepEqual(queue.tier, { personId: "a", tier: 1 });
  });

  it("Unassigned (null tier) still enqueues a tierUpdate", () => {
    const queue: RankBoardPersistQueue = { order: null, tier: null };
    enqueueRankBoardPersist(queue, {
      order: ["a", "b"],
      tier: { personId: "a", tier: null },
    });
    const args = buildRankBoardReorderArgs({
      classYear: 2028,
      rankedPersonIds: queue.order!,
      tier: queue.tier,
    });
    assert.deepEqual(args.tierUpdate, { personId: "a", tier: null });
  });

  it("same-tier reorder args omit tierUpdate when no tier delta", () => {
    const args = buildRankBoardReorderArgs({
      classYear: 2027,
      rankedPersonIds: ["a", "b"],
      tier: null,
    });
    assert.equal(args.tierUpdate, undefined);
  });

  it("resolveTierPersistAfterDrag prefers live session tier", () => {
    const resolved = resolveTierPersistAfterDrag({
      personId: "finn",
      liveTier: { personId: "finn", tier: 1 },
      originTier: 5,
      currentTier: 1,
    });
    assert.deepEqual(resolved, { personId: "finn", tier: 1 });
  });

  it("resolveTierPersistAfterDrag falls back to cohort delta when liveTier lost", () => {
    const resolved = resolveTierPersistAfterDrag({
      personId: "finn",
      liveTier: null,
      originTier: 5,
      currentTier: 1,
    });
    assert.deepEqual(resolved, { personId: "finn", tier: 1 });
  });

  it("resolveTierPersistAfterDrag Unassigned ↔ null", () => {
    assert.deepEqual(
      resolveTierPersistAfterDrag({
        personId: "sam",
        liveTier: null,
        originTier: undefined,
        currentTier: 3,
      }),
      { personId: "sam", tier: 3 },
    );
    assert.deepEqual(
      resolveTierPersistAfterDrag({
        personId: "sam",
        liveTier: null,
        originTier: 3,
        currentTier: undefined,
      }),
      { personId: "sam", tier: null },
    );
    assert.equal(
      resolveTierPersistAfterDrag({
        personId: "sam",
        liveTier: null,
        originTier: 2,
        currentTier: 2,
      }),
      null,
    );
  });

  it("T5→T1 moveRankedToTierSection + densify yields correct persist args", () => {
    const ranked = [
      {
        person: { id: "t1" },
        profile: { personId: "t1", coachRank: 1, tier: 1, recruitClassYear: 2027 },
      },
      {
        person: { id: "t5" },
        profile: { personId: "t5", coachRank: 2, tier: 5, recruitClassYear: 2027 },
      },
    ] as Parameters<typeof moveRankedToTierSection>[0]["rankedRows"];

    const moved = moveRankedToTierSection({
      rankedRows: ranked,
      personId: "t5",
      toSection: 1,
      toIndexInSection: 0,
    });
    assert.equal(moved.nextTier, 1);
    assert.deepEqual(moved.nextVisibleOrder, ["t5", "t1"]);

    const densified = densifyCoachRanks(moved.nextVisibleOrder);
    assert.equal(densified.find((e) => e.personId === "t5")?.coachRank, 1);
    assert.equal(densified.find((e) => e.personId === "t1")?.coachRank, 2);

    const args = buildRankBoardReorderArgs({
      classYear: 2027,
      rankedPersonIds: moved.nextVisibleOrder,
      tier: { personId: "t5", tier: moved.nextTier },
    });
    assert.deepEqual(args.tierUpdate, { personId: "t5", tier: 1 });
  });

  it("canonical tier column maps to recruit_profiles.tier", () => {
    assert.deepEqual(recruitProfilePatchToRow({ tier: 1 }), { tier: 1 });
    assert.deepEqual(recruitProfilePatchToRow({ tier: null }), { tier: null });
    const profile = rowToRecruitProfile({
      id: "rp",
      person_id: "p1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      recruit_type_id: null,
      pipeline_stage_id: null,
      interest_id: null,
      outcome_id: null,
      coda_pipeline_stage: null,
      coda_interest: null,
      priority_id: null,
      getability_id: null,
      focus: null,
      recruit_class_year: 2027,
      coach_rank: 3,
      tier: 1,
      gpa: null,
      sat: null,
      act: null,
      academic_interests: null,
      preread_status_id: null,
      preread_scholarship_amount: null,
      schools_of_interest: null,
      school_chosen: null,
      notes: null,
      game_notes: null,
      key_pitch_angle: null,
      visit_start_date: null,
      visit_end_date: null,
      travel_type: null,
      flight_info: null,
      coda_row_id: null,
      coda_export: null,
    } as RecruitProfileRow);
    assert.equal(profile.tier, 1);
    assert.equal(profile.coachRank, 3);
  });

  it("drag hook wires enqueue helper, cohort tier fallback, and rollback", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /enqueueRankBoardPersist/);
    assert.match(dragSource, /resolveTierPersistAfterDrag/);
    assert.match(dragSource, /resolveOrderPersistAfterDrag/);
    assert.match(dragSource, /liveMasterOrderRef/);
    assert.match(dragSource, /buildRankBoardReorderArgs/);
    assert.match(dragSource, /applyRankBoardReorderAction/);
    assert.match(dragSource, /onCohortChange\(queue\.rollback\)/);
    // Must not wipe coachRank by replacing whole profile from tierProfile.
    assert.doesNotMatch(
      dragSource,
      /profile: result\.tierProfile!/,
    );
    assert.match(dragSource, /applyTierToCohort\(next, tierToApply/);
  });

  it("directory discards pending server rows on unlock (no stale overwrite)", () => {
    const directory = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/RecruitingDirectory.tsx",
      ),
      "utf8",
    );
    assert.match(directory, /persistLockRef/);
    assert.match(directory, /pendingServerRowsRef\.current = null/);
    assert.doesNotMatch(
      directory,
      /if \(!locked && pendingServerRowsRef\.current\)/,
    );
  });

  it("action validates tier + order round-trip before success", () => {
    const actions = readFileSync(
      path.join(process.cwd(), "src/features/recruiting/actions.ts"),
      "utf8",
    );
    assert.match(actions, /applyRankBoardReorderAction/);
    assert.match(actions, /Tier persist mismatch/);
    assert.match(actions, /Coach Rank order persist mismatch/);
    assert.match(actions, /neighbor mismatch after persist/);
    assert.match(actions, /getRankBoardPersistRow/);
    assert.match(actions, /Tier wiped after coach rank rewrite/);
    assert.match(actions, /updateRecruitProfile\(personId,\s*\{\s*tier:/);
    assert.match(actions, /applyCoachRankOrder/);
  });

  it("repository tier write uses WHERE person_id + select id,tier,coach_rank", () => {
    const repo = readFileSync(
      path.join(process.cwd(), "src/features/recruiting/repository.ts"),
      "utf8",
    );
    assert.match(repo, /select\("person_id, tier, coach_rank"\)/);
    assert.match(repo, /\.eq\("person_id", trimmed\)/);
    assert.match(repo, /0052_recruit_tier\.sql/);
    assert.match(repo, /getRankBoardPersistRow/);
    assert.match(repo, /"tier" in patchRow/);
  });

  it("writable field map includes tier → recruit_profiles.tier", () => {
    assert.equal(recruitProfilePatchToRow({ tier: 1 }).tier, 1);
    assert.deepEqual(recruitProfilePatchToRow({ tier: 1 }), { tier: 1 });
    // Canonical id for Rank Board is person_id (not profile.id / UTR / TRN).
    const args = buildRankBoardReorderArgs({
      classYear: 2027,
      rankedPersonIds: ["recruit-xlsx-row-382", "a", "b"],
      tier: { personId: "recruit-xlsx-row-382", tier: 1 },
    });
    assert.deepEqual(args.tierUpdate, {
      personId: "recruit-xlsx-row-382",
      tier: 1,
    });
  });

  it("hard-refresh model keeps destination tier after successful write", () => {
    const rankedPersonIds = ["A", "B", "X", "C"];
    const tierByPersonId = { A: 1, B: 1, X: 1, C: 1 } as const;
    assert.deepEqual(
      refreshModelVisibleOrder({ rankedPersonIds, tierByPersonId }),
      ["A", "B", "X", "C"],
    );
    // If DB write failed (tier still 5), refresh would put X back in Tier 5.
    assert.deepEqual(
      refreshModelVisibleOrder({
        rankedPersonIds,
        tierByPersonId: { A: 1, B: 1, X: 5, C: 1 },
      }),
      ["A", "B", "C", "X"],
    );
  });

  it("failed persist rolls UI back to origin snapshot (wired)", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /if \(!result\.success\)/);
    assert.match(dragSource, /onCohortChange\(queue\.rollback\)/);
  });
});

describe("Rank Board within-tier position persistence", () => {
  it("exact model: drop X between B and C → A B X C densified ranks", () => {
    const moved = moveRankedToTierSection({
      rankedRows: exactModelBoard(),
      personId: "X",
      toSection: 1,
      toIndexInSection: 2,
    });
    assert.equal(moved.nextTier, 1);
    assert.deepEqual(moved.nextVisibleOrder, ["A", "B", "X", "C"]);
    const densified = densifyCoachRanks(moved.nextVisibleOrder);
    assert.deepEqual(
      densified.map((e) => [e.personId, e.coachRank]),
      [
        ["A", 1],
        ["B", 2],
        ["X", 3],
        ["C", 4],
      ],
    );
  });

  it("dest index: T5→top / middle / bottom of T1", () => {
    const board = exactModelBoard();
    const top = moveRankedToTierSection({
      rankedRows: board,
      personId: "X",
      toSection: 1,
      toIndexInSection: 0,
    });
    assert.deepEqual(top.nextVisibleOrder, ["X", "A", "B", "C"]);

    const middle = moveRankedToTierSection({
      rankedRows: board,
      personId: "X",
      toSection: 1,
      toIndexInSection: 1,
    });
    assert.deepEqual(middle.nextVisibleOrder, ["A", "X", "B", "C"]);

    const bottom = moveRankedToTierSection({
      rankedRows: board,
      personId: "X",
      toSection: 1,
      toIndexInSection: 3,
    });
    assert.deepEqual(bottom.nextVisibleOrder, ["A", "B", "C", "X"]);
  });

  it("T1→middle T4 rebuilds full flattened cohort", () => {
    const board = [
      row("A", 1, 1),
      row("B", 2, 1),
      row("C", 3, 1),
      row("D", 4, 4),
      row("E", 5, 4),
    ];
    const moved = moveRankedToTierSection({
      rankedRows: board,
      personId: "B",
      toSection: 4,
      toIndexInSection: 1,
    });
    assert.equal(moved.nextTier, 4);
    assert.deepEqual(moved.nextVisibleOrder, ["A", "C", "D", "B", "E"]);
  });

  it("Unassigned→middle T2", () => {
    const board = [
      row("p", 1, 2),
      row("q", 2, 2),
      row("u", 3, undefined),
    ];
    const moved = moveRankedToTierSection({
      rankedRows: board,
      personId: "u",
      toSection: 2,
      toIndexInSection: 1,
    });
    assert.equal(moved.nextTier, 2);
    assert.deepEqual(moved.nextVisibleOrder, ["p", "u", "q"]);
  });

  it("same-tier Finn above Rafa", () => {
    const board = [
      row("isaac", 1, 1),
      row("rafa", 2, 1),
      row("finn", 3, 1),
    ];
    const moved = moveRankedToTierSection({
      rankedRows: board,
      personId: "finn",
      toSection: 1,
      toIndexInSection: 1,
    });
    assert.deepEqual(moved.nextVisibleOrder, ["isaac", "finn", "rafa"]);
    assert.equal(moved.nextTier, 1);
  });

  it("cross-tier survives refresh model (not A B C X or X A B C)", () => {
    const moved = moveRankedToTierSection({
      rankedRows: exactModelBoard(),
      personId: "X",
      toSection: 1,
      toIndexInSection: 2,
    });
    const densified = densifyCoachRanks(moved.nextVisibleOrder);
    const persistedOrder = densified.map((e) => e.personId);
    const tierByPersonId = {
      A: 1 as const,
      B: 1 as const,
      C: 1 as const,
      X: 1 as const,
    };
    const afterRefresh = refreshModelVisibleOrder({
      rankedPersonIds: persistedOrder,
      tierByPersonId,
    });
    assert.deepEqual(afterRefresh, ["A", "B", "X", "C"]);
    assert.notDeepEqual(afterRefresh, ["A", "B", "C", "X"]);
    assert.notDeepEqual(afterRefresh, ["X", "A", "B", "C"]);
  });

  it("BUG repro: tier-only + stale pre-drag order lands X at end after refresh", () => {
    // What the race used to persist: new tier, old coach ranks.
    const staleOrder = ["A", "B", "C", "X"];
    const afterRefresh = refreshModelVisibleOrder({
      rankedPersonIds: staleOrder,
      tierByPersonId: { A: 1, B: 1, C: 1, X: 1 },
    });
    assert.deepEqual(afterRefresh, ["A", "B", "C", "X"]);
  });

  it("resolveOrderPersistAfterDrag prefers live order over stale cohort", () => {
    const liveOrder = ["A", "B", "X", "C"];
    const staleCohortOrder = ["A", "B", "C", "X"];
    assert.deepEqual(
      resolveOrderPersistAfterDrag({
        liveOrder,
        cohortOrder: staleCohortOrder,
      }),
      liveOrder,
    );
    assert.deepEqual(
      resolveOrderPersistAfterDrag({
        liveOrder: null,
        cohortOrder: staleCohortOrder,
      }),
      staleCohortOrder,
    );
  });

  it("queue merge preserves final destination index (not collapsed / restored)", () => {
    const queue: RankBoardPersistQueue = { order: null, tier: null };
    // Cross-tier drop enqueues final visual order + tier.
    enqueueRankBoardPersist(queue, {
      order: ["A", "B", "X", "C"],
      tier: { personId: "X", tier: 1 },
    });
    // Later order-only densify must keep final order AND tier.
    enqueueRankBoardPersist(queue, {
      order: ["A", "B", "X", "C"],
      tier: null,
    });
    assert.deepEqual(queue.order, ["A", "B", "X", "C"]);
    assert.deepEqual(queue.tier, { personId: "X", tier: 1 });
    const args = buildRankBoardReorderArgs({
      classYear: 2027,
      rankedPersonIds: queue.order!,
      tier: queue.tier,
    });
    assert.equal(args.rankedPersonIds.indexOf("X"), 2);
    assert.deepEqual(args.tierUpdate, { personId: "X", tier: 1 });
  });

  it("sameRankedPersonIds / round-trip neighbor check model", () => {
    const written = ["A", "B", "X", "C"];
    const readBack = ["A", "B", "X", "C"];
    assert.equal(sameRankedPersonIds(written, readBack), true);
    assert.equal(sameRankedPersonIds(written, ["A", "B", "C", "X"]), false);
    const movedIndex = written.indexOf("X");
    assert.equal(readBack[movedIndex - 1], "B");
    assert.equal(readBack[movedIndex + 1], "C");
  });

  it("payload proof: before/after DB-equivalent rows for exact model", () => {
    const before = densifyCoachRanks(["A", "B", "C", "X"]).map((e) => ({
      person_id: e.personId,
      coach_rank: e.personId === "X" ? 20 : e.coachRank,
      tier: e.personId === "X" ? 5 : 1,
    }));
    // Normalize X's stored sparse rank for the fixture.
    before[3]!.coach_rank = 20;

    const moved = moveRankedToTierSection({
      rankedRows: exactModelBoard(),
      personId: "X",
      toSection: 1,
      toIndexInSection: 2,
    });
    const after = densifyCoachRanks(moved.nextVisibleOrder).map((e) => ({
      person_id: e.personId,
      coach_rank: e.coachRank,
      tier: 1,
    }));

    assert.deepEqual(before, [
      { person_id: "A", coach_rank: 1, tier: 1 },
      { person_id: "B", coach_rank: 2, tier: 1 },
      { person_id: "C", coach_rank: 3, tier: 1 },
      { person_id: "X", coach_rank: 20, tier: 5 },
    ]);
    assert.deepEqual(after, [
      { person_id: "A", coach_rank: 1, tier: 1 },
      { person_id: "B", coach_rank: 2, tier: 1 },
      { person_id: "X", coach_rank: 3, tier: 1 },
      { person_id: "C", coach_rank: 4, tier: 1 },
    ]);
  });
});
