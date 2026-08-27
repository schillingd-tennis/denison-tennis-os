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

test("central page date filters persist via URL and default to Past month", () => {
  assert.match(dashboardSource, /parseInteractionPeriod\(searchParams.get\("period"\)\)/);
  assert.match(dashboardSource, /parseInteractionKind\(searchParams.get\("kind"\)\)/);
  const period = readFileSync(join(here, "centralPeriod.ts"), "utf8");
  const filterSource = readFileSync(join(here, "components/InteractionsFilterBar.tsx"), "utf8");
  assert.match(period, /DEFAULT_INTERACTION_PERIOD: InteractionPeriod = "past_month"/);
  assert.match(period, /America\/New_York/);
  assert.match(filterSource, /interactionsPageHref/);
  assert.match(dashboardSource, /No interactions match these filters/);
});

test("notes stay normal weight on directory rows", () => {
  const notes = listSource.slice(listSource.indexOf("function InteractionNotes"), listSource.indexOf("function WorkspaceInteractionRow"));
  assert.match(notes, /whitespace-pre-wrap text-sm leading-5 text-text-primary/);
  assert.doesNotMatch(notes, /font-semibold/);
  const directory = listSource.slice(listSource.indexOf("function DirectoryInteractionRow"));
  assert.match(directory, /<InteractionNotes/);
  assert.doesNotMatch(directory, /font-semibold[\s\S]*item\.notes/);
});

test("Sync Messages sits beside Add Interaction and uses the existing queue action", () => {
  assert.match(dashboardSource, /\+ Add Interaction/);
  assert.match(dashboardSource, /InteractionsSyncMessagesButton/);
  assert.match(dashboardSource, /useAppleMessagesManualSync/);
  assert.match(dashboardSource, /data-interactions-header-actions/);
  const header = dashboardSource.slice(dashboardSource.indexOf("data-interactions-header-actions"));
  assert.ok(header.indexOf("data-interactions-add-interaction") < header.indexOf("InteractionsSyncMessagesButton"));
  const button = readFileSync(join(here, "components/InteractionsSyncMessagesButton.tsx"), "utf8");
  const hook = readFileSync(join(here, "components/useAppleMessagesManualSync.ts"), "utf8");
  const css = readFileSync(join(here, "components/interactionsHeaderActions.css"), "utf8");
  const actionSource = readFileSync(join(here, "appleMessagesSync/actions.ts"), "utf8");
  assert.match(button, /Sync Messages/);
  assert.match(button, /aria-label="Sync Messages"/);
  assert.match(button, /data-interactions-sync-messages/);
  assert.match(button, /<button[\s\S]*Loader2[\s\S]*\{label\}[\s\S]*<\/button>/);
  assert.match(css, /\[data-interactions-header-actions\]/);
  assert.match(css, /\[data-interactions-add-interaction\]/);
  assert.match(css, /\[data-interactions-sync-messages\]/);
  assert.match(css, /background: #2563eb/);
  assert.match(css, /background: #c8102e/);
  assert.match(hook, /queueAppleMessagesSyncAction/);
  assert.match(hook, /getAppleMessagesSyncStatusAction/);
  assert.match(hook, /statusAfterManualEnqueue/);
  assert.match(hook, /router\.refresh\(\)/);
  assert.match(hook, /Synced · 0 new/);
  assert.match(hook, /input\.hosted/);
  assert.match(actionSource, /isManualAppleMessagesSyncAvailable/);
  assert.match(actionSource, /available in production/);
});

test("communication alerts use Rank Board membership for Class of 2027", () => {
  const page = readFileSync(join(here, "../../app/recruiting/interactions/page.tsx"), "utf8");
  assert.match(page, /rankedPersonIdsForClass/);
  assert.match(page, /COMMUNICATION_ALERT_CLASS_YEAR/);
  assert.match(dashboardSource, /communicationAlertRecruitIds/);
  assert.match(dashboardSource, /followUpRecruits\(interactions, now, 5, alertEligibleIds\)/);
});

test("Apple Messages insight card is status-only", () => {
  const apple = readFileSync(join(here, "components/InteractionsAppleMessagesPanel.tsx"), "utf8");
  assert.match(apple, /Apple Messages/);
  assert.match(apple, /Current status/);
  assert.match(apple, /Last successful scan/);
  assert.match(apple, /Last sync with new interactions/);
  assert.match(apple, /New interactions from latest job/);
  assert.doesNotMatch(apple, /queueAppleMessagesSyncAction/);
  assert.doesNotMatch(apple, />Sync Messages</);
});

test("Clear restores default date, type, and search", () => {
  const filterSource = readFileSync(join(here, "components/InteractionsFilterBar.tsx"), "utf8");
  assert.match(filterSource, /Clear/);
  assert.match(filterSource, /DEFAULT_INTERACTION_PERIOD/);
  assert.match(filterSource, /kind: "all"/);
  assert.match(filterSource, /query: ""/);
  assert.match(filterSource, /SearchInput/);
  assert.match(filterSource, /Search interactions, recruits, notes, or tournaments/);
});

test("right column uses OS card headings and day labels", () => {
  const column = readFileSync(join(here, "components/InteractionsInsightColumn.tsx"), "utf8");
  const apple = readFileSync(join(here, "components/InteractionsAppleMessagesPanel.tsx"), "utf8");
  const alertsAt = column.indexOf("Communication Alerts");
  const activityAt = column.indexOf("Activity by Type");
  const appleAt = column.lastIndexOf("InteractionsAppleMessagesPanel");
  assert.ok(alertsAt >= 0 && activityAt > alertsAt && appleAt > activityAt);
  assert.match(column, /followUpDaysLabel/);
  assert.match(column, /Communication Alerts/);
  assert.match(column, /Activity by Type/);
  assert.doesNotMatch(column, /uppercase/);
  assert.doesNotMatch(apple, />Sync Messages</);
});
