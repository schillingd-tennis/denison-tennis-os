import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeInteractionRows,
  applyBlockedReasons,
  buildRecruitIndex,
  canApply,
  contactTypeOverride,
  exclusiveSkipCount,
  isMultiRecruitExclusion,
  mapContactType,
  matchRecruit,
  matchTournament,
  parseInteractionDate,
  personNameKeys,
  sourceKeyFor,
  type InteractionCsvRow,
  type RecruitCandidate,
  type TournamentCandidate,
} from "./csvImport";

function recruit(
  id: string,
  firstName: string,
  lastName: string,
  preferredName: string | null = null,
): RecruitCandidate {
  return {
    id,
    firstName,
    lastName,
    preferredName,
    label: `${preferredName || firstName} ${lastName}`,
  };
}

function csv(overrides: Partial<InteractionCsvRow> = {}): InteractionCsvRow {
  return {
    Player: "Kunal Amara",
    Date: "6/1/2026",
    "Contact Type": "Text",
    "Tournament (if applicable)": "",
    "Interaction Notes": "Followed up",
    "Next Steps": "",
    "Logged By": "Schills",
    ...overrides,
  };
}

test("exact first+last recruit match", () => {
  const index = buildRecruitIndex([recruit("r1", "Kunal", "Amara")]);
  const match = matchRecruit("Kunal Amara", index);
  assert.equal(match.status, "matched");
  if (match.status === "matched") assert.equal(match.recruit.id, "r1");
});

test("preferred-name recruit match", () => {
  const analysis = analyzeInteractionRows(
    [csv({ Player: "Jules Winter" })],
    [recruit("r1", "Julian", "Winter", "Jules")],
    [],
  );
  assert.equal(analysis.ready.length, 1);
  assert.equal(analysis.ready[0]?.record.recruit_person_id, "r1");
});

test("parenthetical nickname normalization", () => {
  const keys = personNameKeys("(Sai) Kunal Amara");
  assert.ok(keys.includes("kunal amara"));
  assert.ok(keys.includes("sai amara"));

  const people = [
    recruit("r1", "Kunal", "Amara"),
    recruit("r2", "Julian", "Winter"),
    recruit("r3", "Ryu", "Kotikula"),
    recruit("r4", "Ziyan", "Zhang"),
  ];
  const rows = [
    csv({ Player: "(Sai) Kunal Amara" }),
    csv({ Player: "Julian (Who Li-in) Winter", Date: "6/2/2026" }),
    csv({ Player: "Ryu Kotikula (Ree oo)", Date: "6/3/2026" }),
    csv({ Player: "Ziyan (Terry) Zhang", Date: "6/4/2026" }),
  ];
  const analysis = analyzeInteractionRows(rows, people, []);
  assert.equal(analysis.ready.length, 4);
  assert.deepEqual(
    analysis.ready.map((row) => row.record.recruit_person_id),
    ["r1", "r2", "r3", "r4"],
  );
});

test("ambiguous recruit is not imported", () => {
  const people = [recruit("r1", "Alex", "Lee"), recruit("r2", "Alex", "Lee", "Alexander")];
  const analysis = analyzeInteractionRows([csv({ Player: "Alex Lee" })], people, []);
  assert.equal(analysis.ready.length, 0);
  assert.equal(analysis.ambiguousPeople.length, 1);
  assert.deepEqual(
    analysis.ambiguousPeople[0]?.candidates?.map((item) => item.id).sort(),
    ["r1", "r2"],
  );
});

test("unmatched recruit is not imported", () => {
  const analysis = analyzeInteractionRows([csv({ Player: "Nobody Here" })], [recruit("r1", "Kunal", "Amara")], []);
  assert.equal(analysis.unmatchedPeople.length, 1);
  assert.equal(analysis.unmatchedPeople[0]?.player, "Nobody Here");
  assert.equal(analysis.ready.length, 0);
});

