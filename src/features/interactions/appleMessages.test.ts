import assert from "node:assert/strict";
import { test } from "node:test";

import {
  APPLE_EPOCH_MS,
  APPLE_MESSAGES_SOURCE_SYSTEM,
  appleTimestampToIso,
  attachRecruit,
  contactHandlesFor,
  dedupeByGuid,
  directionFromApple,
  isEmptyMessage,
  isGroupChat,
  isGuessedCountryCode,
  isTapback,
  matchRecruitsToThreads,
  messageBody,
  normalizeHandle,
  parseAppleMessage,
  parseRecruitFlag,
  recruitFilterError,
  reportFileSlug,
  resolveRecruitFilter,
  summarizeMessageScan,
  classifyAppleMessage,
  assertLocalApplyEnvironment,
  assertLocalApplyReady,
  forbiddenWriteError,
  hasForbiddenWriteFlags,
  isExactRecruitQuery,
  isLocalSupabaseHost,
  partitionLocalUpserts,
  toRecruitingInteractionInsert,
  assertProductionDryRunEnvironment,
  assertProductionDryRunReady,
  compareProposedGuids,
  hasProductionDryRunFlag,
  isProductionSupabaseHost,
  parseDotEnv,
  productionCredentialsFromEnv,
  productionReportSlug,
} from "./appleMessages";

test("phone normalization uses E.164 and does not guess extra digits", () => {
  assert.equal(normalizeHandle("(973) 555-0101"), "+19735550101");
  assert.equal(normalizeHandle("+15555550123"), "+15555550123");
  assert.equal(normalizeHandle("15555550123"), "+15555550123");
  assert.equal(normalizeHandle("alex@icloud.com"), "alex@icloud.com");
  assert.equal(normalizeHandle("15555550123123"), null);
  assert.equal(isGuessedCountryCode("15555550123123"), true);
  assert.equal(isGuessedCountryCode("+5511987654321"), false);
  assert.equal(isGuessedCountryCode("9735550101"), false);
});

test("Apple nanosecond timestamps convert from the 2001 epoch", () => {
  const iso = appleTimestampToIso(0);
  assert.equal(iso, new Date(APPLE_EPOCH_MS).toISOString());
  const later = appleTimestampToIso(1_000_000_000);
  assert.equal(Date.parse(later), APPLE_EPOCH_MS + 1_000);
  const fromBigint = appleTimestampToIso(BigInt("1000000000"));
  assert.equal(fromBigint, later);
});

test("large Apple chat.db timestamps convert as bigint without losing precision", () => {
  const nanos = BigInt("464878674000000000");
  const iso = appleTimestampToIso(nanos);
  assert.equal(iso, "2015-09-25T12:57:54.000Z");
  assert.equal(appleTimestampToIso("464878674000000000"), iso);
  const parsed = parseAppleMessage({
    guid: "g-large-date",
    chatIdentifier: "+19735550101",
    isFromMe: BigInt("1"),
    date: nanos,
    text: "hello",
    associatedMessageType: BigInt("0"),
  });
  assert.ok(parsed);
  assert.equal(parsed.occurred_at, iso);
  assert.equal(parsed.direction, "outbound");
});

test("is_from_me maps to outbound / inbound", () => {
  assert.equal(directionFromApple(1), "outbound");
  assert.equal(directionFromApple(true), "outbound");
  assert.equal(directionFromApple(0), "inbound");
  assert.equal(directionFromApple(false), "inbound");
});

test("GUID deduplication keeps the first record", () => {
  const { unique, duplicateKeys } = dedupeByGuid([
    { source_key: "guid-1", notes: "first" },
    { source_key: "guid-1", notes: "dup" },
    { source_key: "guid-2", notes: "ok" },
  ]);
  assert.equal(unique.length, 2);
  assert.deepEqual(
    unique.map((row) => row.source_key),
    ["guid-1", "guid-2"],
  );
  assert.deepEqual(duplicateKeys, ["guid-1"]);
});

