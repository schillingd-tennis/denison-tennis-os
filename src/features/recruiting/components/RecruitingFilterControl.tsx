"use client";

import {
  Calendar,
  ChevronDown,
  Flag,
  GitBranch,
  Heart,
  Star,
  Target,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

import type { FilterDefinition } from "@/lib/filtering";

import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_FILTER_CLEAR_ID,
  recruitingFilterIdsForCategory,
  recruitingFiltersAreAll,
  resolveRecruitingFilterSelection,
} from "../filters";

/**
 * Shared overlay layer for every Recruiting filter popover (Cards / List / Rank).
 * Portaled to `document.body` so view content stacking contexts cannot trap it.
 * Must stay above sticky table chrome (≤30) and card `z-10` identity links.
 */
export const RECRUITING_FILTER_MENU_Z_INDEX = 200;

/**
 * Visible toolbar order for /recruiting. This is the render contract.
 * Filter-engine definition order (including Type) is independent and unused here.
 */
const RECRUITING_VISIBLE_FILTER_FACETS: readonly { category: string; label: string }[] = [
  { category: "recruitClassYear", label: "Class Year" },
  { category: "pipelineStage", label: "Pipeline" },
  { category: "priority", label: "Priority" },
  { category: "interest", label: "Interest" },
  { category: "outcome", label: "Outcome" },
  { category: "getability", label: "Getability" },
];

const facetIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  pipelineStage: GitBranch,
  interest: Heart,
  outcome: Flag,
  priority: Star,
  getability: Target,
  recruitClassYear: Calendar,
};

function optionsForCategory(
  definitions: readonly FilterDefinition<RecruitDirectoryRow>[],
  category: string,
) {
  return recruitingFilterIdsForCategory(definitions, category)
    .map((id) => definitions.find((definition) => definition.id === id))
    .filter((definition): definition is FilterDefinition<RecruitDirectoryRow> => Boolean(definition))
    .map((definition) => ({ value: definition.id, label: definition.label }));
}

function FacetMenu({
  label,
  category,
  value,
  onSelect,
  definitions,
  open,
  onToggle,
}: {
  label: string;
  category: string;
  value: readonly string[];
  onSelect: (id: string) => void;
  definitions: readonly FilterDefinition<RecruitDirectoryRow>[];
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const ids = recruitingFilterIdsForCategory(definitions, category);
  const options = optionsForCategory(definitions, category);
  const selected = value.filter((id) => ids.includes(id));
  const active = selected.length > 0;
  const Icon = facetIcons[category];

  useLayoutEffect(() => {
    if (!open || options.length === 0) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 6, left: rect.left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  if (options.length === 0) return null;

  const menu =
    open && coords
      ? createPortal(
          <div
            id={panelId}
            role="listbox"
            data-recruiting-filter-menu="true"
            aria-label={`Filter by ${label}`}
            style={{
              top: coords.top,
              left: coords.left,
              zIndex: RECRUITING_FILTER_MENU_Z_INDEX,
              // Explicit opaque fill — prevents content bleed-through under the popover.
              backgroundColor: "var(--color-surface)",
            }}
            className="fixed isolate min-w-[13rem] rounded-card p-2 shadow-[0_10px_28px_rgba(17,24,39,0.08)] ring-1 ring-black/[0.06]"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => {
                const pressed = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={pressed}
                    onClick={() => onSelect(option.value)}
                    className={[
                      "flex w-full items-center rounded-[8px] px-2.5 py-2 text-left text-[13px] font-medium",
                      pressed
                        ? "bg-[var(--module-tint)] text-[var(--module-accent)]"
                        : "text-text-secondary hover:bg-app-background hover:text-text-primary",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        onClick={onToggle}
        className={[
          "inline-flex h-10 items-center gap-2 rounded-control px-3.5 text-[13px] font-medium transition-colors duration-150",
          active
            ? "bg-[var(--module-tint)]/80 text-[var(--module-accent)] ring-1 ring-[var(--module-accent)]/20"
            : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary",
        ].join(" ")}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} /> : null}
        {label}
        {active ? (
          <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--module-accent)] px-1 text-[10px] font-semibold text-surface">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} aria-hidden />
      </button>
      {menu}
    </div>
  );
}

export default function RecruitingFilterControl({
  value,
  onChange,
  definitions,
}: {
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
  definitions: readonly FilterDefinition<RecruitDirectoryRow>[];
}) {
  const allActive = recruitingFiltersAreAll(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  function handleSelect(id: string) {
    onChange(resolveRecruitingFilterSelection(value, id));
  }

  useEffect(() => {
    if (!openCategory) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-recruiting-filter-menu]")) return;
      setOpenCategory(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenCategory(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCategory]);

  return (
    <div
      ref={rootRef}
      data-recruiting-filter-toolbar="true"
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      <button
        type="button"
        aria-pressed={allActive}
        aria-label={allActive ? "All filters" : "Clear all filters"}
        onClick={() => handleSelect(RECRUITING_FILTER_CLEAR_ID)}
        className={[
          "inline-flex h-10 items-center rounded-control px-3.5 text-[13px] font-medium",
          allActive
            ? "bg-[var(--module-accent)] text-surface"
            : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary",
        ].join(" ")}
      >
        {allActive ? "All" : "Clear"}
      </button>
      {RECRUITING_VISIBLE_FILTER_FACETS.map((group) => (
        <FacetMenu
          key={group.category}
          label={group.label}
          category={group.category}
          value={value}
          onSelect={handleSelect}
          definitions={definitions}
          open={openCategory === group.category}
          onToggle={() =>
            setOpenCategory((current) => (current === group.category ? null : group.category))
          }
        />
      ))}
    </div>
  );
}
