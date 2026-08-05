/**
 * BP-027 — Global Data Formatting Standards.
 *
 * Presentation-only helpers. Database values, sorting, filtering, search,
 * and calculations must keep using raw numbers / dates.
 *
 * Use these from every module (Team, Recruiting, Operations, Research,
 * dashboards, reports) instead of local `toFixed` / ad-hoc date strings.
 */

export { EMPTY_VALUE } from "./constants";
export { formatDisplay, isEmptyDisplayValue } from "./empty";
export { formatDate, formatTime, parseDisplayDate } from "./dates";
export { formatGpa, formatPercent, formatUtr, formatWtn } from "./numbers";