test("ambiguous handles never assign a recruit", () => {
  const report = matchRecruitsToThreads({
    recruits: [
      { id: "a", name: "Alex One", osHandles: ["9735550101"] },
      { id: "b", name: "Blair Two", osHandles: ["973-555-0101"] },
    ],
    threadHandles: ["+19735550101"],
    contacts: new Map(),
    overrides: {},
  });
  assert.equal(report.matched.length, 0);
  assert.equal(report.ambiguous.length, 2);
  assert.equal(report.unmatched.length, 0);
});

test("a recruit with two distinct 1:1 threads is ambiguous", () => {
  const report = matchRecruitsToThreads({
    recruits: [{ id: "a", name: "Alex One", osHandles: ["9735550101", "alex@icloud.com"] }],
    threadHandles: ["+19735550101", "alex@icloud.com"],
    contacts: new Map(),
    overrides: {},
  });
  assert.equal(report.matched.length, 0);
  assert.equal(report.ambiguous.length, 1);
  assert.match(report.ambiguous[0]!.reason, /multiple 1:1 threads/);
});

test("guessed country-code phones are not used for matching", () => {
  const report = matchRecruitsToThreads({
    recruits: [{ id: "a", name: "Alex One", osHandles: ["15555550123123"] }],
    threadHandles: ["+15555550123123"],
    contacts: new Map(),
    overrides: {},
  });
  assert.equal(report.matched.length, 0);
  assert.equal(report.unmatched.length, 1);
});

test("override is exclusive and does not fall through", () => {
  const report = matchRecruitsToThreads({
    recruits: [{ id: "a", name: "Alex One", osHandles: ["9735550101"] }],
    threadHandles: ["+19735550101"],
    contacts: new Map(),
    overrides: { "Alex One": "+19999999999" },
  });
  assert.equal(report.matched.length, 0);
  assert.equal(report.unmatched[0]?.reason, "override handle has no 1:1 thread");
});

test("Contacts name match can supply a unique handle", () => {
  const contacts = new Map<string, Set<string>>([
    ["alex one", new Set(["+19735550101"])],
  ]);
  const report = matchRecruitsToThreads({
    recruits: [{ id: "dash", name: "Alex One", osHandles: ["9735550199"] }],
    threadHandles: ["+19735550101"],
    contacts,
    overrides: {},
  });
  assert.equal(report.matched.length, 1);
  assert.equal(report.matched[0]?.handle, "+19735550101");
  assert.equal(report.matched[0]?.source, "contacts");
  assert.deepEqual(contactHandlesFor("Alex One", contacts), ["+19735550101"]);
});

test("tapbacks, group chats, and empty bodies are excluded", () => {
  assert.equal(isTapback(0), false);
  assert.equal(isTapback(null), false);
  assert.equal(isTapback(3), true);
  assert.equal(isEmptyMessage(null), true);
  assert.equal(isEmptyMessage("  "), true);
  assert.equal(isEmptyMessage("On my way"), false);
  assert.equal(isGroupChat("chat123"), true);
  assert.equal(isGroupChat("+19735550101"), false);
  assert.equal(
    parseAppleMessage({
      guid: "g-group",
      chatIdentifier: "chat123",
      isFromMe: 0,
      date: 0,
      text: "hello everyone",
      associatedMessageType: 0,
    }),
    null,
  );

  const tapback = parseAppleMessage({
    guid: "g-tap",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "Loved “hello”",
    associatedMessageType: 3,
  });
  assert.equal(tapback, null);

  const empty = parseAppleMessage({
    guid: "g-empty",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "   ",
    attributedBody: null,
    associatedMessageType: 0,
  });
  assert.equal(empty, null);

  const attributed = parseAppleMessage({
    guid: "g-body",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "",
    attributedBody: Buffer.from("xxxxNSString\u0001See you Friday", "utf8"),
    associatedMessageType: 0,
    serviceName: "iMessage",
  });
  assert.ok(attributed);
  assert.equal(attributed.source_system, APPLE_MESSAGES_SOURCE_SYSTEM);
  assert.equal(attributed.source_key, "g-body");
  assert.equal(attributed.direction, "inbound");
  assert.equal(attributed.interaction_type, "text");
  assert.match(attributed.notes, /See you Friday/);
  assert.equal(messageBody("", Buffer.from("xxxxNSString\u0001Hello there", "utf8")), "Hello there");

  const attached = attachRecruit(attributed, {
    recruitId: "person-1",
    name: "Alex",
    handle: "+19735550101",
    source: "os",
  });
  assert.equal(attached.recruit_person_id, "person-1");
  assert.equal(attached.tournament_id, null);
  assert.equal(attached.next_steps, null);
});

