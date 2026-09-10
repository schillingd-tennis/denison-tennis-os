import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { primaryNavItems, getPageTitle } from "@/components/nav-items";
import {
  KNOWLEDGE_HOTELS_ROUTE,
  KNOWLEDGE_OFFICIALS_ROUTE,
  KNOWLEDGE_ROUTE,
  TOP_LEVEL_MODULE_PATHS,
  isTopLevelModulePage,
} from "@/lib/module-routes";

import { filterOfficials, locationOptions, sortOfficials } from "./filtering";
import {
  optionalRanking,
  parseAreaAssignor,
  readOfficialFormData,
} from "./formData";
import { mapOfficialRow } from "./mapOfficial";
import { IMPORT_DECISIONS, OFFICIAL_SEED_ROWS, officialLocationLabel } from "./seedData";
import type { Official } from "./types";

function seedOfficial(partial: Partial<Official> & Pick<Official, "id" | "name">): Official {
  return {
    email: "",
    phone: "",
    preferredContact: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    rate: "",
    ranking: null,
    isAreaAssignor: false,
    assignorArea: "",
    notes: "",
    ...partial,
  };
}

const sample: Official[] = [
  seedOfficial({ id: "1", name: "Barry Fittes", email: "bfittes10s@gmail.com", phone: "(513) 265-0090", city: "Cincinnati", rate: "$135 for 2", ranking: 4, notes: "" }),
  seedOfficial({ id: "2", name: "Julio Colon", email: "juliocatopr@gmail.com", phone: "?(614) 999-2735?", ranking: 5, notes: "Source phone marked uncertain: ?(614) 999-2735?" }),
  seedOfficial({ id: "3", name: "Deb Hodges", email: "dh2044103@gmail.com", rate: "Coordinator", ranking: 5, notes: "NEO Supervisor. Name had trailing asterisk (*) in source CSV.", isAreaAssignor: false }),
  seedOfficial({ id: "4", name: "Wynndel Burns", email: "wynndelb@gmail.com", notes: "OVTA supervisor?", isAreaAssignor: true, assignorArea: "OVTA" }),
];

test("Resources landing and Officials route helpers are registered", () => {
  assert.equal(KNOWLEDGE_OFFICIALS_ROUTE, "/knowledge/officials");
  assert.equal(isTopLevelModulePage(KNOWLEDGE_OFFICIALS_ROUTE), true);
  assert.ok((TOP_LEVEL_MODULE_PATHS as readonly string[]).includes(KNOWLEDGE_OFFICIALS_ROUTE));
  assert.equal(getPageTitle(KNOWLEDGE_OFFICIALS_ROUTE), "Officials List");
  assert.equal(getPageTitle(KNOWLEDGE_HOTELS_ROUTE), "Hotels");
});

test("Resources nested nav lists Hotels then Officials List", () => {
  const resources = primaryNavItems.find((item) => item.href === KNOWLEDGE_ROUTE);
  assert.ok(resources?.children);
  assert.deepEqual(
    resources.children.map((child) => ({ label: child.label, href: child.href })),
    [
      { label: "Hotels", href: KNOWLEDGE_HOTELS_ROUTE },
      { label: "Officials List", href: KNOWLEDGE_OFFICIALS_ROUTE },
    ],
  );
});

test("Officials seed imports all 25 rows with unique import keys", () => {
  assert.equal(OFFICIAL_SEED_ROWS.length, 25);
  const keys = OFFICIAL_SEED_ROWS.map((row) => row.importKey);
  assert.equal(new Set(keys).size, 25);
  for (const row of OFFICIAL_SEED_ROWS) {
    const expected = createHash("md5")
      .update(`officials-list.csv:${row.name.toLowerCase()}:${(row.email ?? "").toLowerCase()}`)
      .digest("hex");
    assert.equal(row.importKey, expected);
    assert.equal(row.isAreaAssignor, false);
    assert.equal(row.assignorArea, null);
  }
});

