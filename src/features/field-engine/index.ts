/**
 * Universal Field Engine (BP-037).
 *
 * Travel is the first consumer; Person Workspace, Recruiting, spreadsheets,
 * filters, export, and AI will consume the same renderer + catalog path.
 */

export { default as FieldRenderer } from "./FieldRenderer";
export {
  PersonFieldSession,
  usePersonFieldSession,
} from "./PersonFieldSession";
export {
  formatFieldDisplay,
  maskPassportNumber,
  maskSocialSecurityNumber,
  toEditString,
} from "./formatDisplay";
export { parseFieldValue } from "./parseValue";
export { isFieldEditable, toInlineFieldType, toInlineOptions } from "./toInlineEdit";
export type {
  FieldCapabilities,
  FieldDefinition,
  FieldEnumOption,
  FieldParseResult,
  FieldType,
} from "./types";
