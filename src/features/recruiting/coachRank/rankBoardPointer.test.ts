import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "../directory";
import type { RecruitProfile } from "../types";
import { densifyCoachRanks } from "./engine";
import {
  insertIndexFromMidYs,
  previewMultiTierDrag,
  rankBoardEdgeScrollDelta,
  resolveRankBoardPointerTarget,
  type RankBoardHitSection,
} from "./rankBoardPointer";
import {
  flattenRankedTier,
  moveRankedToTierSection,
  sectionCounts,
} from "./tierBoard";

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

/** One recruit per tier T1…T5 for multi-hop gesture tests. */
function fiveTierBoard(): RecruitDirectoryRow[] {
  return [
    row("t1", 1, 1),
    row("t2", 2, 2),
    row("t3", 3, 3),
    row("t4", 4, 4),
    row("t5", 5, 5),
  ];
}

function applyOrder(
  order: string[],
  tiers: Record<string, number | undefined>,
): RecruitDirectoryRow[] {
  return order.map((id, index) =>
    row(id, index + 1, tiers[id]),
  );
}

describe("rankBoardPointer — multi-container collision + auto-scroll", () => {
  it("insertIndexFromMidYs maps pointer to top/middle/bottom slots", () => {
    assert.equal(insertIndexFromMidYs(10, [50, 100, 150]), 0);
    assert.equal(insertIndexFromMidYs(75, [50, 100, 150]), 1);
    assert.equal(insertIndexFromMidYs(125, [50, 100, 150]), 2);
    assert.equal(insertIndexFromMidYs(200, [50, 100, 150]), 3);
    assert.equal(insertIndexFromMidYs(0, []), 0);
  });

  it("resolveRankBoardPointerTarget hits any tier, not only adjacent", () => {
    const sections: RankBoardHitSection[] = [
      {
        section: 1,
        rect: { top: 0, bottom: 80, left: 0, right: 200 },
        otherMidYs: [40],
        collapsed: false,
        empty: false,
      },
      {
        section: 2,
        rect: { top: 80, bottom: 160, left: 0, right: 200 },
        otherMidYs: [120],
        collapsed: false,
        empty: false,
      },
      {
        section: 3,
        rect: { top: 160, bottom: 240, left: 0, right: 200 },
        otherMidYs: [],
        collapsed: false,
        empty: true,
      },
      {
        section: 4,
        rect: { top: 240, bottom: 280, left: 0, right: 200 },
        otherMidYs: [],
        collapsed: true,
        empty: true,
      },
      {
        section: 5,
        rect: { top: 280, bottom: 360, left: 0, right: 200 },
        otherMidYs: [320],
        collapsed: false,
        empty: false,
      },
    ];

    // Pointer over Tier 1 while conceptually dragging from Tier 5.
    assert.deepEqual(resolveRankBoardPointerTarget(50, 30, sections), {
      section: 1,
      indexInSection: 0,
    });
    assert.deepEqual(resolveRankBoardPointerTarget(50, 200, sections), {
      section: 3,
      indexInSection: 0,
    });
    assert.deepEqual(resolveRankBoardPointerTarget(50, 260, sections), {
      section: 4,
      indexInSection: 0,
    });
    assert.deepEqual(resolveRankBoardPointerTarget(50, 340, sections), {
      section: 5,
      indexInSection: 1,
    });
    assert.equal(resolveRankBoardPointerTarget(50, 900, sections), null);
  });

  it("empty and collapsed tiers remain valid droppables", () => {
    const sections: RankBoardHitSection[] = [
      {
        section: 2,
        rect: { top: 0, bottom: 40, left: 0, right: 100 },
        otherMidYs: [],
        collapsed: true,
        empty: true,
      },
      {
        section: "unassigned",
        rect: { top: 40, bottom: 120, left: 0, right: 100 },
        otherMidYs: [],
        collapsed: false,
        empty: true,
      },
    ];
    assert.deepEqual(resolveRankBoardPointerTarget(10, 20, sections), {
      section: 2,
      indexInSection: 0,
    });
    assert.deepEqual(resolveRankBoardPointerTarget(10, 80, sections), {
      section: "unassigned",
      indexInSection: 0,
    });
  });

  it("auto-scroll delta activates near top/bottom edges only", () => {
    assert.equal(rankBoardEdgeScrollDelta(200, 0, 400), 0);
    assert.ok(rankBoardEdgeScrollDelta(10, 0, 400) < 0);
    assert.ok(rankBoardEdgeScrollDelta(390, 0, 400) > 0);
    assert.equal(rankBoardEdgeScrollDelta(0, 0, 0), 0);
  });
});

