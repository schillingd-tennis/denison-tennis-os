import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Hotel } from "./types";

type HotelRow = {
  id: string; name: string; chain: string | null; city: string; state: string; rating: number | null;
  address: string | null; notes: string | null; team_friendly: boolean | null; price_range: string | null;
  dog_entry_rating: number | null; year_stayed: string | null;
};

function missingTable(message: string) { return /schema cache|does not exist|could not find the table/i.test(message); }

export async function listHotels(): Promise<Hotel[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("knowledge_hotels").select("*").order("name");
  if (error) { if (missingTable(error.message)) return []; throw new Error(`Failed to load hotels: ${error.message}`); }
  return ((data as HotelRow[] | null) ?? []).map((row) => ({
    id: row.id, name: row.name, chain: row.chain ?? "", city: row.city, state: row.state, rating: row.rating,
    address: row.address ?? "", notes: row.notes ?? "", teamFriendly: row.team_friendly, priceRange: row.price_range ?? "",
    dogEntryRating: row.dog_entry_rating, yearStayed: row.year_stayed ?? "",
  }));
}
