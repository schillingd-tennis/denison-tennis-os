export type PreferredContact = "Email" | "Phone" | "Text" | "No preference";

export type Official = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredContact: PreferredContact | "";
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  rate: string;
  ranking: number | null;
  isAreaAssignor: boolean;
  assignorArea: string;
  notes: string;
};

export type OfficialSortKey =
  | "name"
  | "email"
  | "phone"
  | "city"
  | "rate"
  | "ranking"
  | "isAreaAssignor"
  | "notes";

export type SortDirection = "asc" | "desc";

export type OfficialQuickView = "all" | "topRated" | "areaAssignors";

export type OfficialFilters = {
  query: string;
  ranking: string;
  location: string;
  areaAssignor: string;
  view: OfficialQuickView;
};
