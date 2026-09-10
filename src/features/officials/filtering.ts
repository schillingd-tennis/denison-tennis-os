import type { Official, OfficialFilters, OfficialSortKey, SortDirection } from "./types";
import { officialLocationLabel } from "./seedData";

export function filterOfficials(officials: Official[], filters: OfficialFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return officials.filter((official) => {
    const location = officialLocationLabel(official.city, official.state);
    const searchable = [
      official.name,
      official.email,
      official.phone,
      official.city,
      official.state,
      official.assignorArea,
      official.rate,
      official.notes,
      location,
    ]
      .join(" ")
      .toLocaleLowerCase();

    const matchesQuery = !query || searchable.includes(query);
    const matchesRanking =
      !filters.ranking
      || (filters.ranking === "none" ? official.ranking == null : official.ranking === Number(filters.ranking));
    const matchesLocation = !filters.location || location === filters.location;
    const matchesAreaAssignor =
      !filters.areaAssignor
      || (filters.areaAssignor === "yes" ? official.isAreaAssignor : !official.isAreaAssignor);
    const matchesView =
      filters.view === "all"
      || (filters.view === "topRated" && official.ranking != null && official.ranking >= 4)
      || (filters.view === "areaAssignors" && official.isAreaAssignor);

    return matchesQuery && matchesRanking && matchesLocation && matchesAreaAssignor && matchesView;
  });
}

export function sortOfficials(officials: Official[], key: OfficialSortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...officials].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left == null && right == null) return a.name.localeCompare(b.name) * multiplier;
    if (left == null || left === "") return 1;
    if (right == null || right === "") return -1;
    if (typeof left === "boolean" && typeof right === "boolean") {
      return ((Number(left) - Number(right)) || a.name.localeCompare(b.name)) * multiplier;
    }
    if (typeof left === "number" && typeof right === "number") {
      return ((left - right) || a.name.localeCompare(b.name)) * multiplier;
    }
    const compared = String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
    return (compared || a.name.localeCompare(b.name)) * multiplier;
  });
}

export function locationOptions(officials: Official[]): string[] {
  return [...new Set(officials.map((official) => officialLocationLabel(official.city, official.state)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}
