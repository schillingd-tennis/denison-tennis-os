/**
 * Universal Person Editor — shared types (BP-013).
 *
 * These primitives are intentionally generic (not `Person`-specific) so
 * the same editing framework can be reused by future workspaces (Recruit,
 * Parent, Coach, Operations, etc.) — see `docs/DECISIONS.md`.
 */

export type FormMode = "view" | "edit";

/**
 * Lifecycle of a persisted save (BP-017 Phase 1). `idle` covers both "never
 * saved yet" and "settled after a save" — consumers distinguish those two
 * via `mode`/`isDirty`, not via this status.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type FieldErrors = Record<string, string>;

export type FieldType = "text" | "textarea" | "email" | "tel" | "date" | "number" | "select";

export type SelectOption = { value: string; label: string };
