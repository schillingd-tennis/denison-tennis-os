"use client";

import { ListFilter, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { FilterMenuOption } from "@/components/toolbar";

export type MobileFilterOption = {
  value: string;
  label: string;
};

export type MobileFilterFacet = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }> | LucideIcon;
  options: readonly MobileFilterOption[];
};

/**
 * OS-wide mobile filter bottom sheet. Modules pass facets + selection handlers;
 * filter resolution stays in each module.
 */
export default function MobileFilterSheet({
  open,
  onClose,
  facets,
  value,
  onSelect,
  clearId,
  isAllActive,
  title = "Filters",
}: {
  open: boolean;
  onClose: () => void;
  facets: readonly MobileFilterFacet[];
  value: readonly string[];
  onSelect: (id: string) => void;
  clearId: string;
  isAllActive: boolean;
  title?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-mobile-filter-sheet=""
    >
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-card bg-surface shadow-[0_-12px_40px_rgba(17,24,39,0.12)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={isAllActive}
              aria-label={isAllActive ? "All filters" : "Clear all filters"}
              onClick={() => onSelect(clearId)}
              className={[
                "inline-flex h-9 items-center rounded-control px-3 text-[13px] font-medium",
                isAllActive
                  ? "bg-[var(--module-accent)] text-surface"
                  : "bg-app-background text-text-secondary ring-1 ring-black/[0.06]",
              ].join(" ")}
            >
              {isAllActive ? "All" : "Clear"}
            </button>
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-text-primary"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-5">
            {facets.map((facet) => {
              if (facet.options.length === 0) return null;
              const selected = value.filter((id) =>
                facet.options.some((option) => option.value === id),
              );
              const Icon = facet.icon;
              return (
                <section key={facet.id} aria-label={facet.label}>
                  <div className="mb-2 flex items-center gap-2">
                    {Icon ? (
                      <Icon
                        className="h-3.5 w-3.5 text-text-secondary"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    ) : null}
                    <h3 className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">
                      {facet.label}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-card ring-1 ring-black/[0.06]">
                    {facet.options.map((option) => (
                      <FilterMenuOption
                        key={option.value}
                        selected={selected.includes(option.value)}
                        onClick={() => onSelect(option.value)}
                        className="min-h-11 rounded-none px-3.5 first:rounded-t-card last:rounded-b-card"
                      >
                        {option.label}
                      </FilterMenuOption>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 border-t border-black/[0.06] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-control bg-[var(--module-accent)] text-sm font-semibold text-surface"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Single mobile Filters trigger — pairs with `MobileFilterSheet`. */
export function MobileFiltersButton({
  active,
  activeCount,
  expanded,
  onClick,
  children = "Filters",
}: {
  active: boolean;
  activeCount?: number;
  expanded: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className={[
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-control px-3.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-[var(--module-tint)]/40 text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/35"
          : "bg-surface text-text-secondary ring-1 ring-black/[0.06]",
      ].join(" ")}
    >
      <ListFilter className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {children}
      {active && activeCount != null && activeCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--module-accent)] px-1.5 text-[11px] font-semibold text-surface">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}
