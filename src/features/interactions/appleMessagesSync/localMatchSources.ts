/**
 * Local Mac matching extras for the live helper and dry-run importer.
 * Contacts and overrides stay on this Mac. Never log handles or names.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { normalizeHandle } from "../appleMessages";

export const OVERRIDES_FILENAME = "apple-messages-overrides.json";
export const PRIVATE_IMPORTS_DIR = "private-imports";

export function loadHandleOverrides(home: string): Record<string, string> {
  const candidates = [
    join(home, OVERRIDES_FILENAME),
    join(process.cwd(), PRIVATE_IMPORTS_DIR, OVERRIDES_FILENAME),
  ];
  const merged: Record<string, string> = {};
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("apple-messages-overrides.json must be a JSON object of name-or-id → handle.");
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) merged[key] = value;
    }
  }
  return merged;
}

function copySqlite(src: string, dest: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const from = src + suffix;
    if (existsSync(from)) copyFileSync(from, dest + suffix);
  }
}

function addHandle(map: Map<string, Set<string>>, name: string, raw: string | null): void {
  const full = name.trim().toLowerCase();
  const handle = normalizeHandle(raw);
  if (!full || !handle) return;
  const set = map.get(full) ?? new Set<string>();
  set.add(handle);
  map.set(full, set);
}

/**
 * Read a copied AddressBook sqlite. Missing tables are skipped so older
 * AddressBook schemas still contribute phone numbers.
 */
export function contactsFromAddressBookCopy(dbPath: string): Map<string, Set<string>> {
  const byName = new Map<string, Set<string>>();
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const phones = db.prepare(
      `SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last, p.ZFULLNUMBER AS value
         FROM ZABCDPHONENUMBER p
         JOIN ZABCDRECORD r ON r.Z_PK = p.ZOWNER
        WHERE p.ZFULLNUMBER IS NOT NULL`,
    );
    for (const row of phones.all() as Array<{ first: string | null; last: string | null; value: string | null }>) {
      addHandle(byName, [row.first, row.last].filter(Boolean).join(" "), row.value);
    }
    try {
      const emails = db.prepare(
        `SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last, e.ZADDRESS AS value
           FROM ZABCDEMAILADDRESS e
           JOIN ZABCDRECORD r ON r.Z_PK = e.ZOWNER
          WHERE e.ZADDRESS IS NOT NULL`,
      );
      for (const row of emails.all() as Array<{ first: string | null; last: string | null; value: string | null }>) {
        addHandle(byName, [row.first, row.last].filter(Boolean).join(" "), row.value);
      }
    } catch {
      // Email table is optional.
    }
  } finally {
    db.close();
  }
  return byName;
}

function isContactsDatabase(name: string): boolean {
  return (
    name.endsWith(".abcddb") ||
    name === "AddressBook-v22.abcddb" ||
    name === "ContactsV2.sqlite"
  );
}

export function loadMacContacts(tmpRoot = join(tmpdir(), "denison-apple-contacts")): Map<string, Set<string>> {
  const roots = [
    join(homedir(), "Library/Application Support/AddressBook"),
    join(homedir(), "Library/Group Containers/group.com.apple.contacts"),
  ];
  const byName = new Map<string, Set<string>>();
  mkdirSync(tmpRoot, { recursive: true });
  const dbs: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isContactsDatabase(entry.name)) dbs.push(full);
    }
  };
  try {
    for (const root of roots) walk(root);
  } catch {
    // Full Disk Access may deny Contacts.
  }
  for (const [index, src] of dbs.entries()) {
    const copy = join(tmpRoot, `${index}-${src.split("/").pop()}`);
    try {
      copySqlite(src, copy);
      const part = contactsFromAddressBookCopy(copy);
      for (const [name, handles] of part) {
        const set = byName.get(name) ?? new Set<string>();
        handles.forEach((handle) => set.add(handle));
        byName.set(name, set);
      }
    } catch {
      // Skip unreadable AddressBook shards.
    }
  }
  return byName;
}
