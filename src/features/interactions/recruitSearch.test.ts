import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  filterRecruits,
  recruitIdAfterQueryChange,
  recruitSecondaryText,
  type InteractionOption,
} from "./recruitSearch";

function recruit(partial: Partial<InteractionOption> & Pick<InteractionOption, "id" | "label">): InteractionOption {
  return partial;
}

const here = dirname(fileURLToPath(import.meta.url));
const fieldSource = readFileSync(join(here, "components/RecruitSearchField.tsx"), "utf8");
const formSource = readFileSync(join(here, "components/InteractionForm.tsx"), "utf8");
const pageSource = readFileSync(join(here, "../../app/recruiting/interactions/page.tsx"), "utf8");
const workspaceSource = readFileSync(join(here, "../recruiting/components/RecruitingPersonWorkspace.tsx"), "utf8");

const recruits: InteractionOption[] = [
  recruit({
    id: "pp-daven-aga",
    label: "Daven Aga",
    firstName: "Daven",
    lastName: "Aga",
    classYear: 2027,
    hometown: "Boca Raton, FL",
  }),
  recruit({
    id: "pp-brayden-amey",
    label: "Brayden Amey",
    firstName: "Brayden",
    lastName: "Amey",
    classYear: 2028,
    hometown: "Chicago, IL",
  }),
  recruit({
    id: "aidan-s",
    label: "Aidan Smith",
    firstName: "Aidan",
    lastName: "Smith",
    preferredName: "A.J.",
    classYear: 2028,
  }),
];

test("1 autocomplete renders as a combobox with results anchored below the input", () => {
  assert.match(fieldSource, /role="combobox"/);
  assert.match(fieldSource, /placeholder="Search recruits…"/);
  assert.match(fieldSource, /text-sm font-normal text-text-primary/);
  assert.match(fieldSource, /absolute top-full/);
  assert.match(fieldSource, /role="listbox"/);
  assert.match(formSource, /RecruitSearchField/);
});

test("2 no detached/floating search icon", () => {
  assert.match(fieldSource, /absolute top-1\/2 left-3/);
  assert.match(fieldSource, /-translate-y-1\/2/);
  assert.doesNotMatch(fieldSource, /top-\[1\.375rem\]/);
  assert.equal((fieldSource.match(/<Search/g) ?? []).length, 1);
});

test("3 typing filters recruits by first, last, preferred, and full name", () => {
  assert.deepEqual(
    filterRecruits(recruits, "Dav").map((row) => row.id),
    ["pp-daven-aga"],
  );
  assert.deepEqual(
    filterRecruits(recruits, "amey").map((row) => row.id),
    ["pp-brayden-amey"],
  );
  assert.deepEqual(
    filterRecruits(recruits, "bray").map((row) => row.id),
    ["pp-brayden-amey"],
  );
  assert.deepEqual(
    filterRecruits(recruits, "aga").map((row) => row.id),
    ["pp-daven-aga"],
  );
  assert.deepEqual(
    filterRecruits(recruits, "a.j.").map((row) => row.id),
    ["aidan-s"],
  );
  assert.deepEqual(
    filterRecruits(recruits, "brayden amey").map((row) => row.id),
    ["pp-brayden-amey"],
  );
});

test("4 results contain recruiting people only", () => {
  assert.equal(filterRecruits(recruits, "coach").length, 0);
  assert.equal(filterRecruits(recruits, "").length, 0);
  assert.match(pageSource, /loadRecruitingDirectory/);
  assert.match(pageSource, /id: row\.person\.id/);
});

test("5 clicking a result sets recruit_person_id to the canonical person id", () => {
  assert.match(fieldSource, /onSelect\(recruit\.id\)/);
  assert.match(fieldSource, /value=\{selectedId\}/);
  assert.match(fieldSource, /onMouseDown/);
  assert.match(formSource, /formData\.set\("recruitPersonId", recruitPersonId\)/);
});

test("6 clicking a result sets the visible recruit name", () => {
  assert.match(fieldSource, /setQuery\(recruit\.label\)/);
  assert.match(fieldSource, /value=\{query\}/);
});

