"use client";

import { LayoutGrid, List } from "lucide-react";

import { SegmentedControl } from "@/components/toolbar";

export type ViewMode = "cards" | "list";

const options = [
  { value: "cards" as const, label: "Cards", icon: LayoutGrid },
  { value: "list" as const, label: "List", icon: List },
];

/**
 * Cards / List view toggle — standard tertiary toolbar control.
 * Visual language comes from `SegmentedControl`; behavior is unchanged.
 */
export default function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel="Change view"
      equalWidth
    />
  );
}
