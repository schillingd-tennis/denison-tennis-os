"use client";

import { Search } from "lucide-react";

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
    <div className="relative flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
        strokeWidth={1.75}
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-border bg-surface py-2.5 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-secondary focus:border-denison-red focus:ring-1 focus:ring-denison-red focus:outline-none"
      />
    </div>
  );
}
