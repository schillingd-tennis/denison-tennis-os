import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { moveItem } from "@/features/practice/reorder";

import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "../directory";
import type { RecruitProfile } from "../types";
import { densifyCoachRanks } from "./engine";
import {
  appendRankedToTierSection,
  flattenRankedTier,
  moveRankedToTierSection,
  moveRankedVisualByDelta,
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

function board(): RecruitDirectoryRow[] {
  return [
    row("isaac", 1, 1),
    row("rafa", 2, 1),
    row("finn", 3, 2),
    row("lee", 4, 2),
    row("sam", 5, undefined),
  ];
}

describe("Rank Board Practice-style DnD persistence payloads", () => {
  it("A. within-tier Rafa above Isaac yields dense coachRank payload", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
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

  it("B. cross-tier Finn T2→T1 between Isaac/Rafa updates tier + order", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
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
  });

  it("C. empty tier drop appends as first in destination", () => {
    const result = moveRankedToTierSection({
      rankedRows: board(),
      personId: "lee",
      toSection: 4,
      toIndexInSection: 0,
    });
    assert.equal(result.nextTier, 4);
    // T1: isaac,rafa · T2: finn · T4: lee · Unassigned: sam
    assert.deepEqual(result.nextVisibleOrder, [
      "isaac",
      "rafa",
      "finn",
      "lee",
      "sam",
    ]);
  });

  it("D. Move Up/Down within board uses Practice delta pattern", () => {
    const up = moveRankedVisualByDelta({
      rankedRows: board(),
      personId: "rafa",
      delta: -1,
    });
    assert.ok(up);
    assert.deepEqual(up!.nextVisibleOrder.slice(0, 2), ["rafa", "isaac"]);
    assert.equal(up!.nextTier, 1);

    const cross = moveRankedVisualByDelta({
      rankedRows: board(),
      personId: "finn",
      delta: -1,
    });
    assert.ok(cross);
    assert.equal(cross!.nextTier, 1);
  });

  it("E. tier dropdown appends to destination bottom", () => {
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

  it("F. Practice moveItem powers within-list reorder (same as DailyPlanBuilder)", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(moveItem(["rafa", "isaac", "finn"], 0, 2), [
      "isaac",
      "finn",
      "rafa",
    ]);
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /from "@\/features\/practice\/reorder"/);
  });

  it("G. Unassigned ↔ Tier null tier payloads", () => {
    const toUnassigned = moveRankedToTierSection({
      rankedRows: board(),
      personId: "rafa",
      toSection: "unassigned",
      toIndexInSection: 0,
    });
    assert.equal(toUnassigned.nextTier, null);

    const toTier = moveRankedToTierSection({
      rankedRows: board(),
      personId: "sam",
      toSection: 2,
      toIndexInSection: 1,
    });
    assert.equal(toTier.nextTier, 2);
  });

  it("H. flattened visual order is canonical coachRank sequence", () => {
    assert.deepEqual(flattenRankedTier(board()), [
      "isaac",
      "rafa",
      "finn",
      "lee",
      "sam",
    ]);
  });

  it("I. drag hook uses single coherent persist action + rollback", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /applyRankBoardReorderAction/);
    assert.match(dragSource, /onCohortChange\(queue\.rollback\)/);
    assert.match(dragSource, /persist: false/);
    assert.match(dragSource, /setPointerCapture/);
    assert.doesNotMatch(dragSource, /updateRecruitProfileAction/);
    assert.doesNotMatch(dragSource, /applyCoachRankOrderAction/);
  });

  it("K. global window drag session survives cross-tier remounts", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    // ONE session on window — not per-tier DndContext / capture-only.
    assert.match(dragSource, /window\.addEventListener\("pointermove"/);
    assert.match(dragSource, /window\.addEventListener\("pointerup"/);
    assert.match(dragSource, /window\.removeEventListener\("pointermove"/);
    assert.doesNotMatch(dragSource, /DndContext|SortableContext|@dnd-kit/);
    // Mid-drag is preview-only; persist only via endDragSession → persistBoard.
    assert.match(dragSource, /Single persist at drag end/);
    assert.match(dragSource, /persist: false/);
    // Geometry collision over all tiers (not adjacent-only).
    assert.match(dragSource, /resolveRankBoardPointerTarget|collectHitSections/);
    assert.match(dragSource, /data-rank-tier-section/);
    // Edge auto-scroll while holding.
    assert.match(dragSource, /rankBoardEdgeScrollDelta|autoScrollAtPointer/);
  });

  it("M. mid-drag never persists; only endDragSession calls persistBoard", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    // applyLiveTarget always passes persist: false.
    const liveBlocks = [
      ...dragSource.matchAll(/applyMasterOrder\([^)]*\{[\s\S]*?persist:\s*false[\s\S]*?\}\)/g),
    ];
    assert.ok(liveBlocks.length >= 3, "expected multiple persist:false live previews");
    // persistBoard is only invoked from endDragSession / non-drag helpers — not applyLiveTarget.
    const applyLiveStart = dragSource.indexOf("const applyLiveTarget");
    const applyLiveEnd = dragSource.indexOf("function resolvePointerTarget");
    assert.ok(applyLiveStart > 0 && applyLiveEnd > applyLiveStart);
    const liveBody = dragSource.slice(applyLiveStart, applyLiveEnd);
    assert.doesNotMatch(liveBody, /persistBoard\(/);
    assert.match(liveBody, /persist: false/);
    // Active drag remains valid: window listeners + draggingRef, not handle DOM identity.
    assert.match(dragSource, /draggingRef\.current !== personId/);
    assert.match(dragSource, /sessionCleanupRef/);
  });

  it("L. Rank View exposes all tiers as simultaneous droppables + board root", () => {
    const view = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/RecruitRankView.tsx",
      ),
      "utf8",
    );
    assert.match(view, /data-rank-board-root/);
    assert.match(view, /data-tier-drop-zone=\{String\(section\)\}/);
    assert.match(view, /hoverTarget/);
    assert.match(view, /hoverSection/);
    assert.doesNotMatch(view, /DndContext|SortableContext|@dnd-kit/);
  });

  it("J. filtered protection + Practice visuals wired in Rank View", () => {
    const view = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/RecruitRankView.tsx",
      ),
      "utf8",
    );
    assert.match(view, /Clear filters or search to reorder/);
    assert.match(view, /ranked\.length === classRankedCount/);
    assert.match(view, /RankBoardSequenceCard/);
    assert.match(view, /data-rank-board-item/);
    assert.match(view, /data-tier-drop-zone/);
    assert.match(view, /Drop recruit here/);
    assert.match(view, /onHandlePointerMove/);
    assert.match(view, /stopPropagation/);

    const directory = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/RecruitingDirectory.tsx",
      ),
      "utf8",
    );
    assert.match(directory, /persistLockRef/);
    assert.match(directory, /onPersistLockChange/);
    assert.match(directory, /pendingServerRowsRef\.current = null/);
  });
});
