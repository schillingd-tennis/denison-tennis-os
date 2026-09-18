import { WHATSAPP_SOURCE_SYSTEM, type WhatsAppProposedInteraction } from "../whatsapp";

export const INTERACTIONS_TABLE = "recruiting_interactions";
export const INTERACTIONS_ON_CONFLICT = "source_system,source_key";

export type WhatsAppWriterPort = {
  upsertInteractions(rows: WhatsAppProposedInteraction[]): Promise<{ inserted: number }>;
};

export type InteractionsUpsertResult = {
  error: { message: string } | null;
};

export type InteractionsTable = {
  upsert: (
    rows: WhatsAppProposedInteraction[],
    options: { onConflict: string },
  ) => Promise<InteractionsUpsertResult>;
};

export type InteractionsClient = {
  from: (table: string) => InteractionsTable;
};

export function interactionIdentity(row: WhatsAppProposedInteraction): string {
  return `${row.source_system}:${row.source_key}`;
}

export function createMemoryWhatsAppWriter(): WhatsAppWriterPort & {
  rows: Map<string, WhatsAppProposedInteraction>;
} {
  const rows = new Map<string, WhatsAppProposedInteraction>();
  return {
    rows,
    async upsertInteractions(incoming) {
      let inserted = 0;
      for (const row of incoming) {
        if (row.source_system !== WHATSAPP_SOURCE_SYSTEM) continue;
        if (!row.source_key) continue;
        if (rows.has(row.source_key)) continue;
        rows.set(row.source_key, row);
        inserted += 1;
      }
      return { inserted };
    },
  };
}

export function createRecruitingInteractionsWhatsAppWriter(client: InteractionsClient): WhatsAppWriterPort {
  return {
    async upsertInteractions(rows) {
      if (rows.length === 0) return { inserted: 0 };
      for (const row of rows) {
        if (row.source_system !== WHATSAPP_SOURCE_SYSTEM) {
          throw new Error(`WhatsApp writer refused non-whatsapp source_system: ${row.source_system}`);
        }
      }
      const { error } = await client.from(INTERACTIONS_TABLE).upsert(rows, {
        onConflict: INTERACTIONS_ON_CONFLICT,
      });
      if (error) throw new Error(error.message);
      return { inserted: rows.length };
    },
  };
}
