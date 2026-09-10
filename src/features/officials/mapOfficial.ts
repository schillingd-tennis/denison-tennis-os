import type { Official, PreferredContact } from "./types";

export type OfficialRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_contact: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  rate: string | null;
  ranking: number | null;
  is_area_assignor: boolean;
  assignor_area: string | null;
  notes: string | null;
};

function mapPreferred(value: string | null): PreferredContact | "" {
  if (value === "Email" || value === "Phone" || value === "Text" || value === "No preference") return value;
  return "";
}

export function mapOfficialRow(row: OfficialRow): Official {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    preferredContact: mapPreferred(row.preferred_contact),
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postal_code ?? "",
    rate: row.rate ?? "",
    ranking: row.ranking,
    isAreaAssignor: row.is_area_assignor,
    assignorArea: row.assignor_area ?? "",
    notes: row.notes ?? "",
  };
}
