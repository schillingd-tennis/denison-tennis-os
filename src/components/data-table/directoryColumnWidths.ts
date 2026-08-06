/**
 * Default directory list column widths (BP-028E).
 *
 * Layout:
 *   [ Sticky Name — content width ] [ Flexible middle ] [ Sticky Actions — content width ]
 *
 * Name and Actions are fixed to content; they do NOT absorb leftover space.
 * Role / Hometown / Class / UTR / WTN share the remaining width.
 */

/**
 * Name: longest expected roster name + avatar + padding.
 * Fits “Arya Ganapathy Kallambella”; then stops growing.
 */
export const DIRECTORY_NAME_WIDTH_CLASS =
  "w-[320px] min-w-[320px] max-w-[320px]";

/** @deprecated Use DIRECTORY_NAME_WIDTH_CLASS. */
export const DIRECTORY_NAME_MIN_CLASS = DIRECTORY_NAME_WIDTH_CLASS;

/**
 * Actions: 3 × 40px icon buttons + 2 × 4px gaps + px-3 cell padding.
 * Never shrink / wrap / clip; never grow.
 */
export const DIRECTORY_ACTIONS_WIDTH_CLASS =
  "w-[152px] min-w-[152px] max-w-[152px] shrink-0";

export const DIRECTORY_COL = {
  /** Sticky left — content-sized; does not flex. */
  name: DIRECTORY_NAME_WIDTH_CLASS,
  /**
   * Middle columns — no fixed width; share leftover space under table-fixed.
   * Min-width floor for horizontal scroll is encoded in DIRECTORY_TABLE_WIDTH_PX.
   */
  role: "",
  hometown: "",
  classYear: "",
  utr: "",
  wtn: "",
  /** Sticky right — button cluster only. */
  actions: DIRECTORY_ACTIONS_WIDTH_CLASS,
} as const;

/**
 * Floor width so middle columns stay usable when the viewport is narrow
 * (horizontal scroll). Name 320 + middle mins + Actions 152.
 */
export const DIRECTORY_TABLE_WIDTH_PX = 320 + 160 + 130 + 48 + 52 + 52 + 152;

/**
 * Middle-column clip: single line + ellipsis.
 * Do NOT apply to sticky Name / Actions cells — overflow:hidden breaks sticky.
 */
export const DIRECTORY_CELL_CLIP =
  "overflow-hidden whitespace-nowrap text-ellipsis align-middle";

/** Shared cell padding / vertical centering (safe on sticky edges). */
export const DIRECTORY_CELL_PAD = "px-3 py-2 align-middle";
