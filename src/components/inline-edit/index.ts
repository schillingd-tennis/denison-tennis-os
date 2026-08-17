/**
 * Universal Inline Editing Framework (BP-019).
 *
 * Spreadsheet-style cell editing with double-click activation, keyboard
 * productivity (Enter / Tab / Shift+Tab / Escape), blur auto-save, and
 * smart formatters. No knowledge of Person / Team / any record shape —
 * wire `onCommit` to whatever Server Action the consuming module uses.
 */
export { default as InlineEditCell } from "./InlineEditCell";
export { default as SaveIndicator } from "./SaveIndicator";
export { useSaveIndicator } from "./useSaveIndicator";
export {
  formatPhoneDisplay,
  normalizeEmail,
  normalizePhone,
  normalizeUrl,
  phoneHrefDigits,
} from "./formatters";
export type {
  InlineCommitReason,
  InlineDensity,
  InlineEmphasis,
  InlineFieldType,
  InlineSaveStatus,
  InlineSelectOption,
} from "./types";