test("Officials migration seeds 25 rows idempotently without overwriting edits", () => {
  const migration = readFileSync(
    fileURLToPath(new URL("../../../supabase/migrations/0055_knowledge_officials.sql", import.meta.url)),
    "utf8",
  );
  assert.match(migration, /create table if not exists public\.knowledge_officials/);
  assert.match(migration, /import_key text unique/);
  assert.match(migration, /ranking smallint/);
  assert.match(migration, /is_area_assignor boolean not null default false/);
  assert.match(migration, /on conflict \(import_key\) do nothing/);
  assert.doesNotMatch(migration, /on conflict \(import_key\) do update/i);
  const valueRows = migration.match(/\('[0-9a-f]{32}'/g) ?? [];
  assert.equal(valueRows.length, 25);
  for (const row of OFFICIAL_SEED_ROWS) {
    assert.match(migration, new RegExp(row.importKey));
    assert.match(migration, new RegExp(row.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("seed address fields stay blank and ambiguous values are preserved", () => {
  const migration = readFileSync(
    fileURLToPath(new URL("../../../supabase/migrations/0055_knowledge_officials.sql", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(migration, /address_line1,/);
  assert.ok(OFFICIAL_SEED_ROWS.every((row) => row.city === "Cincinnati" || row.city === "Wooster" || row.city == null));

  const julio = OFFICIAL_SEED_ROWS.find((row) => row.name === "Julio Colon");
  assert.equal(julio?.phone, "?(614) 999-2735?");
  assert.match(julio?.notes ?? "", /uncertain/);

  const matt = OFFICIAL_SEED_ROWS.find((row) => row.name === "Matt Swaim");
  assert.equal(matt?.rate, "ITA referee, young guy at NCAC");
  assert.equal(matt?.city, null);

  const alma = OFFICIAL_SEED_ROWS.find((row) => row.name === "Alma Makurat");
  assert.equal(alma?.city, null);
  assert.equal(alma?.rate, "Indianapolis");

  const deb = OFFICIAL_SEED_ROWS.find((row) => row.name === "Deb Hodges");
  assert.equal(deb?.name, "Deb Hodges");
  assert.match(deb?.notes ?? "", /asterisk/);
  assert.equal(deb?.isAreaAssignor, false);

  const wynndel = OFFICIAL_SEED_ROWS.find((row) => row.name === "Wynndel Burns");
  assert.equal(wynndel?.email, "wynndelb@gmail.com");
  assert.equal(wynndel?.isAreaAssignor, false);
  assert.match(wynndel?.notes ?? "", /OVTA supervisor/);

  const barry = OFFICIAL_SEED_ROWS.find((row) => row.name === "Barry Fittes");
  assert.equal(barry?.city, "Cincinnati");

  const martin = OFFICIAL_SEED_ROWS.find((row) => row.name === "Martin Smith");
  assert.equal(martin?.name, "Martin Smith");

  assert.ok(IMPORT_DECISIONS.length >= 25);
  assert.ok(migration.includes("Cincinnati"));
  assert.ok(!migration.includes("Cincinnnati"));
});

test("ranking validation rejects zero and accepts null or 1–5", () => {
  assert.ok(OFFICIAL_SEED_ROWS.every((row) => row.ranking == null || (row.ranking >= 1 && row.ranking <= 5)));
  assert.ok(!OFFICIAL_SEED_ROWS.some((row) => row.ranking === 0));
  const migration = readFileSync(
    fileURLToPath(new URL("../../../supabase/migrations/0055_knowledge_officials.sql", import.meta.url)),
    "utf8",
  );
  assert.match(migration, /ranking is null or \(ranking between 1 and 5\)/);
});

test("official search covers name, email, phone, city, assignor, rate, and notes", () => {
  for (const query of ["barry", "juliocatopr", "999-2735", "cincinnati", "ovta", "$135", "uncertain"]) {
    assert.ok(filterOfficials(sample, { query, ranking: "", location: "", areaAssignor: "", view: "all" }).length >= 1, query);
  }
});

test("official filters and quick views combine", () => {
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "5", location: "", areaAssignor: "", view: "all" }).map((row) => row.id),
    ["2", "3"],
  );
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "none", location: "", areaAssignor: "", view: "all" }).map((row) => row.id),
    ["4"],
  );
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "", location: "Cincinnati", areaAssignor: "", view: "all" }).map((row) => row.id),
    ["1"],
  );
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "", location: "", areaAssignor: "yes", view: "all" }).map((row) => row.id),
    ["4"],
  );
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "", location: "", areaAssignor: "", view: "topRated" }).map((row) => row.id),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    filterOfficials(sample, { query: "", ranking: "", location: "", areaAssignor: "", view: "areaAssignors" }).map((row) => row.id),
    ["4"],
  );
});

