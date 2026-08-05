/**
 * Universal Inline Editing Framework (BP-019).
 *
 * Cell-level editing primitives — deliberately record-agnostic so Team,
 * Recruiting, Alumni, Coaches, Parents, and future modules can share the
 * same double-click / keyboard / auto-save behavior without duplicating
 * logic. Pair with a module-specific `onSave` that talks to that module's
 * repository via a Server Action.
 */

export type InlineFieldType = "text" | "number" | "email" | "tel" | "url" | "select";

/**
 * Lifecycle of a single-field auto-save. `idle` is the resting state;
 * `saved` / `error` are transient and auto-clear after a short delay.
 */
export type InlineSaveStatus = "idle" | "saving" | "saved" | "error";

export type InlineSelectOption = { value: string; label: string };

/** Why a cell is committing its draft — drives post-save focus movement. */
export type InlineCommitReason = "enter" | "tab" | "shift-tab" | "blur" | "select";
