import type { ColumnDef } from "@/components/data-table/types";

import { displayOpponentOrEvent, type TeamScheduleEvent } from "./types";

export type ScheduleTableColumnId =
  | "startDate"
  | "opponent"
  | "itaRank"
  | "site"
  | "status"
  | "ncac";

export const SCHEDULE_TABLE_COLUMNS: ColumnDef<TeamScheduleEvent, ScheduleTableColumnId>[] = [
  {
    id: "startDate",
    title: "Date",
    sortType: "date",
    accessor: (event) => event.startDate,
  },
  {
    id: "opponent",
    title: "Opponent / Event",
    sortType: "text",
    accessor: (event) => displayOpponentOrEvent(event),
  },
  {
    id: "itaRank",
    title: "ITA Rank",
    sortType: "number",
    defaultSort: "asc",
    accessor: (event) => event.itaRank,
  },
  {
    id: "site",
    title: "Site",
    sortType: "text",
    accessor: (event) => event.siteDesignation,
  },
  {
    id: "status",
    title: "Status",
    sortType: "enum",
    enumOrder: ["confirmed", "tentative", "tbd", "cancelled"],
    accessor: (event) => event.status,
  },
  {
    id: "ncac",
    title: "NCAC",
    sortType: "custom",
    comparator: (a, b) => Number(b.ncac) - Number(a.ncac),
  },
];
