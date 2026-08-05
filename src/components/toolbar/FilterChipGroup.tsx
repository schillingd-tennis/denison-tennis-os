"use client";

/**
 * Multi-select filter chips for faceted toolbars (BP-024G).
 * Each chip toggles independently — not a radio / segmented exclusive group.
 * Visual track matches the toolbar language (quiet raised active surface).
 */

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
};

export default function FilterChipGroup<T extends string>({
  value,
  onSelect,
  options,
  ariaLabel,
  equalWidth = true,
  className = "",
}: {
  /** Currently pressed chip values (may be multiple). */
  value: readonly T[];
  /** Fired for every chip click; parent owns toggle / clear semantics. */
  onSelect: (value: T) => void;
  options: FilterChipOption<T>[];
  ariaLabel: string;
  equalWidth?: boolean;
  className?: string;
}) {
  const activeValues = new Set(value);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-filter-chip-group=""
      className={[
        "h-11 rounded-control bg-black/[0.07] p-0.5 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]",
        equalWidth
          ? "inline-grid auto-cols-fr grid-flow-col"
          : "inline-flex items-stretch",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => {
        const active = activeValues.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            aria-pressed={active}
            data-filter-chip={option.value}
            data-active={active ? "true" : "false"}
            className={[
              "inline-flex h-full min-w-0 items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium transition-[color,background-color,box-shadow] duration-150",
              equalWidth ? "w-full" : "",
              active
                ? "bg-surface text-text-primary shadow-[0_1px_2px_rgba(17,24,39,0.08),0_0_0_1px_rgba(17,24,39,0.04)]"
                : "text-text-secondary hover:text-text-primary",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