test("official table sorts with blanks last and default name asc", () => {
  assert.deepEqual(sortOfficials(sample, "name", "asc").map((row) => row.id), ["1", "3", "2", "4"]);
  assert.deepEqual(sortOfficials(sample, "ranking", "desc").map((row) => row.id), ["2", "3", "1", "4"]);
});

test("location helper and options use city/state only", () => {
  assert.equal(officialLocationLabel("Cincinnati", "OH"), "Cincinnati, OH");
  assert.equal(officialLocationLabel("Wooster", ""), "Wooster");
  assert.deepEqual(locationOptions(sample), ["Cincinnati"]);
});

test("Officials stays isolated from the Hotels workspace and preserves Resources links", () => {
  const hotelsWorkspace = readFileSync(
    fileURLToPath(new URL("../hotels/components/HotelsWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(hotelsWorkspace, /official/i);

  const hotelsPage = readFileSync(
    fileURLToPath(new URL("../../app/knowledge/hotels/page.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(hotelsPage, /HotelsWorkspace/);

  const knowledgePage = readFileSync(
    fileURLToPath(new URL("../../app/knowledge/page.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(knowledgePage, /Hotels/);
  assert.match(knowledgePage, /Officials List/);
  assert.match(knowledgePage, /KNOWLEDGE_HOTELS_ROUTE/);
});

test("drawer sections and officials page exist", () => {
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/OfficialsWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(workspace, /Contact/);
  assert.match(workspace, /Officiating/);
  assert.match(workspace, /Notes/);
  assert.match(workspace, /Add Official/);
  assert.match(workspace, /Resources › Officials List|Resources<\/Link>/);
  assert.match(workspace, /md:hidden/);
  assert.match(workspace, /min-h-11/);

  const page = readFileSync(
    fileURLToPath(new URL("../../app/knowledge/officials/page.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(page, /OfficialsWorkspace/);
  assert.match(page, /listOfficials/);
});

test("Officials List slide-over field labels are medium weight, never semibold or bold", () => {
  const workspace = readFileSync(
    fileURLToPath(new URL("./components/OfficialsWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(workspace, /DrawerField/);
  assert.doesNotMatch(workspace, /grid gap-1\.5 text-xs font-semibold/);
  assert.doesNotMatch(workspace, /grid gap-1\.5 text-xs font-bold/);

  const roles = readFileSync(
    fileURLToPath(new URL("../../components/typography/roles.ts", import.meta.url)),
    "utf8",
  );
  assert.match(roles, /drawerFieldLabel:\s*"text-xs font-medium text-text-primary"/);
  assert.match(roles, /drawerFieldLabelMuted:\s*"text-xs font-medium text-text-secondary"/);
  assert.doesNotMatch(roles, /drawerFieldLabel:\s*"[^"]*font-semibold/);
  assert.doesNotMatch(roles, /drawerFieldLabel:\s*"[^"]*font-bold/);

  const drawerField = readFileSync(
    fileURLToPath(new URL("../../components/workspace-drawer/DrawerField.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(drawerField, /typeRole\.drawerFieldLabel/);
  assert.doesNotMatch(drawerField, /font-semibold|font-bold/);

  // Section headings may retain stronger treatment; field labels must not.
  assert.match(workspace, /text-\[10px\] font-bold tracking-wider text-text-secondary uppercase/);
});

test("official form parse persists every editable field including blanks and assignor false", () => {
  const formData = new FormData();
  formData.set("id", "11111111-1111-1111-1111-111111111111");
  formData.set("name", "Test Official");
  formData.set("email", "Coach@Example.com");
  formData.set("phone", "(614) 555-0100");
  formData.set("preferredContact", "Phone");
  formData.set("addressLine1", "100 Court St");
  formData.set("addressLine2", "");
  formData.set("city", "Columbus");
  formData.set("state", "oh");
  formData.set("postalCode", "43215");
  formData.set("rate", "$150");
  formData.set("ranking", "4");
  formData.set("isAreaAssignor", "false");
  formData.set("assignorArea", "Central Ohio");
  formData.set("notes", "Persist me");

  const parsed = readOfficialFormData(formData);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.id, "11111111-1111-1111-1111-111111111111");
  assert.deepEqual(parsed.payload, {
    name: "Test Official",
    email: "coach@example.com",
    phone: "(614) 555-0100",
    preferred_contact: "Phone",
    address_line1: "100 Court St",
    address_line2: null,
    city: "Columbus",
    state: "OH",
    postal_code: "43215",
    rate: "$150",
    ranking: 4,
    is_area_assignor: false,
    assignor_area: "Central Ohio",
    notes: "Persist me",
  });
});

test("clearing optional fields and missing ranking persist as null", () => {
  const formData = new FormData();
  formData.set("name", "Blank Fields");
  formData.set("email", "  ");
  formData.set("phone", "");
  formData.set("preferredContact", "");
  formData.set("addressLine1", "");
  formData.set("addressLine2", "");
  formData.set("city", "");
  formData.set("state", "");
  formData.set("postalCode", "");
  formData.set("rate", "");
  formData.set("ranking", "");
  formData.set("assignorArea", "");
  formData.set("notes", "");
  // isAreaAssignor intentionally omitted (unchecked checkbox)

  const parsed = readOfficialFormData(formData);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.id, null);
  assert.equal(parsed.payload.email, null);
  assert.equal(parsed.payload.phone, null);
  assert.equal(parsed.payload.preferred_contact, null);
  assert.equal(parsed.payload.address_line1, null);
  assert.equal(parsed.payload.address_line2, null);
  assert.equal(parsed.payload.city, null);
  assert.equal(parsed.payload.state, null);
  assert.equal(parsed.payload.postal_code, null);
  assert.equal(parsed.payload.rate, null);
  assert.equal(parsed.payload.ranking, null);
  assert.equal(parsed.payload.is_area_assignor, false);
  assert.equal(parsed.payload.assignor_area, null);
  assert.equal(parsed.payload.notes, null);
});

test("ranking parses as integer and rejects invalid values", () => {
  assert.equal(optionalRanking("3"), 3);
  assert.equal(optionalRanking(""), null);
  assert.equal(optionalRanking(null), null);
  assert.equal(optionalRanking("3.5"), undefined);
  assert.equal(optionalRanking("0"), undefined);
  assert.equal(optionalRanking("6"), undefined);

  const bad = new FormData();
  bad.set("name", "Rank");
  bad.set("ranking", "9");
  const parsed = readOfficialFormData(bad);
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.message, /Ranking/);
});

test("Area Assignor false→true and true→false from form values", () => {
  assert.equal(parseAreaAssignor(null), false);
  assert.equal(parseAreaAssignor(""), false);
  assert.equal(parseAreaAssignor("false"), false);
  assert.equal(parseAreaAssignor("true"), true);
  assert.equal(parseAreaAssignor("on"), true);

  const on = new FormData();
  on.set("name", "Assignor On");
  on.set("isAreaAssignor", "true");
  const parsedOn = readOfficialFormData(on);
  assert.equal(parsedOn.ok, true);
  if (parsedOn.ok) assert.equal(parsedOn.payload.is_area_assignor, true);

  const off = new FormData();
  off.set("name", "Assignor Off");
  off.set("isAreaAssignor", "false");
  const parsedOff = readOfficialFormData(off);
  assert.equal(parsedOff.ok, true);
  if (parsedOff.ok) assert.equal(parsedOff.payload.is_area_assignor, false);
});

test("notes and create payload round-trip through form parse", () => {
  const formData = new FormData();
  formData.set("name", "New Official");
  formData.set("email", "new@example.com");
  formData.set("phone", "330-555-0000");
  formData.set("preferredContact", "Email");
  formData.set("addressLine1", "1 First");
  formData.set("addressLine2", "Suite 2");
  formData.set("city", "Wooster");
  formData.set("state", "OH");
  formData.set("postalCode", "44691");
  formData.set("rate", "Match fee");
  formData.set("ranking", "5");
  formData.set("isAreaAssignor", "true");
  formData.set("assignorArea", "NEO");
  formData.set("notes", "Created via slide-over");

  const parsed = readOfficialFormData(formData);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.id, null);
  assert.equal(parsed.payload.notes, "Created via slide-over");
  assert.equal(parsed.payload.ranking, 5);
  assert.equal(parsed.payload.is_area_assignor, true);
  assert.equal(parsed.payload.assignor_area, "NEO");
});

test("mapOfficialRow reloads persisted values after save", () => {
  const mapped = mapOfficialRow({
    id: "22222222-2222-2222-2222-222222222222",
    name: "Reloaded",
    email: "reload@example.com",
    phone: null,
    preferred_contact: "Text",
    address_line1: "9 Court",
    address_line2: null,
    city: "Cleveland",
    state: "OH",
    postal_code: "44101",
    rate: null,
    ranking: 2,
    is_area_assignor: true,
    assignor_area: "OVTA",
    notes: "After reload",
  });
  assert.equal(mapped.phone, "");
  assert.equal(mapped.addressLine2, "");
  assert.equal(mapped.rate, "");
  assert.equal(mapped.ranking, 2);
  assert.equal(mapped.isAreaAssignor, true);
  assert.equal(mapped.notes, "After reload");
  assert.equal(mapped.preferredContact, "Text");
});

test("save path awaits repository mutation, surfaces errors, refreshes client state", () => {
  const actions = readFileSync(fileURLToPath(new URL("./actions.ts", import.meta.url)), "utf8");
  assert.match(actions, /readOfficialFormData/);
  assert.match(actions, /await saveOfficial\(/);
  assert.match(actions, /success: true, official/);
  assert.match(actions, /Could not save official/);

  const repository = readFileSync(fileURLToPath(new URL("./repository.ts", import.meta.url)), "utf8");
  assert.match(repository, /export async function saveOfficial/);
  assert.match(repository, /\.eq\("id", id\)\.select\("\*"\)\.single\(\)/);
  assert.match(repository, /\.insert\(row\)\.select\("\*"\)\.single\(\)/);
  assert.match(repository, /Official save did not return a record/);

  const workspace = readFileSync(
    fileURLToPath(new URL("./components/OfficialsWorkspace.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(workspace, /applySavedOfficial/);
  assert.match(workspace, /onSaved\(result\.official\)/);
  assert.match(workspace, /setMessage\(result\.message\)/);
  assert.match(workspace, /type="submit"/);
  assert.match(workspace, /pending \? "Saving…"/);
  assert.match(workspace, /disabled=\{pending\}/);
  assert.match(workspace, /router\.refresh\(\)/);
  assert.doesNotMatch(workspace, /onSaved\(\);\s*\n\s*\}\)/);
});
