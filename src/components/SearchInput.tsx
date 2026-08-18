"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

/**
 * Primary toolbar search field — 44px height, soft border, quiet placeholder.
 * Behavior (controlled value / onChange) is intentionally unchanged.
 * Clear (X) is shown only when the field has text; clearing keeps focus.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasQuery = value.length > 0;

  function clearSearch() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
        strokeWidth={1.75}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-control border border-border/70 bg-surface pr-10 pl-10 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-secondary/45 focus:border-[var(--module-accent)]/45 focus:ring-1 focus:ring-[var(--module-accent)]/25 focus:outline-none"
      />
      {hasQuery ? (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-end pr-3.5 text-text-secondary/55 transition-colors hover:text-[var(--module-accent)]"
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
