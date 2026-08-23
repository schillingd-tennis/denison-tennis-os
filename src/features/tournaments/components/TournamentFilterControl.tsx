"use client";

import { Calendar, ChevronDown, Flag, Tag } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  DesktopDirectoryControls,
  MobileFilterSheet,
  MobileFiltersButton,
  type MobileFilterFacet,
} from "@/components/mobile-dashboard";
import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";
import { isAllActive, type FilterDefinition } from "@/lib/filtering";

import {
  TOURNAMENT_FILTER_CLEAR_ID,
  TOURNAMENT_FILTER_GROUPS,
  resolveFilterSelection,
  tournamentFilterIdsForCategory,
} from "../filters";
import type { Tournament } from "../types";

const MENU_Z = 200;

const facetIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  status: Flag,
  date: Calendar,
  level: Tag,
};

function optionsForCategory(
  definitions: readonly FilterDefinition<Tournament>[],
  category: string,
) {
  return tournamentFilterIdsForCategory(definitions, category)
    .map((id) => definitions.find((definition) => definition.id === id))
    .filter((definition): definition is FilterDefinition<Tournament> => Boolean(definition))
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
  definitions: readonly FilterDefinition<Tournament>[];
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; moduleAccent: string } | null>(null);
  const ids = tournamentFilterIdsForCategory(definitions, category);
  const options = optionsForCategory(definitions, category);
  const selected = value.filter((id) => ids.includes(id));
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
            aria-label={`Filter by ${label}`}
            style={{
              top: coords.top,
              left: coords.left,
              zIndex: MENU_Z,
              backgroundColor: "var(--color-surface)",
              ["--module-accent" as string]: coords.moduleAccent,
            }}
            className="fixed isolate min-w-[13rem] rounded-card p-2 shadow-[0_10px_28px_rgba(17,24,39,0.08)] ring-1 ring-black/[0.06]"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => (
                <FilterMenuOption
                  key={option.value}
                  selected={selected.includes(option.value)}
                  onClick={() => onSelect(option.value)}
                >
                  {option.label}
                </FilterMenuOption>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <FilterTrigger
        ref={buttonRef}
        active={selected.length > 0}
        icon={Icon}
        label={label}
        count={selected.length}
        trailing={
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary opacity-50" strokeWidth={1.75} aria-hidden />
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

export default function TournamentFilterControl({
  value,
  onChange,
  definitions,
  renderMobileTrigger,
}: {
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
  definitions: readonly FilterDefinition<Tournament>[];
  renderMobileTrigger?: (button: ReactNode) => ReactNode;
}) {
  const allActive = isAllActive(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileFacets = useMemo((): MobileFilterFacet[] => {
    return TOURNAMENT_FILTER_GROUPS.map((group) => ({
      id: group.category,
      label: group.label,
      icon: facetIcons[group.category],
      options: optionsForCategory(definitions, group.category),
    })).filter((facet) => facet.options.length > 0);
  }, [definitions]);

  function handleSelect(id: string) {
    onChange(resolveFilterSelection(value, id, TOURNAMENT_FILTER_CLEAR_ID));
  }

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (rootRef.current?.contains(target)) return;
      if (target?.closest("[role='listbox']")) return;
      setOpenCategory(null);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  const filtersButton = (
    <MobileFiltersButton
      active={!allActive}
      activeCount={value.length}
      expanded={mobileOpen}
      onClick={() => setMobileOpen(true)}
    />
  );

  return (
    <>
      {renderMobileTrigger ? (
        renderMobileTrigger(filtersButton)
      ) : (
        <div className="md:hidden">{filtersButton}</div>
      )}
      <MobileFilterSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        facets={mobileFacets}
        value={value}
        onSelect={handleSelect}
        clearId={TOURNAMENT_FILTER_CLEAR_ID}
        isAllActive={allActive}
      />
      <DesktopDirectoryControls ref={rootRef}>
        <button
          type="button"
          aria-pressed={allActive}
          aria-label={allActive ? "All filters" : "Clear all filters"}
          onClick={() => handleSelect(TOURNAMENT_FILTER_CLEAR_ID)}
          className={[
            "inline-flex h-10 items-center rounded-control px-3.5 text-[13px] font-medium",
            allActive
              ? "bg-[var(--module-accent)] text-surface"
              : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary",
          ].join(" ")}
        >
          {allActive ? "All" : "Clear"}
        </button>
        {TOURNAMENT_FILTER_GROUPS.map((group) => (
          <FacetMenu
            key={group.category}
            label={group.label}
            category={group.category}
            value={value}
            definitions={definitions}
            open={openCategory === group.category}
            onToggle={() => setOpenCategory((current) => (current === group.category ? null : group.category))}
            onSelect={handleSelect}
          />
        ))}
      </DesktopDirectoryControls>
    </>
  );
}
