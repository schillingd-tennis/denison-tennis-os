/**
 * Phase 1 Apple Messages importer — dry-run only.
 *
 * Copies Messages/Contacts databases before reading them (same approach as
 * the local sync.js). Recruits come from the OS, never Coda. Default is dry-run.
 * --apply-local may upsert recruiting_interactions on 127.0.0.1/localhost for
 * one exact recruit after --confirm-local-import. --production-dry-run reads
 * hosted recruits and existing GUIDs from .env.production.local only; it never
 * writes. Never writes Messages, Contacts, Coda, recruit profiles, or production.
 *
 *   npx tsx scripts/import-apple-messages.ts
 *   npx tsx scripts/import-apple-messages.ts --recruit "Alex One"
 *   npx tsx scripts/import-apple-messages.ts --recruit "Alex One" --apply-local --confirm-local-import
 *   npx tsx scripts/import-apple-messages.ts --recruit "Alex One" --production-dry-run
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  APPLE_MESSAGES_SOURCE_SYSTEM,
  PRODUCTION_ENV_FILE,
  attachRecruit,
  candidateHandlesForRecruit,
  classifyAppleMessage,
  compareProposedGuids,
  dedupeByGuid,
  forbiddenWriteError,
  hasForbiddenWriteFlags,
  hasLocalApplyFlag,
  hasLocalConfirmFlag,
  hasProductionDryRunFlag,
  isGroupChat,
  matchRecruitsToThreads,
  normalizeHandle,
  parseDotEnv,
  parseRecruitFlag,
  parseAppleMessage,
  partitionLocalUpserts,
  productionCredentialsFromEnv,
  productionReportSlug,
  recruitFilterError,
  reportFileSlug,
  resolveRecruitFilter,
  assertLocalApplyEnvironment,
  assertLocalApplyReady,
  assertProductionDryRunEnvironment,
  assertProductionDryRunReady,
  summarizeMessageScan,
  type AppleMessageRow,
  type ProposedInteraction,
  type RecruitMatchInput,
} from "../src/features/interactions/appleMessages";

loadEnvConfig(process.cwd());

const HOME = homedir();
const CHAT_DB = join(HOME, "Library/Messages/chat.db");
const ADDRESSBOOK_DIR = join(HOME, "Library/Application Support/AddressBook");
const REPORT_DIR = join(process.cwd(), "private-imports");
const OVERRIDES_PATH = join(REPORT_DIR, "apple-messages-overrides.json");
const REPORT_JSON = join(REPORT_DIR, "apple-messages-report.json");
const REPORT_CSV = join(REPORT_DIR, "apple-messages-report.csv");

type RoleJoin = { key: string } | { key: string }[] | null;

type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  cell_phone: string | null;
  personal_email: string | null;
  denison_email: string | null;
  role?: RoleJoin;
};

function failIfWriteRequested(): void {
  if (hasForbiddenWriteFlags(process.argv.slice(2))) {
    throw new Error(forbiddenWriteError());
  }
}

async function loadExistingAppleKeys(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db
    .from("recruiting_interactions")
    .select("source_key")
    .eq("source_system", APPLE_MESSAGES_SOURCE_SYSTEM);
  if (error) throw new Error(`Could not read recruiting_interactions: ${error.message}`);
  return new Set((data ?? []).map((row) => row.source_key).filter((value): value is string => Boolean(value)));
}

async function insertLocalInteractions(
  db: SupabaseClient,
  rows: ProposedInteraction[],
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0;
  let failed = 0;
  for (let index = 0; index < rows.length; index += 200) {
    const batch = rows.slice(index, index + 200);
    const { error } = await db
      .from("recruiting_interactions")
      .upsert(batch, { onConflict: "source_system,source_key" });
    if (!error) {
      inserted += batch.length;
      continue;
    }
    for (const row of batch) {
      const { error: rowError } = await db
        .from("recruiting_interactions")
        .upsert(row, { onConflict: "source_system,source_key" });
      if (rowError) failed += 1;
      else inserted += 1;
    }
  }
  return { inserted, failed };
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
  return url;
}

function appHost(): string {
  try {
    return new URL(appUrl()).host;
  } catch {
    return "(invalid NEXT_PUBLIC_SUPABASE_URL)";
  }
}

function serviceRoleKey(): string {
  const fromEnv =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SECRET_KEY;
  if (fromEnv) return fromEnv;
  if (!/127\.0\.0\.1|localhost/.test(appUrl())) {
    throw new Error("Reading OS recruits requires SUPABASE_SERVICE_ROLE_KEY for the hosted project.");
  }
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const match = output.match(/^SERVICE_ROLE_KEY=(.+)$/m);
  if (!match) throw new Error("Could not read SERVICE_ROLE_KEY from supabase status.");
  return match[1]!.trim().replace(/^["']|["']$/g, "");
}

function readClient(url = appUrl(), key = serviceRoleKey()): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

function loadProductionCredentials(): { url: string; key: string; host: string } {
  const path = join(process.cwd(), PRODUCTION_ENV_FILE);
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${PRODUCTION_ENV_FILE}. Create it from Vercel production env with: npx vercel env pull ${PRODUCTION_ENV_FILE} --environment production`,
    );
  }
  return productionCredentialsFromEnv(parseDotEnv(readFileSync(path, "utf8")));
}

function roleKey(role: RoleJoin): string | null {
  if (!role) return null;
  if (Array.isArray(role)) return role[0]?.key ?? null;
  return role.key ?? null;
}

function displayName(row: PersonRow): string {
  const first = (row.preferred_name || row.first_name || "").trim();
  return `${first} ${row.last_name ?? ""}`.trim();
}

async function loadRecruits(db: SupabaseClient): Promise<RecruitMatchInput[]> {
  const [{ data: profiles, error: profileError }, { data: people, error: peopleError }] = await Promise.all([
    db.from("recruit_profiles").select("person_id"),
    db
      .from("production_people")
      .select("id, first_name, last_name, preferred_name, cell_phone, personal_email, denison_email, role:roles!inner(key)")
      .eq("role.key", "recruit"),
  ]);
  if (profileError) throw new Error(`Could not read recruit_profiles: ${profileError.message}`);
  if (peopleError) throw new Error(`Could not read production_people: ${peopleError.message}`);
  const profileIds = new Set((profiles ?? []).map((row) => row.person_id).filter(Boolean));
  return ((people ?? []) as PersonRow[])
    .filter((person) => profileIds.has(person.id) && roleKey(person.role ?? null) === "recruit")
    .map((person) => ({
      id: person.id,
      name: displayName(person),
      osHandles: [person.cell_phone, person.personal_email, person.denison_email].filter(
        (value): value is string => Boolean(value),
      ),
    }));
}

function loadOverrides(): Record<string, string> {
  if (!existsSync(OVERRIDES_PATH)) return {};
  const parsed = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("apple-messages-overrides.json must be a JSON object of name-or-id → handle.");
  }
  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) overrides[key] = value;
  }
  return overrides;
}

function copySqlite(src: string, dest: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const from = src + suffix;
    if (existsSync(from)) copyFileSync(from, dest + suffix);
  }
}

function loadContacts(tmpDir: string): Map<string, Set<string>> {
  const byName = new Map<string, Set<string>>();
  if (!existsSync(ADDRESSBOOK_DIR)) {
    console.warn("No AddressBook directory found; skipping Contacts pass.");
    return byName;
  }

  const dbs: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".abcddb")) dbs.push(full);
    }
  };
  try {
    walk(ADDRESSBOOK_DIR);
  } catch (error) {
    console.warn("Could not scan AddressBook:", error instanceof Error ? error.message : error);
    return byName;
  }

  for (const [index, src] of dbs.entries()) {
    const copy = join(tmpDir, `${index}-${src.split("/").pop()}`);
    let db: DatabaseSync | undefined;
    try {
      copySqlite(src, copy);
      db = new DatabaseSync(copy, { readOnly: true });
      const rows = db
        .prepare(
          `SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last, p.ZFULLNUMBER AS num
             FROM ZABCDPHONENUMBER p
             JOIN ZABCDRECORD r ON r.Z_PK = p.ZOWNER
            WHERE p.ZFULLNUMBER IS NOT NULL`,
        )
        .all() as Array<{ first: string | null; last: string | null; num: string | null }>;
      for (const row of rows) {
        const full = [row.first, row.last].filter(Boolean).join(" ").trim().toLowerCase();
        if (!full) continue;
        const handle = normalizeHandle(row.num);
        if (!handle) continue;
        const set = byName.get(full) ?? new Set<string>();
        set.add(handle);
        byName.set(full, set);
      }
    } catch (error) {
      console.warn(`Skipped contacts source ${src.split("/").pop()}:`, error instanceof Error ? error.message : error);
    } finally {
      db?.close();
    }
  }
  return byName;
}

function loadMessages(tmpDir: string): AppleMessageRow[] {
  if (!existsSync(CHAT_DB)) {
    throw new Error("Can't find the Messages database. Grant Full Disk Access to Terminal and try again.");
  }
  const copy = join(tmpDir, "chat.db");
  copySqlite(CHAT_DB, copy);
  const db = new DatabaseSync(copy, { readOnly: true });
  try {
    const stmt = db.prepare(
      `SELECT m.guid                    AS guid,
              c.chat_identifier         AS chatIdentifier,
              m.is_from_me            AS isFromMe,
              m.date                  AS date,
              m.text                  AS text,
              m.attributedBody        AS attributedBody,
              m.associated_message_type AS associatedMessageType,
              c.service_name          AS serviceName
         FROM message m
         JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
         JOIN chat c ON c.ROWID = cmj.chat_id
        WHERE c.chat_identifier NOT LIKE 'chat%'
        ORDER BY m.date ASC`,
    );
    stmt.setReadBigInts(true);
    return stmt.all() as AppleMessageRow[];
  } finally {
    db.close();
  }
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  failIfWriteRequested();
  const applyLocal = hasLocalApplyFlag(argv);
  const confirmLocal = hasLocalConfirmFlag(argv);
  const productionDryRun = hasProductionDryRunFlag(argv);
  const recruitQuery = parseRecruitFlag(argv);
  if (applyLocal) {
    assertLocalApplyEnvironment({ host: appHost(), recruitQuery });
  }

  let production:
    | { url: string; key: string; host: string }
    | null = null;
  if (productionDryRun) {
    production = loadProductionCredentials();
    assertProductionDryRunEnvironment({
      host: production.host,
      recruitQuery,
      applyLocal,
    });
  }

  const tmpDir = join(tmpdir(), `apple-messages-${process.pid}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  try {
    console.log(
      productionDryRun
        ? "Apple Messages importer — production dry-run. Reads only; no production writes."
        : applyLocal
          ? "Apple Messages importer — local apply requested. Writes only target 127.0.0.1/localhost recruiting_interactions."
          : "Apple Messages importer — dry-run only. No writes.",
    );
    const db = production
      ? readClient(production.url, production.key)
      : readClient();
    console.log(`App database host: ${production ? production.host : appHost()}`);

    const recruits = await loadRecruits(db);
    const filter = resolveRecruitFilter(recruits, recruitQuery);
    if (filter.status === "none" || filter.status === "ambiguous") {
      throw new Error(recruitFilterError(filter));
    }
    if (productionDryRun) {
      if (!recruitQuery) {
        throw new Error("--production-dry-run requires an exact --recruit name or recruit ID.");
      }
      assertProductionDryRunReady({ recruitQuery, filter });
    }

    const overrides = loadOverrides();
    const contacts = loadContacts(tmpDir);
    const rows = loadMessages(tmpDir);

    const parsed = rows
      .filter((row) => !isGroupChat(String(row.chatIdentifier ?? "")))
      .map(parseAppleMessage)
      .filter((row): row is ProposedInteraction => row !== null);

    const { unique, duplicateKeys } = dedupeByGuid(parsed);
    const threadHandles = new Set(unique.map((row) => row.participants));

    const match = matchRecruitsToThreads({
      recruits,
      threadHandles,
      contacts,
      overrides,
    });

    const handleToRecruit = new Map(match.matched.map((row) => [row.handle, row]));
    const proposed = unique
      .map((row) => {
        const recruit = handleToRecruit.get(row.participants);
        return recruit ? attachRecruit(row, recruit) : null;
      })
      .filter((row): row is ProposedInteraction => row !== null);

    const unmatchedThreads = [...threadHandles].filter((handle) => !handleToRecruit.has(handle));

    const selected = filter.status === "matched" ? filter.recruit : null;
    const matchOut = selected
      ? {
          matched: match.matched.filter((row) => row.recruitId === selected.id),
          unmatched: match.unmatched.filter((row) => row.recruitId === selected.id),
          ambiguous: match.ambiguous.filter((row) => row.recruitId === selected.id),
        }
      : match;
    const proposedOut = selected
      ? proposed.filter((row) => row.recruit_person_id === selected.id)
      : proposed;
    const selectedHandles = selected
      ? new Set([
          ...candidateHandlesForRecruit(selected, contacts, overrides),
          ...matchOut.matched.map((row) => row.handle),
          ...matchOut.ambiguous.flatMap((row) => row.handles),
        ])
      : null;
    const classified = rows.map(classifyAppleMessage);
    const scopedClassified = selectedHandles
      ? classified.filter((row) => Boolean(row.handle && selectedHandles.has(row.handle)))
      : classified;
    const unmatchedThreadsOut = selectedHandles
      ? unmatchedThreads.filter((handle) => selectedHandles.has(handle))
      : unmatchedThreads;
    const summary = summarizeMessageScan(scopedClassified, proposedOut);

    const reportBase = productionDryRun && selected
      ? productionReportSlug(selected.name)
      : selected
        ? `apple-messages-report-${reportFileSlug(selected.name)}`
        : null;
    const reportJson = reportBase ? join(REPORT_DIR, `${reportBase}.json`) : REPORT_JSON;
    const reportCsv = reportBase ? join(REPORT_DIR, `${reportBase}.csv`) : REPORT_CSV;

    const report = selected
      ? {
          dryRun: true,
          verification: true,
          filter: { query: recruitQuery ?? selected.name, recruitId: selected.id, name: selected.name },
          sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM,
          appHost: appHost(),
          inbound: summary.inbound,
          outbound: summary.outbound,
          emptyOrFailedDecodes: summary.emptyOrFailedDecodes,
          tapbacksExcluded: summary.tapbacksExcluded,
          dateRange: summary.dateRange,
          recruitCount: 1,
          contactCards: contacts.size,
          oneToOneThreads: threadHandles.size,
          matchedCount: matchOut.matched.length,
          unmatchedCount: matchOut.unmatched.length,
          ambiguousCount: matchOut.ambiguous.length,
          unmatchedThreadCount: unmatchedThreadsOut.length,
          duplicateGuids: duplicateKeys.length,
          proposedCount: proposedOut.length,
          matched: matchOut.matched,
          unmatched: matchOut.unmatched,
          ambiguous: matchOut.ambiguous,
          unmatchedThreads: unmatchedThreadsOut,
          proposed: proposedOut,
        }
      : {
          dryRun: true,
          sourceSystem: APPLE_MESSAGES_SOURCE_SYSTEM,
          appHost: appHost(),
          recruitCount: recruits.length,
          contactCards: contacts.size,
          oneToOneThreads: threadHandles.size,
          matchedCount: match.matched.length,
          unmatchedCount: match.unmatched.length,
          ambiguousCount: match.ambiguous.length,
          unmatchedThreadCount: unmatchedThreads.length,
          duplicateGuids: duplicateKeys.length,
          proposedCount: proposed.length,
          matched: match.matched,
          unmatched: match.unmatched,
          ambiguous: match.ambiguous,
          unmatchedThreads,
          proposed,
        };

    let reportOut: Record<string, unknown> = report;
    if (productionDryRun) {
      const existingKeys = await loadExistingAppleKeys(db);
      const comparison = compareProposedGuids(proposedOut, existingKeys);
      reportOut = {
        ...report,
        productionDryRun: true,
        appHost: production?.host ?? appHost(),
        newCount: comparison.newCount,
        alreadyPresentCount: comparison.alreadyPresentCount,
        newSourceKeys: comparison.newSourceKeys,
        alreadyPresentSourceKeys: comparison.alreadyPresentSourceKeys,
      };
      console.log(`Production GUIDs already present: ${comparison.alreadyPresentCount}`);
      console.log(`Production GUIDs new: ${comparison.newCount}`);
    }

    writeFileSync(reportJson, `${JSON.stringify(reportOut, null, 2)}\n`);
    writeFileSync(
      reportCsv,
      [
        ["recruit_person_id", "handle", "direction", "occurred_at", "source_key", "notes"].join(","),
        ...proposedOut.map((row) =>
          [row.recruit_person_id, row.participants, row.direction, row.occurred_at, row.source_key, row.notes]
            .map((value) => csvEscape(String(value)))
            .join(","),
        ),
      ].join("\n") + "\n",
    );

    if (selected) {
      console.log(`Verification filter: ${selected.name} (${selected.id})`);
    }
    console.log(`Recruits: ${selected ? 1 : recruits.length}`);
    console.log(`Contacts cards: ${contacts.size}`);
    console.log(`1:1 threads with content: ${threadHandles.size}`);
    console.log(`Matched recruits: ${matchOut.matched.length}`);
    console.log(`Unmatched recruits: ${matchOut.unmatched.length}`);
    console.log(`Ambiguous recruits: ${matchOut.ambiguous.length}`);
    console.log(`Unmatched 1:1 threads: ${unmatchedThreadsOut.length}`);
    console.log(`Duplicate Apple GUIDs skipped: ${duplicateKeys.length}`);
    console.log(`Proposed recruiting_interactions: ${proposedOut.length}`);
    if (selected) {
      console.log(`Inbound: ${summary.inbound}`);
      console.log(`Outbound: ${summary.outbound}`);
      console.log(`Empty/failed decodes: ${summary.emptyOrFailedDecodes}`);
      console.log(`Tapbacks excluded: ${summary.tapbacksExcluded}`);
      console.log(
        `Date range: ${summary.dateRange ? `${summary.dateRange.earliest} → ${summary.dateRange.latest}` : "none"}`,
      );
    }
    for (const row of matchOut.unmatched) {
      console.log(`  unmatched: ${row.name} — ${row.reason}`);
    }
    for (const row of matchOut.ambiguous) {
      console.log(`  ambiguous: ${row.name} — ${row.reason}`);
    }
    console.log(`Report: ${reportJson}`);
    console.log(`CSV: ${reportCsv}`);
    if (!existsSync(OVERRIDES_PATH)) {
      console.log(`Overrides (optional JSON object of name-or-id → handle): ${OVERRIDES_PATH}`);
    }

    if (applyLocal && !productionDryRun) {
      if (!recruitQuery) {
        throw new Error("--apply-local requires an exact --recruit name or recruit ID.");
      }
      assertLocalApplyReady({
        recruitQuery,
        filter,
        proposedCount: proposedOut.length,
        confirmed: confirmLocal,
      });
      const db = readClient();
      const existingKeys = await loadExistingAppleKeys(db);
      const partitioned = partitionLocalUpserts(proposedOut, existingKeys);
      const written = await insertLocalInteractions(db, partitioned.toInsert);
      const skipped =
        partitioned.skipped.length + summary.emptyOrFailedDecodes + summary.tapbacksExcluded;
      console.log(
        `Local apply: inserted ${written.inserted}, already existing ${partitioned.alreadyExisting.length}, skipped ${skipped}, failed ${written.failed}.`,
      );
      writeFileSync(
        reportJson,
        `${JSON.stringify(
          {
            ...report,
            dryRun: false,
            apply: {
              inserted: written.inserted,
              alreadyExisting: partitioned.alreadyExisting.length,
              skipped,
              failed: written.failed,
            },
          },
          null,
          2,
        )}\n`,
      );
      if (written.failed > 0) process.exitCode = 1;
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
