import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { copyChatDatabase } from "./messagesCopy";

test("chat db copy uses a temp source and never reads live Messages", () => {
  const root = mkdtempSync(join(tmpdir(), "chat-copy-"));
  try {
    const source = join(root, "chat.db");
    writeFileSync(source, "fake-chat");
    writeFileSync(`${source}-wal`, "wal");
    const destDir = join(root, "out");
    const dest = copyChatDatabase(source, destDir);
    assert.equal(readFileSync(dest, "utf8"), "fake-chat");
    assert.equal(existsSync(`${dest}-wal`), true);
    assert.equal(existsSync(`${dest}-shm`), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
