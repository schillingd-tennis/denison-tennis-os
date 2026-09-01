import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const modulePageShell = readFileSync(join(root, "components/ModulePageShell.tsx"), "utf8");

const MODULE_HEADERS = [
  {
    page: "Team",
    file: "features/people/components/PeopleDirectory.tsx",
    title: "Team",
  },
  {
    page: "Dashboard",
    file: "features/recruiting/components/RecruitingDashboard.tsx",
    title: "Recruiting Dashboard",
  },
  {
    page: "Recruit List",
    file: "features/recruiting/components/RecruitingDirectory.tsx",
    title: "Recruiting",
  },
  {
    page: "Tournaments",
    file: "features/tournaments/components/TournamentsDashboard.tsx",
    title: "Tournaments",
  },
  {
    page: "Interactions",
    file: "features/interactions/components/InteractionsDashboard.tsx",
    title: "Interactions",
  },
  {
    page: "Log",
    file: "features/recruiting/changeLog/RecruitingChangeLogPage.tsx",
    title: "Log",
  },
  {
    page: "Today Beta",
    file: "features/recruiting/todayBeta/components/TodayBetaPage.tsx",
    title: "Today Beta",
  },
] as const;

test("ModulePageShell locks title-case header typography without uppercase transform", () => {
  assert.match(modulePageShell, /text-xl font-semibold tracking-tight text-text-primary md:text-3xl/);
  assert.doesNotMatch(modulePageShell, /uppercase/);
});

for (const { page, file, title } of MODULE_HEADERS) {
  test(`${page} uses ModulePageShell with title-case title ${title}`, () => {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /ModulePageShell/);
    assert.match(source, new RegExp(`title="${title}"`));
    assert.doesNotMatch(source, new RegExp(`title="${title.toUpperCase()}"`));
  });
}

test("Recruiting Dashboard action stays on the canonical add-recruit workflow", () => {
  const dashboard = readFileSync(
    join(root, "features/recruiting/components/RecruitingDashboard.tsx"),
    "utf8",
  );
  assert.match(dashboard, /\+ ADD RECRUIT/);
  assert.doesNotMatch(dashboard, /\+ ADD PLAYER/);
  assert.match(dashboard, /useAddRecruitDrawer/);
});
