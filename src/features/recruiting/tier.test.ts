import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import type { Person } from "@/features/people/types";

import type { RecruitDirectoryRow } from "./directory";
import { RECRUITING_DIRECTORY_TABLE_COLUMNS } from "./directoryColumns";
import { buildRecruitingFilterDefinitions } from "./filters";
import { recruitProfilePatchToRow } from "./supabaseMapping";
import {
  compareRecruitTier,
  formatTierCompact,
  formatTierLabel,
  groupRankedRowsByTier,
  isRecruitBoardTier,
  parseRecruitTier,
  tierSectionIdForProfile,
} from "./tier";
import type { RecruitProfile } from "./types";

const migrationSql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/0052_recruit_tier.sql"),
  "utf8",
);
const rankViewSource = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitRankView.tsx"),
  "utf8",
);
const workspacesSource = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitingWorkspaces.tsx"),
  "utf8",
);
const profileFieldsSource = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitProfileFields.tsx"),
  "utf8",
);
const todayBetaPageSource = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/todayBeta/components/TodayBetaPage.tsx"),
  "utf8",
);
const listSource = readFileSync(
  path.join(process.cwd(), "src/features/recruiting/components/RecruitList.tsx"),
  "utf8",
);

function person(id: string, name: string): Person {
  return {
    id,
    firstName: name,
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
  const profile = {
    id: `rp-${id}`,
    personId: id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    coachRank,
    tier,
  } as RecruitProfile;
  return {
    person: person(id, id),
    profile,
    analytics: {
      id,
      tier: "5 - Depth",
    } as RecruitDirectoryRow["analytics"],
  };
}

describe("recruit board tier", () => {
  it("migration adds nullable tier 1–5 check additively", () => {
    assert.match(migrationSql, /add column if not exists tier smallint/);
    assert.match(migrationSql, /tier between 1 and 5/);
    assert.doesNotMatch(migrationSql, /drop table/i);
    assert.doesNotMatch(migrationSql, /truncate/i);
  });

  it("parses and formats tier values including unassigned", () => {
    assert.equal(parseRecruitTier("3"), 3);
    assert.equal(parseRecruitTier(""), null);
    assert.equal(parseRecruitTier("9"), undefined);
    assert.equal(isRecruitBoardTier(1), true);
    assert.equal(isRecruitBoardTier(null), false);
    assert.equal(formatTierCompact(2), "T2");
    assert.equal(formatTierCompact(undefined), "—");
    assert.equal(formatTierLabel(null), "Unassigned");
    assert.equal(formatTierLabel(1), "Tier 1");
    assert.equal(tierSectionIdForProfile({}), "unassigned");
    assert.equal(tierSectionIdForProfile({ tier: 4 }), 4);
  });

  it("persists tier 1–5 and null via profile patch mapping", () => {
    assert.deepEqual(recruitProfilePatchToRow({ tier: 1 }), { tier: 1 });
    assert.deepEqual(recruitProfilePatchToRow({ tier: 5 }), { tier: 5 });
    assert.deepEqual(recruitProfilePatchToRow({ tier: null }), { tier: null });
    assert.equal("coach_rank" in recruitProfilePatchToRow({ tier: 2 }), false);
  });

  it("sorts T1…T5 then Unassigned", () => {
    assert.ok(compareRecruitTier(1, 2) < 0);
    assert.ok(compareRecruitTier(5, undefined) < 0);
    assert.ok(compareRecruitTier(null, 1) > 0);
  });

  it("groups ranked board by tier and preserves coach-rank order within section", () => {
    const ranked = [
      row("a", 1, 2),
      row("b", 2, 1),
      row("c", 3, 2),
      row("d", 4, undefined),
      row("e", 5, 1),
    ];
    const groups = groupRankedRowsByTier(ranked);
    assert.deepEqual(
      groups.map((g) => g.section),
      [1, 2, 3, 4, 5, "unassigned"],
    );
    assert.deepEqual(
      groups.find((g) => g.section === 1)?.rows.map((r) => r.person.id),
      ["b", "e"],
    );
    assert.deepEqual(
      groups.find((g) => g.section === 2)?.rows.map((r) => r.person.id),
      ["a", "c"],
    );
    assert.equal(groups.find((g) => g.section === 3)?.rows.length, 0);
    assert.deepEqual(
      groups.find((g) => g.section === "unassigned")?.rows.map((r) => r.person.id),
      ["d"],
    );
    // Global coach ranks unchanged on rows
    assert.equal(ranked[0]?.profile.coachRank, 1);
    assert.equal(ranked[0]?.profile.tier, 2);
    // Section counts
    assert.equal(groups.find((g) => g.section === 1)?.rows.length, 2);
    assert.equal(groups.find((g) => g.section === 2)?.rows.length, 2);
    assert.equal(groups.find((g) => g.section === "unassigned")?.rows.length, 1);
  });

  it("changing tier would place recruit in a different section without altering rank", () => {
    const before = groupRankedRowsByTier([row("x", 7, 3)]);
    assert.equal(before.find((g) => g.section === 3)?.rows[0]?.profile.coachRank, 7);
    const after = groupRankedRowsByTier([row("x", 7, 1)]);
    assert.equal(after.find((g) => g.section === 1)?.rows[0]?.profile.coachRank, 7);
    assert.equal(after.find((g) => g.section === 3)?.rows.length, 0);
  });

  it("Rank Board groups by tier, shows global coachRank, and enables tier drag handles", () => {
    assert.match(rankViewSource, /groupRankedRowsByTier/);
    assert.match(rankViewSource, /data-rank-tier-section/);
    assert.match(rankViewSource, /row\.profile\.coachRank/);
    assert.match(rankViewSource, /onHandlePointerDown/);
    assert.match(rankViewSource, /RankedDragHandle/);
    assert.match(rankViewSource, /setPointerCapture|onHandlePointerMove/);
    assert.match(rankViewSource, /moveRankedToTierSection|movePersonInBoard|reorderEnabled/);
    assert.match(rankViewSource, /Clear filters or search to reorder/);
    assert.match(rankViewSource, /RankBoardSequenceCard|drag the handle to reorder/);
    assert.match(rankViewSource, /commit/);
  });

  it("filtered Rank Board disables reorder when ranked rows are hidden", () => {
    assert.match(rankViewSource, /ranked\.length === classRankedCount/);
    assert.match(rankViewSource, /reorderEnabled/);
  });

  it("drag persist rolls back cohort on failure", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /onCohortChange\(queue\.rollback\)/);
    assert.match(dragSource, /applyRankBoardReorderAction/);
    assert.match(dragSource, /setPointerCapture/);
    assert.match(dragSource, /elementFromPoint|resolveRankBoardPointerTarget/);
    assert.match(dragSource, /moveItem/);
    assert.match(dragSource, /stopPropagation/);
    assert.match(dragSource, /window\.addEventListener\("pointermove"/);
  });

  it("Rank Board reuses Practice Sequence reorder helper", () => {
    const dragSource = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/components/useRankedBoardDrag.ts",
      ),
      "utf8",
    );
    assert.match(dragSource, /@\/features\/practice\/reorder/);
    assert.match(
      readFileSync(
        path.join(process.cwd(), "src/features/recruiting/actions.ts"),
        "utf8",
      ),
      /applyRankBoardReorderAction/,
    );
  });

  it("inclusion rules still use coachRank presence for Rank Board membership", () => {
    const monitoring = readFileSync(
      path.join(
        process.cwd(),
        "src/features/recruiting/todayBeta/monitoringCohort.ts",
      ),
      "utf8",
    );
    assert.match(monitoring, /coachRank !== undefined/);
    assert.doesNotMatch(
      rankViewSource,
      /coachRank !== undefined.*tier/,
    );
  });

  it("list exposes sortable/filterable tier column", () => {
    const tierCol = RECRUITING_DIRECTORY_TABLE_COLUMNS.find((c) => c.id === "tier");
    assert.ok(tierCol);
    assert.equal(tierCol?.sortable, true);
    assert.equal(tierCol?.accessor(row("a", 1, 2)), 2);
    assert.equal(tierCol?.accessor(row("b", 1, undefined)), 6);

    const filters = buildRecruitingFilterDefinitions([row("a", 1, 2), row("b", 1, undefined)]);
    const tierFilters = filters.filter((f) => f.category === "tier");
    assert.equal(tierFilters.length, 6);
    assert.equal(tierFilters.find((f) => f.id === "tier:2")?.predicate(row("a", 1, 2)), true);
    assert.equal(
      tierFilters.find((f) => f.id === "tier:none")?.predicate(row("b", 1, undefined)),
      true,
    );
    assert.match(listSource, /sortDir\("tier"\)/);
    assert.match(listSource, /T\{row\.profile\.tier\}/);
  });

  it("Recruit Detail exposes Tier after Priority via profile field session", () => {
    assert.match(workspacesSource, /RecruitTierBadgeField/);
    assert.match(workspacesSource, /label="Tier"/);
    assert.match(profileFieldsSource, /\|\s*"tier"/);
    assert.match(profileFieldsSource, /TIER_DETAIL_SELECT_OPTIONS/);
    assert.match(profileFieldsSource, /field === "tier"/);
    assert.match(profileFieldsSource, /tier: parsed/);
  });

  it("Today Beta shows compact T# badge beside recruit identity", () => {
    assert.match(todayBetaPageSource, /formatTierCompact/);
    assert.match(todayBetaPageSource, /player\.tier/);
    assert.match(todayBetaPageSource, /opportunity\.recruitTier/);
  });
});
