"use client";

import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from "react";

/**
 * OS-wide selected / idle visuals for filter triggers (BP filter chrome).
 * Geometry (height, padding, radius) stays on each consumer so chip tracks
 * and dropdown facets keep their existing layout.
 */
export const filterTriggerSelectedClass =
  "bg-[var(--module-tint)]/40 font-semibold text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/35";

export const filterTriggerIdleClass =
  "bg-surface font-medium text-text-secondary ring-1 ring-black/[0.06] hover:bg-black/[0.03] hover:text-text-primary";

/** In-track chips: same selected language, no extra fill when idle. */
export const filterChipSelectedClass =
  "bg-[var(--module-tint)]/40 font-semibold text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/35";

export const filterChipIdleClass =
  "font-medium text-text-secondary hover:text-text-primary";

export const filterTriggerIconSelectedClass = "text-[var(--module-accent)]";

export const filterTriggerIconIdleClass = "text-text-secondary opacity-70";

export const filterTriggerBadgeClass =
  "inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--module-accent)] px-1 text-[10px] font-semibold text-surface";

export const filterMenuOptionBaseClass =
  "flex w-full items-center rounded-[8px] px-2.5 py-2 text-left text-[13px]";

export const filterMenuOptionSelectedClass =
  "font-semibold text-[var(--module-accent)]";

export const filterMenuOptionIdleClass =
  "font-medium text-text-secondary hover:bg-app-background hover:text-text-primary";

type FilterMenuOptionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
};

/** Dropdown option for shared filter menus. Selected = accent + semibold, no fill. */
export function FilterMenuOption({
  selected,
  className = "",
  type = "button",
  children,
  ...rest
}: FilterMenuOptionProps) {
  return (
    <button
      type={type}
      role="option"
      aria-selected={selected}
      data-filter-menu-option=""
      data-selected={selected ? "true" : "false"}
      className={[
        filterMenuOptionBaseClass,
        selected ? filterMenuOptionSelectedClass : filterMenuOptionIdleClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

type FilterTriggerIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

type FilterTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  active: boolean;
  label: ReactNode;
  icon?: FilterTriggerIcon;
  /** Active-count badge. Rendered only when `active` and count > 0. */
  count?: number;
  trailing?: ReactNode;
};

/**
 * Standalone faceted filter trigger (dropdown facets). Selected = Denison red
 * text / icon, semibold, subtle tint, subtle red ring. Idle stays neutral.
 */
const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger(
    { active, label, icon: Icon, count, trailing, className = "", type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-filter-trigger=""
        data-active={active ? "true" : "false"}
        className={[
          "inline-flex h-10 items-center gap-2 rounded-control px-3.5 text-[13px] transition-colors duration-150",
          active ? filterTriggerSelectedClass : filterTriggerIdleClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {Icon ? (
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${
              active ? filterTriggerIconSelectedClass : filterTriggerIconIdleClass
            }`}
            strokeWidth={1.75}
          />
        ) : null}
        {label}
        {active && count != null && count > 0 ? (
          <span className={filterTriggerBadgeClass}>{count}</span>
        ) : null}
        {trailing}
      </button>
    );
  },
);

export default FilterTrigger;
