import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the tournament page treats recruit directory loading as optional", async () => {
  const source = await readFile("src/app/recruiting/tournaments/page.tsx", "utf8");
  assert.match(source, /loadRecruitingDirectory\(\)\.catch/);
  assert.match(source, /rows: \[\] as RecruitDirectoryRow\[\]/);
});

test("linked recruit enrichment cannot take down tournaments for stale local JWTs", async () => {
  const source = await readFile("src/features/tournaments/repository.ts", "utf8");
  assert.match(source, /jwt issued at future/);
  assert.match(source, /return tournaments/);
});

test("the tournament page resets a future-dated local session", async () => {
  const source = await readFile("src/app/recruiting/tournaments/page.tsx", "utf8");
  assert.match(source, /jwt issued at future/i);
  assert.match(source, /\/auth\/reset-session\?next=\/recruiting\/tournaments/);
});
