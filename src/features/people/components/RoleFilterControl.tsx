"use client";

import { FilterChipGroup } from "@/components/toolbar";
import {
  getPeopleFilterVisualSelection,
  getTeamPhase1FilterOptions,
  resolvePeopleFilterSelection,
  type PeopleToolbarFilterId,
} from "@/features/people/filters";

/**
 * Team faceted filter chips (BP-024G / BP-025D).
 * Within a category → OR; across categories → AND.
 * All clears every facet; clearing the last facet returns to All.
 */
export default function RoleFilterControl({
  value,
  onChange,
}: {
  /** Active facet ids; empty means All. */
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
}) {
  const options = getTeamPhase1FilterOptions();
  const visual = getPeopleFilterVisualSelection(value);

  function handleSelect(next: PeopleToolbarFilterId) {
    onChange(resolvePeopleFilterSelection(value, next));
  }

  return (
    <FilterChipGroup
      value={visual}
      onSelect={handleSelect}
      options={options}
      ariaLabel="Filter people"
      equalWidth
    />
  );
}
