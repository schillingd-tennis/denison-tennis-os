"use client";

import {
  Calendar,
  Car,
  ChevronDown,
  Flag,
  Home,
  MapPin,
  Shield,
  Trophy,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  DesktopDirectoryControls,
  MobileFilterSheet,
  MobileFiltersButton,
  type MobileFilterFacet,
} from "@/components/mobile-dashboard";
import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";
import type { FilterDefinition } from "@/lib/filtering";

import {
  SCHEDULE_FILTER_CLEAR_ID,
  SCHEDULE_TOOLBAR_FILTER_GROUPS,
  resolveScheduleFilterSelection,
  scheduleFilterIdsForCategory,
  scheduleFiltersAreAll,
} from "../filters";
import type { TeamScheduleEvent } from "../types";

export const SCHEDULE_FILTER_MENU_Z_INDEX = 200;

const facetIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  seasonSegment: Calendar,
  eventType: Trophy,
  conference: Flag,
  site: MapPin,
  status: Shield,
  doubleheader: Car,
  countable: Calendar,
  officials: Home,
};

function optionsForCategory(
  definitions: readonly FilterDefinition<TeamScheduleEvent>[],
  category: string,
) {
  return scheduleFilterIdsForCategory(definitions, category)
    .map((id) => definitions.find((definition) => definition.id === id))
    .filter((definition): definition is FilterDefinition<TeamScheduleEvent> => Boolean(definition))
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
  definitions: readonly FilterDefinition<TeamScheduleEvent>[];
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; moduleAccent: string } | null>(null);
  const ids = scheduleFilterIdsForCategory(definitions, category);
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
            data-schedule-filter-menu="true"
            aria-label={`Filter by ${label}`}
            style={{
              top: coords.top,
              left: coords.left,
              zIndex: SCHEDULE_FILTER_MENU_Z_INDEX,
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
        active={active}
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

export default function ScheduleFilterControl({
  value,
  onChange,
  definitions,
  renderMobileTrigger,
}: {
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
  definitions: readonly FilterDefinition<TeamScheduleEvent>[];
  renderMobileTrigger?: (button: ReactNode) => ReactNode;
}) {
  const allActive = scheduleFiltersAreAll(value);
  const activeCount = value.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileFacets = useMemo((): MobileFilterFacet[] => {
    return SCHEDULE_TOOLBAR_FILTER_GROUPS.map((group) => ({
      id: group.category,
      label: group.label,
      icon: facetIcons[group.category],
      options: optionsForCategory(definitions, group.category),
    })).filter((facet) => facet.options.length > 0);
  }, [definitions]);

  function handleSelect(id: string) {
    onChange(resolveScheduleFilterSelection(value, id));
  }

  useEffect(() => {
    if (!openCategory) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-schedule-filter-menu]")) return;
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

  const filtersButton = (
    <MobileFiltersButton
      active={!allActive}
      activeCount={activeCount}
      expanded={mobileOpen}
      onClick={() => setMobileOpen(true)}
    />
  );

  return (
    <>
      {renderMobileTrigger ? renderMobileTrigger(filtersButton) : <div className="md:hidden">{filtersButton}</div>}
      <MobileFilterSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        facets={mobileFacets}
        value={value}
        onSelect={handleSelect}
        clearId={SCHEDULE_FILTER_CLEAR_ID}
        isAllActive={allActive}
      />
      <DesktopDirectoryControls ref={rootRef} data-schedule-filter-toolbar="true">
        <button
          type="button"
          aria-pressed={allActive}
          aria-label={allActive ? "All filters" : "Clear all filters"}
          onClick={() => handleSelect(SCHEDULE_FILTER_CLEAR_ID)}
          className={[
            "inline-flex h-10 items-center rounded-control px-3.5 text-[13px] font-medium",
            allActive
              ? "bg-[var(--module-accent)] text-surface"
              : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary",
          ].join(" ")}
        >
          {allActive ? "All" : "Clear"}
        </button>
        {SCHEDULE_TOOLBAR_FILTER_GROUPS.map((group) => (
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
      </DesktopDirectoryControls>
    </>
  );
}
