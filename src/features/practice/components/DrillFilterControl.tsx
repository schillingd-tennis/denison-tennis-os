"use client";

import { ChevronDown, Filter, Layers, Sparkles, Target, Users } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
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
  DRILL_FILTER_CLEAR_ID,
  DRILL_FILTER_GROUPS,
  resolveDrillFilterSelection,
  type DrillLibraryRow,
} from "../drillLibraryModel";

const FILTER_MENU_Z_INDEX = 200;

const facetIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  category: Layers,
  focus: Target,
  players: Users,
  competitive: Sparkles,
  usage: Filter,
};

function optionsForCategory(
  definitions: readonly FilterDefinition<DrillLibraryRow>[],
  category: string,
) {
  return definitions
    .filter((definition) => definition.category === category)
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
  definitions: readonly FilterDefinition<DrillLibraryRow>[];
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
  const options = optionsForCategory(definitions, category);
  const selected = value.filter((id) => options.some((option) => option.value === id));
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
            aria-label={`Filter by ${label}`}
            style={{
              top: coords.top,
              left: coords.left,
              zIndex: FILTER_MENU_Z_INDEX,
              backgroundColor: "var(--color-surface)",
              ["--module-accent" as string]: coords.moduleAccent,
            }}
            className="fixed isolate max-h-80 min-w-[13rem] overflow-y-auto rounded-card p-2 shadow-[0_10px_28px_rgba(17,24,39,0.08)] ring-1 ring-black/[0.06]"
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
        count={selected.length || undefined}
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

export default function DrillFilterControl({
  value,
  onChange,
  definitions,
  renderMobileTrigger,
}: {
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
  definitions: readonly FilterDefinition<DrillLibraryRow>[];
  renderMobileTrigger?: (filtersButton: ReactNode) => ReactNode;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!openCategory) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-drill-filter-root]")) return;
      if (target.closest("[role='listbox']")) return;
      setOpenCategory(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openCategory]);

  function select(id: string) {
    onChange(resolveDrillFilterSelection(value, id));
  }

  const allActive = value.length === 0;
  const mobileFacets: MobileFilterFacet[] = DRILL_FILTER_GROUPS.map((group) => ({
    id: group.category,
    label: group.label,
    icon: facetIcons[group.category],
    options: optionsForCategory(definitions, group.category),
  })).filter((facet) => facet.options.length > 0);

  const filtersButton = (
    <MobileFiltersButton
      active={!allActive}
      activeCount={value.length || undefined}
      expanded={mobileOpen}
      onClick={() => setMobileOpen(true)}
    />
  );

  return (
    <div data-drill-filter-root="">
      <DesktopDirectoryControls>
        <button
          type="button"
          aria-pressed={allActive}
          aria-label={allActive ? "All filters" : "Clear all filters"}
          onClick={() => onChange([])}
          className={[
            "inline-flex h-10 items-center rounded-control px-3.5 text-[13px] font-medium",
            allActive
              ? "bg-[var(--module-accent)] text-surface"
              : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary",
          ].join(" ")}
        >
          {allActive ? "All" : "Clear"}
        </button>
        {DRILL_FILTER_GROUPS.map((group) => (
          <FacetMenu
            key={group.category}
            label={group.label}
            category={group.category}
            value={value}
            onSelect={select}
            definitions={definitions}
            open={openCategory === group.category}
            onToggle={() =>
              setOpenCategory((current) =>
                current === group.category ? null : group.category,
              )
            }
          />
        ))}
      </DesktopDirectoryControls>

      {renderMobileTrigger ? renderMobileTrigger(filtersButton) : filtersButton}

      <MobileFilterSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        facets={mobileFacets}
        value={value}
        onSelect={select}
        clearId={DRILL_FILTER_CLEAR_ID}
        isAllActive={allActive}
        title="Filter drills"
      />
    </div>
  );
}
