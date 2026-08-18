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

import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";
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
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    moduleAccent: string;
  } | null>(null);
  const ids = recruitingFilterIdsForCategory(definitions, category);
  const options = optionsForCategory(definitions, category);
  const selected = value.filter((id) => ids.includes(id));
  const active = selected.length > 0;
  const Icon = facetIcons[category];

  useLayoutEffect(() => {
    if (!open || options.length === 0) return;

    function place() {
      const button = buttonRef.current;
      const rect = button?.getBoundingClientRect();
      if (!rect) return;
      const moduleAccent =
        (button && getComputedStyle(button).getPropertyValue("--module-accent").trim()) ||
        "var(--color-denison-red)";
      setCoords({ top: rect.bottom + 6, left: rect.left, moduleAccent });
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
              // Portaled to body — copy accent so selected options resolve.
              ["--module-accent" as string]: coords.moduleAccent,
            }}
            className="fixed isolate min-w-[13rem] rounded-card p-2 shadow-[0_10px_28px_rgba(17,24,39,0.08)] ring-1 ring-black/[0.06]"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => {
                const selectedOption = selected.includes(option.value);
                return (
                  <FilterMenuOption
                    key={option.value}
                    selected={selectedOption}
                    onClick={() => onSelect(option.value)}
                  >
                    {option.label}
                  </FilterMenuOption>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <FilterTrigger
        ref={buttonRef}
        active={active}
        icon={Icon}
        label={label}
        count={selected.length}
        trailing={
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-text-secondary opacity-50"
            strokeWidth={1.75}
            aria-hidden
          />
        }
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        onClick={onToggle}
      />
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
