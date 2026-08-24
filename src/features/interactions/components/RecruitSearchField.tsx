"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  filterRecruits,
  recruitIdAfterQueryChange,
  recruitSecondaryText,
  type InteractionOption,
} from "../recruitSearch";

export default function RecruitSearchField({
  recruits,
  selectedId,
  onSelect,
}: {
  recruits: InteractionOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = recruits.find((recruit) => recruit.id === selectedId) ?? null;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const matches = useMemo(() => filterRecruits(recruits, query).slice(0, 20), [recruits, query]);
  const showList = open && query.trim().length > 0 && !selected;

  useEffect(() => {
    if (selected) setQuery(selected.label);
  }, [selectedId, selected]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function choose(recruit: InteractionOption) {
    onSelect(recruit.id);
    setQuery(recruit.label);
    setOpen(false);
  }

  function clear() {
    onSelect("");
    setQuery("");
    setOpen(false);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    const nextId = recruitIdAfterQueryChange(selected, value);
    if (nextId !== selectedId) onSelect(nextId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setHighlight((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const recruit = matches[highlight];
      if (recruit) choose(recruit);
    }
  }

  return (
    <div ref={rootRef} className="min-w-0">
      <input type="hidden" name="recruitPersonId" value={selectedId} />
      <div className="relative mt-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          strokeWidth={1.75}
        />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-label="Search recruits"
          placeholder="Search recruits…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-control border border-border bg-surface py-0 pr-10 pl-10 text-sm font-normal text-text-primary"
        />
        {selected || query ? (
          <button
            type="button"
            aria-label="Clear recruit"
            onClick={clear}
            className="absolute top-1/2 right-1 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-text-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : null}
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-x-hidden overflow-y-auto rounded-control border border-border bg-surface shadow-sm"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-text-secondary">No matching recruits</li>
            ) : (
              matches.map((recruit, index) => {
                const secondary = recruitSecondaryText(recruit);
                return (
                  <li key={recruit.id} role="option" aria-selected={index === highlight}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        choose(recruit);
                      }}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex min-h-10 w-full min-w-0 flex-col items-start justify-center px-3 py-2 text-left ${
                        index === highlight ? "bg-app-background" : ""
                      }`}
                    >
                      <span className="w-full truncate text-sm font-medium text-text-primary">{recruit.label}</span>
                      {secondary ? (
                        <span className="w-full truncate text-xs text-text-secondary">{secondary}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
