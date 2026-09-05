import type { Hotel, HotelSortKey, SortDirection } from "./types";

export function filterHotels(hotels: Hotel[], filters: { query: string; chain: string; city: string; state: string; rating: string; teamFriendly: string }) {
  const query = filters.query.trim().toLocaleLowerCase();
  return hotels.filter((hotel) => {
    const matchesQuery = !query || [hotel.name, hotel.chain, hotel.city, hotel.state, hotel.address, hotel.notes].join(" ").toLocaleLowerCase().includes(query);
    return matchesQuery
      && (!filters.chain || hotel.chain === filters.chain)
      && (!filters.city || hotel.city === filters.city)
      && (!filters.state || hotel.state === filters.state)
      && (!filters.rating || hotel.rating === Number(filters.rating))
      && (!filters.teamFriendly || String(hotel.teamFriendly) === filters.teamFriendly);
  });
}

export function sortHotels(hotels: Hotel[], key: HotelSortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...hotels].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left == null && right == null) return a.name.localeCompare(b.name);
    if (left == null) return 1;
    if (right == null) return -1;
    const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
    return (compared || a.name.localeCompare(b.name)) * multiplier;
  });
}
