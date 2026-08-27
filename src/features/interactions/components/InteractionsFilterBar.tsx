"use client";

import { Calendar, ChevronDown, MessageSquare } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import SearchInput from "@/components/SearchInput";
import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";

import {
  DEFAULT_INTERACTION_PERIOD,
  interactionsPageHref,
  type InteractionKindFilter,
  type InteractionPeriod,
} from "../centralPeriod";

const PERIODS: { id: InteractionPeriod; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "past_week", label: "Past week" },
  { id: "past_month", label: "Past month" },
];

const KINDS: { id: InteractionKindFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "texts", label: "Texts" },
  { id: "calls", label: "Calls" },
  { id: "emails", label: "Emails" },
  { id: "visits", label: "Visits" },
];

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
      if (target instanceof Element && target.closest("[data-interactions-filter-menu]")) return;
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
            data-interactions-filter-menu=""
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
    <div className="relative" data-interactions-filter={label}>
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

export default function InteractionsFilterBar({
  period,
  kind,
  query,
}: {
  period: InteractionPeriod;
  kind: InteractionKindFilter;
  query: string;
}) {
  const router = useRouter();
  const defaults = period === DEFAULT_INTERACTION_PERIOD && kind === "all" && query.trim().length === 0;
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? "Past month";
  const kindLabel = KINDS.find((item) => item.id === kind)?.label ?? "All types";

  function go(next: { period: InteractionPeriod; kind: InteractionKindFilter; query: string }, replace = false) {
    const href = interactionsPageHref(next);
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2.5" data-interactions-toolbar="">
      <SearchInput
        value={query}
        onChange={(value) => go({ period, kind, query: value }, true)}
        placeholder="Search interactions, recruits, notes, or tournaments"
        aria-label="Search interactions"
      />
      <div className="flex min-w-0 flex-wrap items-center gap-2" data-interactions-filters="">
        <button
          type="button"
          disabled={defaults}
          aria-label="Clear filters"
          onClick={() => go({ period: DEFAULT_INTERACTION_PERIOD, kind: "all", query: "" })}
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
          active={period !== DEFAULT_INTERACTION_PERIOD}
          valueLabel={periodLabel}
          options={PERIODS}
          selectedId={period}
          onSelect={(id) => go({ period: id as InteractionPeriod, kind, query })}
        />
        <FilterMenu
          label="Type"
          icon={MessageSquare}
          active={kind !== "all"}
          valueLabel={kindLabel}
          options={KINDS}
          selectedId={kind}
          onSelect={(id) => go({ period, kind: id as InteractionKindFilter, query })}
        />
      </div>
    </div>
  );
}
