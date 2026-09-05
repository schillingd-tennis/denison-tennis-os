export type Hotel = {
  id: string;
  name: string;
  chain: string;
  city: string;
  state: string;
  rating: number | null;
  address: string;
  notes: string;
  teamFriendly: boolean | null;
  priceRange: string;
  dogEntryRating: number | null;
  yearStayed: string;
};

export type HotelSortKey = "name" | "chain" | "city" | "state" | "rating" | "dogEntryRating";
export type SortDirection = "asc" | "desc";
