import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { filterHotels, sortHotels } from "./filtering";
import { resolveHotelBrand } from "./brandIdentity";
import type { Hotel } from "./types";

const hotels: Hotel[] = [
  { id: "1", name: "Hotel Beta", chain: "Chain B", city: "Columbus", state: "OH", rating: 3, address: "", notes: "Near campus", teamFriendly: true, priceRange: "", dogEntryRating: 5, yearStayed: "2026" },
  { id: "2", name: "Alpha Inn", chain: "Chain A", city: "Granville", state: "OH", rating: 5, address: "Main St", notes: "", teamFriendly: null, priceRange: "", dogEntryRating: null, yearStayed: "" },
];

test("hotel search includes names, location, address, and notes", () => {
  for (const query of ["alpha", "granville", "main st", "campus"]) {
    assert.equal(filterHotels(hotels, { query, chain: "", city: "", state: "", rating: "", teamFriendly: "" }).length, 1);
  }
});

test("hotel filters combine and clear fields independently", () => {
  assert.deepEqual(filterHotels(hotels, { query: "", chain: "Chain B", city: "Columbus", state: "OH", rating: "3", teamFriendly: "true" }).map((hotel) => hotel.id), ["1"]);
});

test("hotel table sorts text and numeric values with blanks last", () => {
  assert.deepEqual(sortHotels(hotels, "name", "asc").map((hotel) => hotel.id), ["2", "1"]);
  assert.deepEqual(sortHotels(hotels, "rating", "desc").map((hotel) => hotel.id), ["2", "1"]);
  assert.deepEqual(sortHotels(hotels, "dogEntryRating", "asc").map((hotel) => hotel.id), ["1", "2"]);
});

test("Hotels.csv migration seeds all 44 named rows idempotently", () => {
  const migration = readFileSync(fileURLToPath(new URL("../../../supabase/migrations/0051_knowledge_hotels.sql", import.meta.url)), "utf8");
  const records = migration.match(/^\{"state":/gm) ?? [];
  assert.equal(records.length, 44);
  assert.match(migration, /import_key text unique/);
  assert.match(migration, /on conflict \(import_key\) do update/);
});

test("hotel brand logos normalize CSV spelling variants", () => {
  assert.equal(resolveHotelBrand("Candalwood Suites").domain, "candlewoodsuites.com");
  assert.equal(resolveHotelBrand("Holliday Inn Express ( West)").label, "Holiday Inn");
  assert.equal(resolveHotelBrand("Home2 suite").logoSrc, "/hotel-logos/home2-suites.png");
  assert.equal(resolveHotelBrand("Unknown Lodge").initials, "UL");
});
