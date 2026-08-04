/**
 * Universal Person Editor — shared types (BP-013).
 *
 * These primitives are intentionally generic (not `Person`-specific) so
 * the same editing framework can be reused by future workspaces (Recruit,
 * Parent, Coach, Operations, etc.) — see `docs/DECISIONS.md`.
 */

export type FormMode = "view" | "edit";

export type FieldErrors = Record<string, string>;

export type FieldType = "text" | "textarea" | "email" | "tel" | "date" | "number" | "select";

export type SelectOption = { value: string; label: string };
