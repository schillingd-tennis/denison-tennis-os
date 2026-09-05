import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "../directory";
import type { RecruitProfile } from "../types";
import { densifyCoachRanks } from "./engine";
import {
  appendRankedToTierSection,
  flattenRankedTier,
  isTierSequentialBoardOrder,
  moveRankedToTierSection,
  moveRankedVisualByDelta,
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
    } as RecruitProfile,
    analytics: { id } as RecruitDirectoryRow["analytics"],
  };
}

function board(): RecruitDirectoryRow[] {
  // Visual: T1=[isaac#1, rafa#2, finn#3] but finn starts in T2 in some tests
  return [
    row("isaac", 1, 1),
    row("rafa", 2, 1),
    row("finn", 3, 2),
    row("lee", 4, 2),
    row("sam", 5, undefined),
  ];
}

describe("tier board drag order", () => {
  it("flattens Tier 1…5 then Unassigned and reports counts", () => {
    const ranked = board();
    assert.deepEqual(flattenRankedTier(ranked), [
      "isaac",
      "rafa",
      "finn",
      "lee",
      "sam",
    ]);
    assert.deepEqual(sectionCounts(ranked), {
      1: 2,
      2: 2,
      3: 0,
      4: 0,
      5: 0,
      unassigned: 1,
    });
    assert.equal(isTierSequentialBoardOrder(ranked), true);
  });

  it("reorders within the same tier", () => {
    const ranked = board();
    const result = moveRankedToTierSection({
      rankedRows: ranked,
      personId: "rafa",
      toSection: 1,
      toIndexInSection: 0,
    });
    assert.deepEqual(result.nextVisibleOrder.slice(0, 2), ["rafa", "isaac"]);
    assert.equal(result.nextTier, 1);
    const densified = densifyCoachRanks(result.nextVisibleOrder);
    assert.equal(densified.find((e) => e.personId === "rafa")?.coachRank, 1);
    assert.equal(densified.find((e) => e.personId === "isaac")?.coachRank, 2);
  });

  it("moves cross-tier and updates tier (T2 → T1 between isaac and rafa)", () => {
    const ranked = board();
    const result = moveRankedToTierSection({
      rankedRows: ranked,
      personId: "finn",
      toSection: 1,
      toIndexInSection: 1,
    });
    assert.equal(result.nextTier, 1);
    assert.deepEqual(result.nextVisibleOrder.slice(0, 3), [
      "isaac",
      "finn",
      "rafa",
    ]);
    assert.equal(
      densifyCoachRanks(result.nextVisibleOrder).find((e) => e.personId === "finn")
        ?.coachRank,
      2,
    );
  });

  it("moves Tier → Unassigned (null tier)", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
      personId: "rafa",
      toSection: "unassigned",
      toIndexInSection: 0,
    });
    assert.equal(result.nextTier, null);
    assert.ok(result.nextVisibleOrder.indexOf("rafa") > result.nextVisibleOrder.indexOf("lee"));
    assert.equal(result.nextVisibleOrder[result.nextVisibleOrder.length - 2], "rafa");
  });

  it("moves Unassigned → Tier", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
      personId: "sam",
      toSection: 2,
      toIndexInSection: 1,
    });
    assert.equal(result.nextTier, 2);
    assert.deepEqual(
      result.nextVisibleOrder.filter((id) => ["finn", "sam", "lee"].includes(id)),
      ["finn", "sam", "lee"],
    );
  });

  it("drops onto an empty tier as first", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
      personId: "lee",
      toSection: 4,
      toIndexInSection: 0,
    });
    assert.equal(result.nextTier, 4);
    const idx = result.nextVisibleOrder.indexOf("lee");
    // After T1 (2) + T2 (1 remaining finn) = index 3 before empty T3
    assert.equal(result.nextVisibleOrder[idx], "lee");
    assert.equal(
      sectionCounts(
        result.nextVisibleOrder.map((id, i) => {
          const base = board().find((r) => r.person.id === id)!;
          return {
            ...base,
            profile: {
              ...base.profile,
              coachRank: i + 1,
              tier: id === "lee" ? 4 : base.profile.tier,
            },
          };
        }),
      )[4],
      1,
    );
  });

  it("appends to destination tier bottom on dropdown-style move", () => {
    const result = appendRankedToTierSection({
      rankedRows: board(),
      personId: "sam",
      toSection: 1,
    });
    assert.equal(result.nextTier, 1);
    assert.deepEqual(result.nextVisibleOrder.slice(0, 3), [
      "isaac",
      "rafa",
      "sam",
    ]);
  });

  it("move up/down adopts neighbor tier when crossing sections", () => {
    const up = moveRankedVisualByDelta({
      rankedRows: board(),
      personId: "finn",
      delta: -1,
    });
    assert.ok(up);
    assert.equal(up!.nextTier, 1);
    assert.deepEqual(up!.nextVisibleOrder.slice(0, 3), [
      "isaac",
      "finn",
      "rafa",
    ]);

    const down = moveRankedVisualByDelta({
      rankedRows: board(),
      personId: "rafa",
      delta: 1,
    });
    assert.ok(down);
    assert.equal(down!.nextTier, 2);
  });

  it("detects non-sequential interleaved ranks", () => {
    const interleaved = [
      row("a", 1, 2),
      row("b", 2, 1),
      row("c", 3, 2),
    ];
    assert.equal(isTierSequentialBoardOrder(interleaved), false);
    assert.deepEqual(flattenRankedTier(interleaved), ["b", "a", "c"]);
  });

  it("dropdown-style append and section counts stay coherent after cross-tier move", () => {
    const ranked = [
      row("a", 1, 1),
      row("b", 2, 1),
      row("c", 3, 2),
    ];
    const moved = appendRankedToTierSection({
      rankedRows: ranked,
      personId: "c",
      toSection: 1,
    });
    assert.equal(moved.nextTier, 1);
    assert.deepEqual(moved.nextVisibleOrder, ["a", "b", "c"]);
    const after = moved.nextVisibleOrder.map((id, index) => {
      const base = ranked.find((r) => r.person.id === id)!;
      return {
        ...base,
        profile: {
          ...base.profile,
          coachRank: index + 1,
          tier: id === "c" ? 1 : base.profile.tier,
        },
      };
    });
    assert.equal(sectionCounts(after)[1], 3);
    assert.equal(sectionCounts(after)[2], 0);
  });
});