test("recruit filter matches a unique name or ID and rejects ambiguous partials", () => {
  const recruits = [
    { id: "alex-id", name: "Alex Example", osHandles: ["9735550101"] },
    { id: "blair-id", name: "Blair Example", osHandles: ["9735550102"] },
  ];
  assert.equal(parseRecruitFlag(["--recruit", "Alex Example"]), "Alex Example");
  assert.equal(parseRecruitFlag(["--recruit=Alex Example"]), "Alex Example");
  assert.equal(parseRecruitFlag([]), null);

  const exact = resolveRecruitFilter(recruits, "Alex Example");
  assert.equal(exact.status, "matched");
  if (exact.status === "matched") assert.equal(exact.recruit.id, "alex-id");

  const byId = resolveRecruitFilter(recruits, "alex-id");
  assert.equal(byId.status, "matched");
  if (byId.status === "matched") assert.equal(byId.recruit.name, "Alex Example");

  const all = resolveRecruitFilter(recruits, null);
  assert.equal(all.status, "all");

  const ambiguous = resolveRecruitFilter(recruits, "Example");
  assert.equal(ambiguous.status, "ambiguous");
  if (ambiguous.status === "ambiguous") {
    assert.equal(ambiguous.matches.length, 2);
    assert.match(recruitFilterError(ambiguous), /ambiguous/);
  }

  const missing = resolveRecruitFilter(recruits, "Nobody");
  assert.equal(missing.status, "none");
  if (missing.status === "none") assert.match(recruitFilterError(missing), /No recruit matches/);

  assert.equal(reportFileSlug("Alex Example"), "alex-example");
});

test("message scan summary counts inbound, outbound, tapbacks, empty decodes, and date range", () => {
  const inbound = parseAppleMessage({
    guid: "g-in",
    chatIdentifier: "+19735550101",
    isFromMe: 0,
    date: 0,
    text: "on my way",
    associatedMessageType: 0,
  });
  const outbound = parseAppleMessage({
    guid: "g-out",
    chatIdentifier: "+19735550101",
    isFromMe: 1,
    date: 1_000_000_000,
    text: "see you",
    associatedMessageType: 0,
  });
  assert.ok(inbound);
  assert.ok(outbound);

  const classified = [
    classifyAppleMessage({
      guid: "g-in",
      chatIdentifier: "+19735550101",
      isFromMe: 0,
      date: 0,
      text: "on my way",
      associatedMessageType: 0,
    }),
    classifyAppleMessage({
      guid: "g-out",
      chatIdentifier: "+19735550101",
      isFromMe: 1,
      date: 1_000_000_000,
      text: "see you",
      associatedMessageType: 0,
    }),
    classifyAppleMessage({
      guid: "g-tap",
      chatIdentifier: "+19735550101",
      isFromMe: 0,
      date: 0,
      text: "Loved “hello”",
      associatedMessageType: 3,
    }),
    classifyAppleMessage({
      guid: "g-empty",
      chatIdentifier: "+19735550101",
      isFromMe: 0,
      date: 0,
      text: "   ",
      attributedBody: null,
      associatedMessageType: 0,
    }),
  ];
  assert.equal(classified.filter((row) => row.status === "skip" && row.reason === "tapback").length, 1);
  assert.equal(classified.filter((row) => row.status === "skip" && row.reason === "empty").length, 1);

  const summary = summarizeMessageScan(classified, [inbound, outbound]);
  assert.equal(summary.inbound, 1);
  assert.equal(summary.outbound, 1);
  assert.equal(summary.emptyOrFailedDecodes, 1);
  assert.equal(summary.tapbacksExcluded, 1);
  assert.ok(summary.dateRange);
  assert.equal(summary.dateRange?.earliest, inbound.occurred_at);
  assert.equal(summary.dateRange?.latest, outbound.occurred_at);
});

