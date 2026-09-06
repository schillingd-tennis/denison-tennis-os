import type { RecruitingAgent } from "./types";

export type AgentFilters = { query?: string; agency?: string; location?: string; status?: string };

export function filterAgents(rows: RecruitingAgent[], filters: AgentFilters) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    const location = [row.city, row.state].filter(Boolean).join(", ");
    const searchable = [row.firstName, row.lastName, row.agencyName, row.title, row.email, row.phone, location, row.status]
      .join(" ").toLowerCase();
    return (!query || searchable.includes(query)) &&
      (!filters.agency || (filters.agency === "__unassigned__" ? !row.agencyId : row.agencyId === filters.agency)) &&
      (!filters.location || location === filters.location) &&
      (!filters.status || row.status === filters.status);
  });
}

export function sortAgents(rows: RecruitingAgent[], key: keyof RecruitingAgent, direction: "asc" | "desc") {
  return [...rows].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true }) * (direction === "asc" ? 1 : -1));
}
