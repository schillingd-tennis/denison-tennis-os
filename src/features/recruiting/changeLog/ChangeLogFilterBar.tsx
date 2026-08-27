"use client";

import { Calendar, ChevronDown, Flag, Layers } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import SearchInput from "@/components/SearchInput";
import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";

import { CHANGE_LOG_CATEGORY_FILTER_LABELS, CHANGE_LOG_SOURCE_LABELS } from "./display";
import { changeLogFiltersAreDefault, changeLogPageHref, type ChangeLogFilterState } from "./filters";
import { DEFAULT_CHANGE_LOG_PERIOD, type ChangeLogPeriod } from "./period";
import { CHANGE_LOG_CATEGORY_FILTERS, CHANGE_LOG_SOURCE_FILTERS } from "./types";

const PERIODS: { id: ChangeLogPeriodLabel; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "past_week", label: "Past week" },
  { id: "past_month", label: "Past month" },
];

type ChangeLogPeriodLabel = ChangeLogFilterState["period"];

function FilterMenu({
  label,
  icon: Icon,
  active,
  valueLabel,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  icon: typeof Calendar;
  active: boolean;
  valueLabel: string;
  options: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-change-log-filter-menu]")) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && coords
      ? createPortal(
          <div
            id={panelId}
            role="listbox"
            aria-label={label}
            data-change-log-filter-menu=""
            style={{ top: coords.top, left: coords.left, zIndex: 200 }}
            className="fixed isolate min-w-[13rem] rounded-card bg-surface p-2 shadow-[0_10px_28px_rgba(17,24,39,0.08)] ring-1 ring-black/[0.06]"
          >
            {options.map((option) => (
              <FilterMenuOption
                key={option.id}
                selected={option.id === selectedId}
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
              >
                {option.label}
              </FilterMenuOption>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" data-change-log-filter={label}>
      <FilterTrigger
        ref={buttonRef}
        active={active}
        icon={Icon}
        label={valueLabel}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={panelId}
        trailing={<ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary opacity-50" strokeWidth={1.75} />}
        onClick={() => setOpen((current) => !current)}
      />
      {menu}
    </div>
  );
}

export default function ChangeLogFilterBar({ filters }: { filters: ChangeLogFilterState }) {
  const router = useRouter();
  const defaults = changeLogFiltersAreDefault(filters);
  const periodLabel = PERIODS.find((item) => item.id === filters.period)?.label ?? "Past month";

  function go(next: ChangeLogFilterState, replace = false) {
    const href = changeLogPageHref({ ...next, offset: 0 });
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2.5" data-change-log-toolbar="">
      <SearchInput
        value={filters.query}
        onChange={(value) => go({ ...filters, query: value }, true)}
        placeholder="Search recruits, event titles, or summaries"
        aria-label="Search recruiting log"
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={defaults}
          aria-label="Clear filters"
          onClick={() =>
            go({
              period: DEFAULT_CHANGE_LOG_PERIOD,
              category: "all",
              query: "",
              recruitPersonId: "",
              source: "all",
              offset: 0,
            })
          }
          className={`inline-flex h-10 items-center rounded-control px-3.5 text-[13px] font-medium ${
            defaults
              ? "cursor-not-allowed bg-surface text-text-secondary/50 ring-1 ring-black/[0.06]"
              : "bg-surface text-text-secondary ring-1 ring-black/[0.06] hover:text-text-primary"
          }`}
        >
          Clear
        </button>
        <FilterMenu
          label="Date"
          icon={Calendar}
          active={filters.period !== DEFAULT_CHANGE_LOG_PERIOD}
          valueLabel={periodLabel}
          options={PERIODS}
          selectedId={filters.period}
          onSelect={(id) => go({ ...filters, period: id as ChangeLogPeriodLabel })}
        />
        <FilterMenu
          label="Category"
          icon={Layers}
          active={filters.category !== "all"}
          valueLabel={CHANGE_LOG_CATEGORY_FILTER_LABELS[filters.category]}
          options={CHANGE_LOG_CATEGORY_FILTERS.map((id) => ({
            id,
            label: CHANGE_LOG_CATEGORY_FILTER_LABELS[id],
          }))}
          selectedId={filters.category}
          onSelect={(id) => go({ ...filters, category: id as ChangeLogFilterState["category"] })}
        />
        <FilterMenu
          label="Source"
          icon={Flag}
          active={filters.source !== "all"}
          valueLabel={filters.source === "all" ? "All sources" : CHANGE_LOG_SOURCE_LABELS[filters.source]}
          options={CHANGE_LOG_SOURCE_FILTERS.map((id) => ({
            id,
            label: id === "all" ? "All sources" : CHANGE_LOG_SOURCE_LABELS[id],
          }))}
          selectedId={filters.source}
          onSelect={(id) => go({ ...filters, source: id as ChangeLogFilterState["source"] })}
        />
      </div>
    </div>
  );
}
