import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { recruitingPersonPath } from "../../lib/module-routes";

const here = dirname(fileURLToPath(import.meta.url));
const listSource = readFileSync(join(here, "components/InteractionList.tsx"), "utf8");
const dashboardSource = readFileSync(join(here, "components/InteractionsDashboard.tsx"), "utf8");
const formSource = readFileSync(join(here, "components/InteractionForm.tsx"), "utf8");
const actionsSource = readFileSync(join(here, "actions.ts"), "utf8");
const confirmSource = readFileSync(join(here, "components/DeleteInteractionConfirm.tsx"), "utf8");

test("1 clicking recruit name uses the recruit workspace route helper", () => {
  assert.equal(recruitingPersonPath("person-brayden"), "/recruiting/person-brayden");
  assert.match(listSource, /recruitingPersonPath\(item\.recruitPersonId\)/);
  assert.match(listSource, /from "@\/lib\/module-routes"/);
  assert.doesNotMatch(listSource, /playersCoachesPersonPath/);
  assert.doesNotMatch(listSource, /\/players-coaches\//);
});

test("2 clicking recruit name does not open the edit drawer", () => {
  const linkBlock = listSource.match(/<Link[\s\S]*?<\/Link>/)?.[0] ?? "";
  assert.match(linkBlock, /href=\{recruitingPersonPath\(item\.recruitPersonId\)\}/);
  assert.doesNotMatch(linkBlock, /onOpen\(item\)/);
  assert.match(listSource, /function stopRow/);
  assert.match(linkBlock, /onClick=\{stopRow\}/);
  assert.match(listSource, /<div className="flex gap-3 px-4 py-3.5 max-sm:px-3">/);
});

test("3 clicking message opens the edit drawer", () => {
  assert.match(listSource, /aria-label=\{onOpen \? `Edit interaction with \$\{item\.recruitName\}`/);
  assert.match(listSource, /onOpen\(item\)/);
  assert.match(dashboardSource, /onOpen=\{openInteraction\}/);
  assert.match(dashboardSource, /interaction=\{interaction\}/);
  assert.match(dashboardSource, /id: `edit-recruit-interaction-\$\{interaction\.id\}`/);
});

test("4 clicking message does not navigate to the recruit", () => {
  assert.match(listSource, /event\.stopPropagation\(\);\s*onOpen\(item\)/);
  assert.doesNotMatch(listSource, /router\.push/);
  const workspaceRow = listSource.slice(
    listSource.indexOf("function WorkspaceInteractionRow"),
    listSource.indexOf("function DirectoryInteractionRow"),
  );
  const notesBlock = workspaceRow.slice(workspaceRow.indexOf("{item.notes ?"));
  assert.doesNotMatch(notesBlock, /recruitingPersonPath/);
});

test("5 clicking trash opens delete confirmation only", () => {
  assert.match(listSource, /onAction=\{\(\) => onDelete\(item\)\}/);
  assert.match(listSource, /onClick=\{stopRow\}/);
  assert.match(dashboardSource, /title: "Delete Interaction\?"/);
  assert.match(dashboardSource, /DeleteInteractionConfirm/);
  assert.match(confirmSource, /deleteRecruitInteractionAction\(interactionId\)/);
});

test("6 edit drawer receives the clicked interaction id", () => {
  assert.match(dashboardSource, /key=\{interaction\.id\}/);
  assert.match(dashboardSource, /interaction=\{interaction\}/);
  assert.match(formSource, /if \(interaction\) formData\.set\("interactionId", interaction\.id\)/);
  assert.match(formSource, /name="interactionId"/);
});

test("7 saving an edit updates the same interaction id", () => {
  assert.match(formSource, /if \(editing\) await updateRecruitInteractionAction/);
  assert.match(actionsSource, /updateRecruitInteraction\(id, input\)/);
  assert.match(actionsSource, /if \(!id\) throw/);
  assert.match(actionsSource, /if \(!existing\) throw/);
});

test("central directory rows show recruit name then type then date", () => {
  const directory = listSource.slice(listSource.indexOf("function DirectoryInteractionRow"));
  const meta = directory.slice(
    directory.indexOf("flex min-w-0 flex-wrap items-baseline"),
    directory.indexOf("mt-0.5 flex min-w-0 flex-col"),
  );
  const nameAt = meta.indexOf("item.recruitName");
  const typeAt = meta.indexOf("item.interactionType");
  const dateAt = meta.indexOf("formatDate(item.occurredAt)");
  assert.ok(nameAt >= 0 && typeAt > nameAt && dateAt > typeAt);
  assert.match(meta, /TEAM_DIRECTORY_NAME/);
  assert.match(meta, /typeRole\.sectionLabel/);
  assert.match(meta, /text-xs text-text-secondary/);
  assert.match(meta, /max-md:w-full/);
  const workspace = listSource.slice(
    listSource.indexOf("function WorkspaceInteractionRow"),
    listSource.indexOf("function DirectoryInteractionRow"),
  );
  const workspaceMeta = workspace.slice(
    workspace.indexOf("flex flex-wrap items-baseline"),
    workspace.indexOf("showRecruit ?"),
  );
  assert.match(workspaceMeta, /item\.interactionType/);
  assert.match(workspaceMeta, /formatDate\(item\.occurredAt\)/);
  assert.doesNotMatch(workspaceMeta, /item\.recruitName/);
});

test("Interaction slideover keeps labels emphasized and field values at normal weight", () => {
  assert.match(formSource, /const control = "h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-normal text-text-primary"/);
  assert.match(formSource, /text-xs font-semibold text-text-secondary/);
  assert.match(formSource, /h-10 rounded-control border border-border px-4 text-sm font-semibold/);
  assert.match(formSource, /h-10 rounded-control bg-denison-red px-4 text-sm font-semibold text-white/);
  assert.match(formSource, /text-sm font-normal text-text-primary/);
  assert.doesNotMatch(formSource, /mt-1 flex h-10 items-center[\s\S]*font-medium text-text-primary/);
});

test("central directory rows use compact Recruit List density without changing workspace rows", () => {
  assert.match(dashboardSource, /density="directory"/);
  assert.match(listSource, /density = "workspace"/);
  assert.match(listSource, /data-interaction-directory-row=/);
  assert.match(listSource, /min-h-\[72px\]/);
  assert.match(listSource, /line-clamp-2/);
  assert.match(listSource, /Show more/);
  assert.match(listSource, /Show less/);
  assert.match(listSource, /flex gap-3 px-4 py-3.5 max-sm:px-3/);
  const workspaces = readFileSync(
    join(here, "../recruiting/components/RecruitingWorkspaces.tsx"),
    "utf8",
  );
  assert.doesNotMatch(workspaces, /density="directory"/);
});

test("8 cancel performs no update", () => {
  assert.match(formSource, /type="button"/);
  assert.match(formSource, /onClick=\{cancel\}/);
  assert.match(formSource, /onCancel\?\.\(\)/);
  assert.match(formSource, /event\.preventDefault\(\)/);
  assert.doesNotMatch(formSource, /onClick=\{cancel\}[\s\S]*updateRecruitInteractionAction/);
});
