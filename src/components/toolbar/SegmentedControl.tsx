"use client";

import type { LucideIcon } from "lucide-react";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

/**
 * Exclusive segmented control (radio behavior) for single-choice toolbar
 * controls such as Cards / List. For independent multi-select filters, use
 * `FilterChipGroup` instead.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  equalWidth = true,
  className = "",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  ariaLabel: string;
  /** Equal segment widths — prevents layout shift when the selection changes. */
  equalWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        // Soft track (macOS-like): visible on app-background without a heavy border.
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
        const active = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
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
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
