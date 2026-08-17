"use client";

import { Search } from "lucide-react";

/**
 * Primary toolbar search field — 44px height, soft border, quiet placeholder.
 * Behavior (controlled value / onChange) is intentionally unchanged.
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
  return (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
        strokeWidth={1.75}
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-control border border-border/70 bg-surface pr-4 pl-10 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 placeholder:text-text-secondary/45 focus:border-[var(--module-accent)]/45 focus:ring-1 focus:ring-[var(--module-accent)]/25 focus:outline-none"
      />
    </div>
  );
}
