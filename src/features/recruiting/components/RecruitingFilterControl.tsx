"use client";

import { FilterChipGroup } from "@/components/toolbar";
import { typeRole } from "@/components/typography";
import type { FilterDefinition } from "@/lib/filtering";

import type { RecruitDirectoryRow } from "../directory";
import {
  RECRUITING_FILTER_CLEAR_ID,
  RECRUITING_FILTER_GROUPS,
  recruitingFilterIdsForCategory,
  recruitingFiltersAreAll,
  resolveRecruitingFilterSelection,
} from "../filters";

export default function RecruitingFilterControl({
  value,
  onChange,
  definitions,
}: {
  value: readonly string[];
  onChange: (activeIds: string[]) => void;
  definitions: readonly FilterDefinition<RecruitDirectoryRow>[];
}) {
  const allActive = recruitingFiltersAreAll(value);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={typeRole.sectionLabel}>Filters</span>
        <FilterChipGroup
          value={allActive ? [RECRUITING_FILTER_CLEAR_ID] : []}
          onSelect={(next) => onChange(resolveRecruitingFilterSelection(value, next))}
          options={[{ value: RECRUITING_FILTER_CLEAR_ID, label: "All" }]}
          ariaLabel="Clear recruiting filters"
          equalWidth={false}
        />
      </div>
      {RECRUITING_FILTER_GROUPS.map((group) => {
        const ids = recruitingFilterIdsForCategory(definitions, group.category);
        const options = ids
          .map((id) => definitions.find((definition) => definition.id === id))
          .filter((definition): definition is FilterDefinition<RecruitDirectoryRow> => Boolean(definition))
          .map((definition) => ({ value: definition.id, label: definition.label }));
        if (options.length === 0) return null;
        const visual = value.filter((id) => ids.includes(id));
        return (
          <div key={group.category} className="flex flex-wrap items-center gap-2">
            <span className={`w-36 shrink-0 ${typeRole.sectionLabel}`}>{group.label}</span>
            <FilterChipGroup
              value={visual}
              onSelect={(next) => onChange(resolveRecruitingFilterSelection(value, next))}
              options={options}
              ariaLabel={`Filter by ${group.label}`}
              equalWidth={false}
            />
          </div>
        );
      })}
    </div>
  );
}
