/**
 * Canonical module peer-view tab strip (Practice / Agencies / Scouting).
 *
 * Use only for true peer views / Adaptive Workspace surfaces — not badges,
 * filters, lifecycle toggles, quick views, tags, or actions.
 *
 * Appearance matches Team Operations → Practice section tabs exactly:
 * rounded-card tray, rounded-control active fill with module accent.
 */
export type ModuleSectionTab<T extends string = string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  "aria-label": string;
  tabs: ReadonlyArray<ModuleSectionTab<T>>;
  activeId: T;
  onChange: (id: T) => void;
};

export default function ModuleSectionTabs<T extends string>({
  "aria-label": ariaLabel,
  tabs,
  activeId,
  onChange,
}: Props<T>) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex max-w-full gap-1 overflow-x-auto rounded-card border border-border bg-surface p-1 shadow-[0_4px_14px_rgba(17,24,39,0.03)]"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeId === tab.id ? "page" : undefined}
          className={`min-h-9 shrink-0 rounded-control px-3 text-xs font-semibold transition-colors sm:px-4 ${
            activeId === tab.id
              ? "bg-[var(--module-accent)] text-white"
              : "text-text-secondary hover:bg-app-background hover:text-text-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
