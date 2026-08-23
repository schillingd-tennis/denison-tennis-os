import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readInteractionFormData } from "./formData";
import { createSaveLock } from "./saveLock";

test("save lock allows only one in-flight start", () => {
  const lock = createSaveLock();
  assert.equal(lock.tryStart(), true);
  assert.equal(lock.tryStart(), false);
  assert.equal(lock.pending, true);
  lock.finish();
  assert.equal(lock.tryStart(), true);
});

test("create form data has no interaction id", () => {
  const formData = new FormData();
  formData.set("recruitPersonId", "recruit-1");
  formData.set("occurredAt", "2026-08-23");
  formData.set("interactionType", "text");
  formData.set("notes", "Hello");
  const parsed = readInteractionFormData(formData);
  assert.equal(parsed.id, null);
  assert.equal(parsed.input.recruitPersonId, "recruit-1");
  assert.equal(parsed.input.interactionType, "text");
  assert.equal(parsed.input.notes, "Hello");
});

test("edit form data keeps the existing interaction id", () => {
  const formData = new FormData();
  formData.set("interactionId", "keep-this-id");
  formData.set("recruitPersonId", "recruit-2");
  formData.set("occurredAt", "2026-08-01");
  formData.set("interactionType", "email");
  formData.set("notes", "Updated");
  formData.set("tournamentId", "t-1");
  const parsed = readInteractionFormData(formData);
  assert.equal(parsed.id, "keep-this-id");
  assert.equal(parsed.input.interactionType, "email");
  assert.equal(parsed.input.tournamentId, "t-1");
});

test("InteractionForm submits through onSubmit with a save lock, not form action", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionForm.tsx"),
    "utf8",
  );
  assert.match(source, /onSubmit=\{onSubmit\}/);
  assert.doesNotMatch(source, /<form action=\{/);
  assert.match(source, /createSaveLock/);
  assert.match(source, /tryStart\(\)/);
  assert.match(source, /disabled=\{saving\}/);
  assert.match(source, /type="submit"/);
  assert.match(source, /updateRecruitInteractionAction/);
  assert.match(source, /addRecruitInteractionAction/);
  assert.match(source, /type="button"/);
  assert.match(source, /onCancel\?\.\(\)/);
});

test("edit mode updates the existing id and does not insert", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionForm.tsx"),
    "utf8",
  );
  assert.match(source, /if \(editing\) await updateRecruitInteractionAction/);
  assert.match(source, /else await addRecruitInteractionAction/);
  assert.match(source, /name="interactionId"/);
  assert.match(source, /Save Changes/);
});

test("update action requires an existing id and does not insert", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "actions.ts"),
    "utf8",
  );
  assert.match(source, /updateRecruitInteraction\(id, input\)/);
  assert.match(source, /export async function updateRecruitInteractionAction/);
  assert.match(source, /if \(!id\) throw/);
  assert.match(source, /if \(!existing\) throw/);
  assert.equal(source.includes("createRecruitInteraction(input)"), true);
  assert.ok(source.indexOf("updateRecruitInteractionAction") > source.indexOf("addRecruitInteractionAction"));
});

test("rows open the same interaction record for editing", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionList.tsx"),
    "utf8",
  );
  assert.match(source, /onOpen\(item\)/);
  assert.doesNotMatch(source, /onClick=\{onOpen \? \(\) => onOpen\(item\)/);
  const dashboard = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionsDashboard.tsx"),
    "utf8",
  );
  assert.match(dashboard, /interaction=\{interaction\}/);
  assert.match(dashboard, /onOpen=\{openInteraction\}/);
});

test("Recruit AW user-facing label is Interactions, not Communications / Interactions", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const workspace = readFileSync(
    join(here, "../recruiting/components/RecruitingPersonWorkspace.tsx"),
    "utf8",
  );
  const panel = readFileSync(
    join(here, "../recruiting/components/RecruitingWorkspaces.tsx"),
    "utf8",
  );
  assert.match(workspace, /title: "Interactions"/);
  assert.match(panel, /<WorkspaceAccentHeading[\s\S]*?>\s*Interactions\s*</);
  assert.doesNotMatch(workspace, /Communications \/ Interactions/);
  assert.doesNotMatch(panel, /Communications \/ Interactions/);
});

test("trash icon is on global and Recruit AW interaction rows", () => {
  const list = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionList.tsx"),
    "utf8",
  );
  const dashboard = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionsDashboard.tsx"),
    "utf8",
  );
  const panel = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../recruiting/components/RecruitingWorkspaces.tsx"),
    "utf8",
  );
  assert.match(list, /Trash2/);
  assert.match(list, /Delete interaction/);
  assert.match(dashboard, /onDelete=\{requestDelete\}/);
  assert.match(panel, /onDelete=\{onDelete\}/);
});

test("trash click does not open the editor and opens confirmation", () => {
  const list = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionList.tsx"),
    "utf8",
  );
  const dashboard = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/InteractionsDashboard.tsx"),
    "utf8",
  );
  const confirm = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/DeleteInteractionConfirm.tsx"),
    "utf8",
  );
  assert.match(list, /onAction=\{\(\) => onDelete\(item\)\}/);
  assert.match(dashboard, /title: "Delete Interaction\?"/);
  assert.match(dashboard, /DeleteInteractionConfirm/);
  assert.match(confirm, /This interaction will be permanently removed/);
  assert.match(confirm, /onCancel/);
  assert.match(confirm, /Delete Interaction/);
});

test("confirm delete deletes one interaction by id; cancel does not delete", () => {
  const actions = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "actions.ts"),
    "utf8",
  );
  const repo = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "repository.ts"),
    "utf8",
  );
  const confirm = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "components/DeleteInteractionConfirm.tsx"),
    "utf8",
  );
  assert.match(repo, /\.delete\(\)\.eq\("id", id\)/);
  assert.match(actions, /deleteRecruitInteraction\(id\)/);
  assert.match(actions, /revalidateInteractionPaths\(existing\.recruitPersonId\)/);
  assert.match(confirm, /deleteRecruitInteractionAction\(interactionId\)/);
  assert.match(confirm, /onClick=\{onCancel\}/);
  assert.doesNotMatch(confirm, /onClick=\{onCancel\}[\s\S]*deleteRecruitInteractionAction/);
});

