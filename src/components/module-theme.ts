/**
 * Module-aware chrome classes. Accent colors are set by AppShell `[data-module]`.
 * Semantic status (success / warning / danger / info) stays on those tokens.
 */

export const modulePrimaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export const modulePrimaryButtonClassSm =
  "inline-flex h-9 items-center justify-center rounded-control bg-[var(--module-accent)] px-3.5 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export const moduleFieldClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--module-accent)] focus:ring-1 focus:ring-[var(--module-accent)]/30";

export const moduleFieldClassCompact =
  "w-full rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-[var(--module-accent)] focus:ring-1 focus:ring-[var(--module-accent)]/30";

export const moduleSurfaceClass =
  "rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]";

export const moduleDirectoryCardClass =
  "group relative flex h-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-card border border-[var(--module-border)] bg-surface px-5 py-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--module-accent)]/40 hover:shadow-[0_10px_24px_rgba(17,24,39,0.07)]";