test("7 selection closes results", () => {
  assert.match(fieldSource, /setOpen\(false\)/);
  assert.match(fieldSource, /showList = open && query\.trim\(\)\.length > 0 && !selected/);
});

test("8 valid selection clears Select a recruit error", () => {
  assert.match(formSource, /function selectRecruit/);
  assert.match(formSource, /if \(id\) setError/);
  assert.match(formSource, /Select a recruit\./);
  assert.match(formSource, /onSelect=\{selectRecruit\}/);
});

test("9 typing text without selecting does not satisfy validation", () => {
  assert.match(formSource, /if \(!recruitPersonId\)/);
  assert.match(formSource, /setError\("Select a recruit\."\)/);
  assert.equal(recruitIdAfterQueryChange(null, "Daven Aga"), "");
});

test("10 changing text after selection clears stale recruit_person_id", () => {
  const selected = recruits[0]!;
  assert.equal(recruitIdAfterQueryChange(selected, "Daven Aga"), "pp-daven-aga");
  assert.equal(recruitIdAfterQueryChange(selected, "Daven A"), "");
  assert.equal(recruitIdAfterQueryChange(selected, "Brayden Amey"), "");
  assert.match(fieldSource, /recruitIdAfterQueryChange\(selected, value\)/);
  assert.match(fieldSource, /if \(nextId !== selectedId\) onSelect\(nextId\)/);
});

test("11 keyboard Enter selects the highlighted recruit without submitting the form", () => {
  assert.match(fieldSource, /event\.key === "Enter"/);
  assert.match(fieldSource, /event\.key === "ArrowDown"/);
  assert.match(fieldSource, /event\.key === "ArrowUp"/);
  assert.match(fieldSource, /event\.key === "Escape"/);
  assert.match(fieldSource, /event\.preventDefault\(\)/);
  assert.match(fieldSource, /event\.stopPropagation\(\)/);
  assert.match(fieldSource, /if \(recruit\) choose\(recruit\)/);
  assert.match(formSource, /<form onSubmit=\{onSubmit\}/);
  assert.doesNotMatch(formSource, /<form action=\{/);
});

test("12 Recruit-context Add Interaction remains preselected", () => {
  assert.match(formSource, /lockRecruit && pinned/);
  assert.match(formSource, /pinned\.label/);
  assert.match(formSource, /defaultRecruitId/);
  assert.match(workspaceSource, /defaultRecruitId=\{record\.id\} lockRecruit/);
});

test("13 Cancel closes the form", () => {
  assert.match(formSource, /type="button"/);
  assert.match(formSource, /onClick=\{cancel\}/);
  assert.match(formSource, /onCancel\?\.\(\)/);
});

test("14 Cancel creates zero records", () => {
  assert.match(formSource, /function cancel/);
  assert.doesNotMatch(formSource, /onClick=\{cancel\}[\s\S]*addRecruitInteractionAction/);
  assert.match(formSource, /event\.preventDefault\(\)/);
  assert.match(formSource, /event\.stopPropagation\(\)/);
});

test("15 submit with selected recruit creates exactly one interaction", () => {
  assert.match(formSource, /createSaveLock/);
  assert.match(formSource, /tryStart\(\)/);
  assert.match(formSource, /disabled=\{saving\}/);
  assert.match(formSource, /else await addRecruitInteractionAction/);
});

test("16 created interaction uses the selected recruit's canonical person id", () => {
  assert.equal(recruits[0]!.id, "pp-daven-aga");
  assert.match(pageSource, /id: row\.person\.id/);
  assert.match(formSource, /formData\.set\("recruitPersonId", recruitPersonId\)/);
  assert.doesNotMatch(formSource, /resolve.*name/);
});

test("secondary text is class year and hometown only", () => {
  assert.equal(recruitSecondaryText(recruits[0]!), "2027 · Boca Raton, FL");
  assert.equal(recruitSecondaryText(recruits[1]!), "2028 · Chicago, IL");
});
