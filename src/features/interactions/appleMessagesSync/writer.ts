import { APPLE_MESSAGES_SOURCE_SYSTEM, type ProposedInteraction } from "../appleMessages";

import type { ProductionWriterPort } from "./ports";

export const INTERACTIONS_TABLE = "recruiting_interactions";
export const INTERACTIONS_ON_CONFLICT = "source_system,source_key";

export class WriterTableError extends Error {
  constructor(table: string) {
    super(`Apple Messages helper may only write ${INTERACTIONS_TABLE} (received ${table}).`);
    this.name = "WriterTableError";
  }
}

export type InteractionsUpsertResult = {
  error: { message: string } | null;
};

export type InteractionsTable = {
  upsert: (
    rows: ProposedInteraction[],
    options: { onConflict: string },
  ) => Promise<InteractionsUpsertResult>;
};

export type InteractionsClient = {
  from: (table: string) => InteractionsTable;
};

export function interactionIdentity(row: ProposedInteraction): string {
  return `${row.source_system}:${row.source_key}`;
}

export function createMemoryProductionWriter(): ProductionWriterPort & {
  rows: Map<string, ProposedInteraction>;
} {
  const rows = new Map<string, ProposedInteraction>();
  return {
    rows,
    async upsertInteractions(incoming) {
      let inserted = 0;
      for (const row of incoming) {
        if (row.source_system !== APPLE_MESSAGES_SOURCE_SYSTEM) continue;
        if (!row.source_key) continue;
        if (rows.has(row.source_key)) continue;
        rows.set(row.source_key, row as ProposedInteraction);
        inserted += 1;
      }
      return { inserted };
    },
  };
}

/**
 * Production writer. The injected client is the only I/O; tests pass a fake.
 * Restricted to recruiting_interactions GUID upserts.
 */
export function createRecruitingInteractionsWriter(client: InteractionsClient): ProductionWriterPort {
  return {
    async upsertInteractions(rows) {
      if (rows.length === 0) return { inserted: 0 };
      const tableName = INTERACTIONS_TABLE;
      if (tableName !== INTERACTIONS_TABLE) throw new WriterTableError(tableName);
      const { error } = await client.from(INTERACTIONS_TABLE).upsert(rows as ProposedInteraction[], {
        onConflict: INTERACTIONS_ON_CONFLICT,
      });
      if (error) throw new Error(error.message);
      return { inserted: rows.length };
    },
  };
}