describe("multi-tier drag gesture model (T5↔T1)", () => {
  it("1. one drag T5→T1 lands with correct tier + insertion", () => {
    let board = fiveTierBoard();
    const final = previewMultiTierDrag(
      ({ toSection, toIndexInSection }) => {
        const result = moveRankedToTierSection({
          rankedRows: board,
          personId: "t5",
          toSection,
          toIndexInSection,
        });
        const tiers: Record<string, number | undefined> = {
          t1: 1,
          t2: 2,
          t3: 3,
          t4: 4,
          t5: toSection === "unassigned" ? undefined : toSection,
        };
        // Intermediate hops update live preview board.
        board = applyOrder(result.nextVisibleOrder, {
          ...tiers,
          t5: result.nextTier === null ? undefined : result.nextTier,
        });
        return result;
      },
      [
        { toSection: 4, toIndexInSection: 0 },
        { toSection: 3, toIndexInSection: 0 },
        { toSection: 2, toIndexInSection: 0 },
        { toSection: 1, toIndexInSection: 1 },
      ],
    );
    assert.ok(final);
    assert.equal(final!.nextTier, 1);
    assert.deepEqual(final!.nextVisibleOrder.slice(0, 2), ["t1", "t5"]);
    const densified = densifyCoachRanks(final!.nextVisibleOrder);
    assert.equal(densified.find((e) => e.personId === "t5")?.coachRank, 2);
    assert.equal(new Set(final!.nextVisibleOrder).size, 5);
  });

  it("2. one drag T1→T5 lands with correct tier + order", () => {
    let board = fiveTierBoard();
    const final = previewMultiTierDrag(
      ({ toSection, toIndexInSection }) => {
        const result = moveRankedToTierSection({
          rankedRows: board,
          personId: "t1",
          toSection,
          toIndexInSection,
        });
        board = applyOrder(
          result.nextVisibleOrder,
          Object.fromEntries(
            result.nextVisibleOrder.map((id) => {
              if (id === "t1") {
                return [id, result.nextTier === null ? undefined : result.nextTier];
              }
              const n = Number(id.slice(1));
              return [id, n];
            }),
          ),
        );
        return result;
      },
      [
        { toSection: 2, toIndexInSection: 0 },
        { toSection: 3, toIndexInSection: 0 },
        { toSection: 4, toIndexInSection: 0 },
        // Append after existing T5 member.
        { toSection: 5, toIndexInSection: 1 },
      ],
    );
    assert.ok(final);
    assert.equal(final!.nextTier, 5);
    assert.equal(final!.nextVisibleOrder[final!.nextVisibleOrder.length - 1], "t1");
    assert.ok(final!.nextVisibleOrder.indexOf("t1") > final!.nextVisibleOrder.indexOf("t5"));
    assert.equal(new Set(final!.nextVisibleOrder).size, 5);
  });

  it("3. crosses multiple intermediate containers in one gesture chain", () => {
    let board = fiveTierBoard();
    const hops = [4, 3, 2, 1] as const;
    const seen = new Set<number>();
    for (const toSection of hops) {
      const result = moveRankedToTierSection({
        rankedRows: board,
        personId: "t5",
        toSection,
        toIndexInSection: 0,
      });
      seen.add(toSection);
      board = applyOrder(result.nextVisibleOrder, {
        t1: 1,
        t2: 2,
        t3: 3,
        t4: 4,
        t5: result.nextTier === null ? undefined : result.nextTier,
      });
      assert.equal(result.nextTier, toSection);
    }
    assert.deepEqual([...seen], [4, 3, 2, 1]);
    assert.equal(flattenRankedTier(board)[0], "t5");
  });

  it("8. empty Tier destination accepts append at index 0", () => {
    const board = [
      row("a", 1, 1),
      row("b", 2, 5),
    ];
    const result = moveRankedToTierSection({
      rankedRows: board,
      personId: "b",
      toSection: 3,
      toIndexInSection: 0,
    });
    assert.equal(result.nextTier, 3);
    assert.deepEqual(result.nextVisibleOrder, ["a", "b"]);
    assert.equal(sectionCounts(applyOrder(result.nextVisibleOrder, { a: 1, b: 3 }))[3], 1);
  });

  it("9. collapsed-style destination (empty section) stays valid", () => {
    const hit = resolveRankBoardPointerTarget(5, 10, [
      {
        section: 4,
        rect: { top: 0, bottom: 32, left: 0, right: 100 },
        otherMidYs: [],
        collapsed: true,
        empty: true,
      },
    ]);
    assert.deepEqual(hit, { section: 4, indexInSection: 0 });
  });

  it("10. insertion index between existing recruits", () => {
    const result = moveRankedToTierSection({
      rankedRows: [
        row("a", 1, 1),
        row("b", 2, 1),
        row("c", 3, 5),
      ],
      personId: "c",
      toSection: 1,
      toIndexInSection: 1,
    });
    assert.deepEqual(result.nextVisibleOrder, ["a", "c", "b"]);
    assert.equal(result.nextTier, 1);
  });

  it("11+12. densified order is refresh/persistence model without duplicates", () => {
    const result = moveRankedToTierSection({
      rankedRows: fiveTierBoard(),
      personId: "t5",
      toSection: 1,
      toIndexInSection: 0,
    });
    const densified = densifyCoachRanks(result.nextVisibleOrder);
    assert.equal(densified.length, 5);
    assert.equal(new Set(densified.map((e) => e.personId)).size, 5);
    assert.deepEqual(
      densified.map((e) => e.coachRank),
      [1, 2, 3, 4, 5],
    );
    assert.equal(densified[0]?.personId, "t5");
  });
});
