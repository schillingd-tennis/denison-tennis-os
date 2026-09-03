export const ROSTER_UNAVAILABLE_ERROR =
  "Couldn’t load the current roster. Refresh the page and try again.";

export class IntraSquadRepositoryError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly payloadSummary?: string;

  constructor(
    message: string,
    options?: {
      code?: string;
      details?: string;
      hint?: string;
      payloadSummary?: string;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "IntraSquadRepositoryError";
    this.code = options?.code;
    this.details = options?.details;
    this.hint = options?.hint;
    this.payloadSummary = options?.payloadSummary;
  }
}

export function formatUnknownPlayerError(token: string): string {
  const name = token.trim() || "that player";
  return `Couldn’t resolve player “${name}”.`;
}

function isDevDiagnosticsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

function unfinishedSchemaHint(message: string): string | null {
  if (/column .*status.* does not exist|Could not find the 'status' column/i.test(message)) {
    return "unfinished match fields are not supported by the current database schema (missing status column — apply migration 0044)";
  }
  if (/leader_player_id|trailing_player_id/i.test(message) && /does not exist|Could not find/i.test(message)) {
    return "unfinished match fields are not supported by the current database schema (missing leader/trailing columns — apply migration 0044)";
  }
  if (/null value in column \"winner_player_id\"|null value in column \"loser_player_id\"/i.test(message)) {
    return "unfinished match fields are not supported by the current database schema (winner/loser still NOT NULL — apply migration 0044)";
  }
  if (/intra_squad_matches_unfinished_players/i.test(message)) {
    return "unfinished matches require leader_player_id and trailing_player_id with winner/loser null";
  }
  if (/intra_squad_matches_completed_players/i.test(message)) {
    return "completed matches require winner_player_id and loser_player_id with leader/trailing null";
  }
  return null;
}

export function formatPersistError(error: unknown, action: "save" | "delete" = "save"): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const repoError = error instanceof IntraSquadRepositoryError ? error : null;
  const combined = [message, repoError?.details, repoError?.hint, repoError?.code]
    .filter(Boolean)
    .join(" | ");

  if (/JWT issued at future/i.test(combined)) {
    return action === "delete"
      ? "Couldn’t delete match. Sign in again and retry."
      : "Couldn’t save match. Sign in again and retry.";
  }

  const schemaHint = unfinishedSchemaHint(combined);
  if (schemaHint) {
    return `Couldn’t save match: ${schemaHint}.`;
  }

  if (/Failed to create|insert/i.test(message)) {
    if (isDevDiagnosticsEnabled() && (repoError?.details || repoError?.code || /violates|does not exist|null value/i.test(combined))) {
      const detail = repoError?.details || repoError?.code || message.replace(/^Failed to create intra-squad match:\s*/i, "");
      return `Couldn’t save match: ${detail}`;
    }
    return "Couldn’t save match. Database insert failed.";
  }
  if (/Failed to update/i.test(message)) {
    if (isDevDiagnosticsEnabled() && (repoError?.details || repoError?.code)) {
      return `Couldn’t save match: ${repoError.details || repoError.code}`;
    }
    return "Couldn’t save match.";
  }
  if (/Failed to delete/i.test(message)) {
    return "Couldn’t delete match.";
  }
  if (!message.trim()) {
    return action === "delete" ? "Couldn’t delete match." : "Couldn’t save match. Database insert failed.";
  }
  return message;
}
