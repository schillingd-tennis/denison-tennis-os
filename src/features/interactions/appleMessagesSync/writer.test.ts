import assert from "node:assert/strict";
import { test } from "node:test";

import { APPLE_MESSAGES_SOURCE_SYSTEM, type ProposedInteraction } from "../appleMessages";
import {
  INTERACTIONS_TABLE,
  INTERACTIONS_ON_CONFLICT,
  createRecruitingInteractionsWriter,
  createMemoryProductionWriter,
} from "./writer";

function row(guid: string): ProposedInteraction {
  return {
    recruit_person_id: "recruit-1",
    tournament_id: null,
    occurred_at: "2026-08-17T16:30:00.000Z",
    interaction_type: "text" as const,
    channel: null,
    direction: "inbound" as const,
    participants: "+19735550101",
    notes: "",
    next_steps: null,
    logged_by: null,
    source_system: APPLE_MESSAGES_SOURCE_SYSTEM,
    source_key: guid,
  };
}

test("memory writer inserts a GUID once and treats the retry as a no-op", async () => {
  const writer = createMemoryProductionWriter();
  const first = await writer.upsertInteractions([row("g-1")]);
  const second = await writer.upsertInteractions([row("g-1")]);
  assert.equal(first.inserted, 1);
  assert.equal(second.inserted, 0);
  assert.equal(writer.rows.size, 1);
});

test("production writer only targets recruiting_interactions with a GUID conflict target", async () => {
  const calls: Array<{ table: string; onConflict: string }> = [];
  const client = {
    from(table: string) {
      return {
        async upsert(_rows: unknown, options: { onConflict: string }) {
          calls.push({ table, onConflict: options.onConflict });
          return { error: null };
        },
      };
    },
  };
  const writer = createRecruitingInteractionsWriter(client);
  const result = await writer.upsertInteractions([row("g-2")]);
  assert.equal(result.inserted, 1);
  assert.equal(calls[0]?.table, INTERACTIONS_TABLE);
  assert.equal(calls[0]?.onConflict, INTERACTIONS_ON_CONFLICT);
  assert.equal(INTERACTIONS_TABLE, "recruiting_interactions");
});