test("missing Player is reported and not imported", () => {
  const analysis = analyzeInteractionRows(
    [csv({ Player: "  ", "Interaction Notes": "IMG call about several recruits" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.missingPlayer.length, 1);
  assert.match(analysis.missingPlayer[0]?.notesPreview ?? "", /IMG call/);
  assert.equal(analysis.ready.length, 0);
});

test("tournament match by normalized name", () => {
  const tournaments: TournamentCandidate[] = [{ id: "t1", name: "Battle of Boca" }];
  const match = matchTournament("Battle of Boca", tournaments);
  assert.equal(match.status, "matched");
  if (match.status === "matched") assert.equal(match.tournament.id, "t1");
});

test("populated unmatched tournament blocks the row", () => {
  const analysis = analyzeInteractionRows(
    [csv({ "Tournament (if applicable)": "Donovan Showcase" })],
    [recruit("r1", "Kunal", "Amara")],
    [{ id: "t1", name: "Battle of Boca" }],
  );
  assert.equal(analysis.unmatchedTournaments.length, 1);
  assert.equal(analysis.unmatchedTournaments[0]?.csvTournament, "Donovan Showcase");
  assert.equal(analysis.ready.length, 0);
  assert.equal(analysis.tournamentMatches[0]?.osName, "UNRESOLVED");
});

test("Campus Visit maps to visit", () => {
  const mapped = mapContactType("Campus Visit");
  assert.equal(mapped.status, "mapped");
  if (mapped.status === "mapped") assert.equal(mapped.type, "visit");
});

test("unknown interaction type is not classified as other", () => {
  const mapped = mapContactType("Carrier Pigeon");
  assert.equal(mapped.status, "unknown");
  const analysis = analyzeInteractionRows(
    [csv({ "Contact Type": "Carrier Pigeon" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.unknownTypes.length, 1);
  assert.equal(analysis.ready.length, 0);
});

test("blank and invalid dates do not throw and are not imported", () => {
  assert.equal(parseInteractionDate("").status, "empty");
  assert.equal(parseInteractionDate("not-a-date").status, "invalid");
  assert.equal(parseInteractionDate("2/30/2026").status, "invalid");
  const analysis = analyzeInteractionRows(
    [csv({ Date: "" }), csv({ Date: "13/40/2026" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.invalidDates.length, 2);
  assert.equal(analysis.ready.length, 0);
});

test("source-key idempotency is stable for the same Coda row", () => {
  const row = csv();
  assert.equal(sourceKeyFor(row), sourceKeyFor({ ...row }));
  const analysis = analyzeInteractionRows(
    [row],
    [recruit("r1", "Kunal", "Amara")],
    [],
    [sourceKeyFor(row)],
  );
  assert.equal(analysis.ready.length, 1);
  assert.equal(analysis.ready[0]?.existing, true);
  assert.equal(analysis.existingSourceKeys.length, 1);
});

test("dry-run analysis never writes and apply refuses unresolved mappings", () => {
  const writes: unknown[] = [];
  const analysis = analyzeInteractionRows(
    [csv({ Player: "Missing Recruit" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(canApply(analysis), false);
  assert.ok(applyBlockedReasons(analysis).includes("unmatched_person"));
  if (canApply(analysis)) writes.push(analysis.ready);
  assert.equal(writes.length, 0);
});

test("exclusive skip counts plus ready rows equal the CSV row count", () => {
  const people = [recruit("r1", "Kunal", "Amara"), recruit("a1", "Alex", "Lee"), recruit("a2", "Alex", "Lee")];
  const rows = [
    csv({ Player: "Kunal Amara" }),
    csv({ Player: "" }),
    csv({ Player: "Nobody" }),
    csv({ Player: "Alex Lee" }),
    csv({ "Tournament (if applicable)": "Midland L2" }),
    csv({ "Contact Type": "Fax" }),
    csv({ Date: "" }),
  ];
  const analysis = analyzeInteractionRows(rows, people, []);
  const skippedExclusive =
    exclusiveSkipCount(analysis, "missing_player") +
    exclusiveSkipCount(analysis, "unmatched_person") +
    exclusiveSkipCount(analysis, "ambiguous_person") +
    exclusiveSkipCount(analysis, "unmatched_tournament") +
    exclusiveSkipCount(analysis, "unknown_type") +
    exclusiveSkipCount(analysis, "invalid_date");
  assert.equal(analysis.ready.length + skippedExclusive, rows.length);
  assert.equal(
    analysis.emptySourceRows.length +
      analysis.intentionallyExcluded.length +
      analysis.skipped.length +
      analysis.ready.length,
    rows.length,
  );
});

function emptyCsv(): InteractionCsvRow {
  return csv({
    Player: "",
    Date: "",
    "Contact Type": "",
    "Tournament (if applicable)": "",
    "Interaction Notes": "",
    "Next Steps": "",
    "Logged By": "",
  });
}

test("Jarren Griffin blank Contact Type is an explicit email override", () => {
  const row = csv({
    Player: "Jarren Griffin",
    Date: "7/12/2026",
    "Contact Type": "",
    "Interaction Notes": "Emailed to set up a call",
    "Logged By": "Schills",
  });
  assert.equal(contactTypeOverride(row), "email");
  const analysis = analyzeInteractionRows([row], [recruit("jg", "Jarren", "Griffin")], []);
  assert.equal(analysis.ready.length, 1);
  assert.equal(analysis.ready[0]?.record.interaction_type, "email");
  assert.equal(analysis.unknownTypes.length, 0);
  assert.ok(analysis.ready[0]?.sourceKey);
});

test("blank Contact Type generally remains unresolved", () => {
  assert.equal(contactTypeOverride(csv({ "Contact Type": "" })), null);
  const analysis = analyzeInteractionRows(
    [csv({ "Contact Type": "" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.unknownTypes.length, 1);
  assert.equal(analysis.ready.length, 0);
  assert.equal(canApply(analysis), false);
});

test("completely empty CSV row is ignored and has no source key", () => {
  const analysis = analyzeInteractionRows(
    [emptyCsv(), csv({ Player: "Kunal Amara" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.emptySourceRows.length, 1);
  assert.equal(analysis.emptySourceRows[0]?.reason.includes("EMPTY"), true);
  assert.equal(analysis.ready.length, 1);
  assert.equal(analysis.skipped.length, 0);
  assert.equal(canApply(analysis), true);
  assert.equal(analysis.ready.some((row) => row.rowNumber === analysis.emptySourceRows[0]?.rowNumber), false);
});

test("intentionally excluded multi-recruit row does not block apply", () => {
  const excluded = csv({
    Player: "",
    Date: "6/30/2026",
    "Contact Type": "",
    "Interaction Notes":
      "Phone Call wit Jenn Porchier - IMG:Ricards: most upside Rafa: most raw talent Enzo: weakest Grant: more closed minded",
    "Logged By": "A Mack",
  });
  assert.equal(isMultiRecruitExclusion(excluded), true);
  const analysis = analyzeInteractionRows(
    [excluded, csv({ Player: "Kunal Amara" })],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(analysis.intentionallyExcluded.length, 1);
  assert.match(analysis.intentionallyExcluded[0]?.reason ?? "", /MULTI-RECRUIT/);
  assert.match(analysis.intentionallyExcluded[0]?.notesPreview ?? "", /Jenn Porchier/);
  assert.equal(analysis.missingPlayer.length, 0);
  assert.equal(analysis.ready.length, 1);
  assert.equal(canApply(analysis), true);
  assert.equal("sourceKey" in analysis.intentionallyExcluded[0]!, false);
});

test("unresolved real recruit still blocks apply", () => {
  const analysis = analyzeInteractionRows(
    [csv({ Player: "Missing Recruit" }), emptyCsv()],
    [recruit("r1", "Kunal", "Amara")],
    [],
  );
  assert.equal(canApply(analysis), false);
  assert.ok(applyBlockedReasons(analysis).includes("unmatched_person"));
  assert.equal(analysis.emptySourceRows.length, 1);
});

test("Enzo Badotti Cariani aliases to Enzo Cariani, not Enzo Carvalho", () => {
  const analysis = analyzeInteractionRows(
    [csv({ Player: "Enzo Badotti Cariani" })],
    [recruit("enzo-cariani", "Enzo", "Cariani"), recruit("enzo-carvalho", "Enzo", "Carvalho")],
    [],
  );
  assert.equal(analysis.ready.length, 1);
  assert.equal(analysis.ready[0]?.record.recruit_person_id, "enzo-cariani");
});
