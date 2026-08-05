/**
 * @deprecated BP-022B — Filled pills are for notifications only.
 * Use `NotificationPill` for alerts/counts. Use `RoleBadge` for quiet identity metadata.
 * Use `StatusDot` + text for Current / Alumni.
 *
 * Kept as a thin alias so any stray imports keep compiling until migrated.
 */
export type { NotificationPillTone as StatusTone } from "./NotificationPill";
export { default } from "./NotificationPill";