test("local apply requires localhost, an exact recruit, and confirmation", () => {
  assert.equal(isLocalSupabaseHost("127.0.0.1"), true);
  assert.equal(isLocalSupabaseHost("127.0.0.1:54321"), true);
  assert.equal(isLocalSupabaseHost("localhost"), true);
  assert.equal(isLocalSupabaseHost("localhost:54321"), true);
  assert.equal(isLocalSupabaseHost("xyzcompany.supabase.co"), false);

  assert.equal(hasForbiddenWriteFlags(["--apply-local", "--confirm-local-import"]), false);
  assert.equal(hasForbiddenWriteFlags(["--apply"]), true);
  assert.equal(hasForbiddenWriteFlags(["--write"]), true);
  assert.match(forbiddenWriteError(), /--apply-local/);

  const landon = { id: "alex-id", name: "Alex One", osHandles: ["9735550101"] };
  const filter = { status: "matched" as const, recruit: landon, query: "Alex One" };

  assert.throws(
    () => assertLocalApplyEnvironment({ host: "xyzcompany.supabase.co", recruitQuery: "Alex One" }),
    /127\.0\.0\.1 or localhost/,
  );
  assert.throws(
    () => assertLocalApplyEnvironment({ host: "127.0.0.1:54321", recruitQuery: null }),
    /exact --recruit/,
  );
  assert.doesNotThrow(() =>
    assertLocalApplyEnvironment({ host: "127.0.0.1:54321", recruitQuery: "Alex One" }),
  );

  assert.equal(isExactRecruitQuery(landon, "Alex One"), true);
  assert.equal(isExactRecruitQuery(landon, "alex-id"), true);
  assert.equal(isExactRecruitQuery(landon, "Alex"), false);

  assert.throws(
    () =>
      assertLocalApplyReady({
        recruitQuery: "Alex",
        filter,
        proposedCount: 3,
        confirmed: true,
      }),
    /exact recruit name/,
  );
  assert.throws(
    () =>
      assertLocalApplyReady({
        recruitQuery: "Alex One",
        filter: { status: "all" },
        proposedCount: 3,
        confirmed: true,
      }),
    /unfiltered bulk writes/,
  );
  assert.throws(
    () =>
      assertLocalApplyReady({
        recruitQuery: "Alex One",
        filter,
        proposedCount: 3,
        confirmed: false,
      }),
    /--confirm-local-import/,
  );
  assert.match(
    (() => {
      try {
        assertLocalApplyReady({
          recruitQuery: "Alex One",
          filter,
          proposedCount: 3,
          confirmed: false,
        });
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
    })(),
    /Proposed recruiting_interactions: 3/,
  );
  assert.doesNotThrow(() =>
    assertLocalApplyReady({
      recruitQuery: "Alex One",
      filter,
      proposedCount: 3,
      confirmed: true,
    }),
  );
});

test("local upserts are idempotent on Apple GUID source keys", () => {
  const row = toRecruitingInteractionInsert({
    recruit_person_id: "alex-id",
    tournament_id: null,
    occurred_at: "2024-01-02T00:00:00.000Z",
    interaction_type: "text",
    channel: "iMessage",
    direction: "inbound",
    participants: "+19735550101",
    notes: "hello",
    next_steps: null,
    logged_by: null,
    source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
    source_key: "guid-landon-1",
  });
  assert.equal(row.source_system, "apple_messages");
  assert.equal(row.source_key, "guid-landon-1");
  assert.equal(row.recruit_person_id, "alex-id");
  assert.equal(row.occurred_at, "2024-01-02T00:00:00.000Z");
  assert.equal(row.notes, "hello");
  assert.equal(row.direction, "inbound");
  assert.equal(row.channel, "iMessage");
  assert.equal(row.participants, "+19735550101");

  const first = partitionLocalUpserts([row], []);
  assert.equal(first.toInsert.length, 1);
  assert.equal(first.alreadyExisting.length, 0);

  const second = partitionLocalUpserts([row], first.toInsert.map((item) => item.source_key));
  assert.equal(second.toInsert.length, 0);
  assert.equal(second.alreadyExisting.length, 1);
  assert.equal(second.alreadyExisting[0]?.source_key, "guid-landon-1");

  const missing = partitionLocalUpserts(
    [{ ...row, recruit_person_id: "", source_key: "guid-missing" }],
    [],
  );
  assert.equal(missing.skipped.length, 1);
  assert.equal(missing.toInsert.length, 0);
});

test("production dry-run requires hosted credentials, an exact recruit, and never treats localhost as production", () => {
  assert.equal(hasProductionDryRunFlag(["--production-dry-run", "--recruit", "Alex One"]), true);
  assert.equal(hasProductionDryRunFlag(["--apply-local"]), false);
  assert.equal(isProductionSupabaseHost("abcdefghijklmn.supabase.co"), true);
  assert.equal(isProductionSupabaseHost("127.0.0.1:54321"), false);
  assert.equal(isProductionSupabaseHost("localhost"), false);

  const parsed = parseDotEnv(
    [
      "# comment",
      'NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmn.supabase.co"',
      "SUPABASE_SERVICE_ROLE_KEY=service-role-test-key",
      "",
    ].join("\n"),
  );
  const creds = productionCredentialsFromEnv(parsed);
  assert.equal(creds.host, "abcdefghijklmn.supabase.co");
  assert.equal(creds.url, "https://abcdefghijklmn.supabase.co");

  assert.throws(
    () =>
      productionCredentialsFromEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
      }),
    /hosted production Supabase host/,
  );

  const landon = { id: "alex-id", name: "Alex One", osHandles: ["9735550101"] };
  const filter = { status: "matched" as const, recruit: landon, query: "Alex One" };

  assert.throws(
    () =>
      assertProductionDryRunEnvironment({
        host: "127.0.0.1:54321",
        recruitQuery: "Alex One",
        applyLocal: false,
      }),
    /hosted production Supabase host/,
  );
  assert.throws(
    () =>
      assertProductionDryRunEnvironment({
        host: "abcdefghijklmn.supabase.co",
        recruitQuery: null,
        applyLocal: false,
      }),
    /exact --recruit/,
  );
  assert.throws(
    () =>
      assertProductionDryRunEnvironment({
        host: "abcdefghijklmn.supabase.co",
        recruitQuery: "Alex One",
        applyLocal: true,
      }),
    /combine --production-dry-run with --apply-local/,
  );
  assert.doesNotThrow(() =>
    assertProductionDryRunEnvironment({
      host: "abcdefghijklmn.supabase.co",
      recruitQuery: "Alex One",
      applyLocal: false,
    }),
  );

  assert.throws(
    () =>
      assertProductionDryRunReady({
        recruitQuery: "Alex",
        filter,
      }),
    /exact recruit name/,
  );
  assert.throws(
    () =>
      assertProductionDryRunReady({
        recruitQuery: "Alex One",
        filter: { status: "all" },
      }),
    /unfiltered bulk reads/,
  );
  assert.doesNotThrow(() =>
    assertProductionDryRunReady({
      recruitQuery: "Alex One",
      filter,
    }),
  );
  assert.equal(productionReportSlug("Alex One"), "apple-messages-production-dry-run-alex-one");
});

test("production dry-run GUID comparison reports new versus already present keys", () => {
  const row = toRecruitingInteractionInsert({
    recruit_person_id: "alex-id",
    tournament_id: null,
    occurred_at: "2024-01-02T00:00:00.000Z",
    interaction_type: "text",
    channel: "iMessage",
    direction: "inbound",
    participants: "+19735550101",
    notes: "secret text must stay in the private report",
    next_steps: null,
    logged_by: null,
    source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
    source_key: "guid-landon-prod-1",
  });
  const empty = compareProposedGuids([row], []);
  assert.equal(empty.newCount, 1);
  assert.equal(empty.alreadyPresentCount, 0);
  assert.deepEqual(empty.newSourceKeys, ["guid-landon-prod-1"]);

  const existing = compareProposedGuids([row], ["guid-landon-prod-1"]);
  assert.equal(existing.newCount, 0);
  assert.equal(existing.alreadyPresentCount, 1);
  assert.deepEqual(existing.alreadyPresentSourceKeys, ["guid-landon-prod-1"]);
});
