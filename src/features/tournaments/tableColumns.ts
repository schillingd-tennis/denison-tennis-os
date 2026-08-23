import type { ColumnDef } from "@/components/data-table/types";

import { parseDistanceMiles, splitCityState } from "./location";
import type { Tournament } from "./types";

export type TournamentTableColumnId =
  | "name"
  | "startDate"
  | "endDate"
  | "city"
  | "state"
  | "level"
  | "lifecycleStatus"
  | "distance"
  | "recruitCount";

export const TOURNAMENT_TABLE_COLUMNS: ColumnDef<Tournament, TournamentTableColumnId>[] = [
  {
    id: "name",
    title: "Tournament",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.name,
  },
  {
    id: "startDate",
    title: "Start",
    sortable: true,
    sortType: "date",
    accessor: (row) => row.startDate,
    defaultSort: "asc",
  },
  {
    id: "endDate",
    title: "End",
    sortable: true,
    sortType: "date",
    accessor: (row) => row.endDate,
  },
  {
    id: "city",
    title: "City",
    sortable: true,
    sortType: "text",
    accessor: (row) => splitCityState(row.location).city,
  },
  {
    id: "state",
    title: "State",
    sortable: true,
    sortType: "text",
    accessor: (row) => splitCityState(row.location).state,
  },
  {
    id: "level",
    title: "Level",
    sortable: true,
    sortType: "text",
    accessor: (row) => row.level,
  },
  {
    id: "lifecycleStatus",
    title: "Status",
    sortable: true,
    sortType: "enum",
    enumOrder: ["upcoming", "past"],
    accessor: (row) => row.lifecycleStatus,
  },
  {
    id: "distance",
    title: "Distance",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => parseDistanceMiles(row.distanceFromColumbus),
  },
  {
    id: "recruitCount",
    title: "Recruits",
    sortable: true,
    sortType: "number",
    align: "right",
    accessor: (row) => row.linkedRecruits.length,
  },
];
