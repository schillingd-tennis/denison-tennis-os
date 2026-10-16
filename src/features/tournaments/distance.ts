import type { TournamentInput } from "./types";

export const TOURNAMENT_DISTANCE_ORIGIN = "4885 Shackelford Ct, Columbus, OH 43220";
type Coordinates = { latitude: number; longitude: number };
type ArcGisResponse = { candidates?: Array<{ location?: { x?: number; y?: number }; score?: number }> };

async function geocode(value: string): Promise<Coordinates | null> {
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  url.searchParams.set("SingleLine", value);
  url.searchParams.set("f", "json");
  url.searchParams.set("maxLocations", "1");
  url.searchParams.set("forStorage", "false");
  const response = await fetch(url, { signal: AbortSignal.timeout(7_000) });
  if (!response.ok) return null;
  const payload = await response.json() as ArcGisResponse;
  const candidate = payload.candidates?.[0];
  const latitude = candidate?.location?.y;
  const longitude = candidate?.location?.x;
  if (typeof latitude !== "number" || typeof longitude !== "number" || (candidate?.score ?? 0) < 70) return null;
  return { latitude, longitude };
}

export function distanceMilesBetween(a: Coordinates, b: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const latDelta = radians(b.latitude - a.latitude);
  const lonDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function calculateTournamentDistance(input: Pick<TournamentInput, "location" | "venue">): Promise<number | null> {
  const destination = [input.venue, input.location].filter(Boolean).join(", ").trim();
  if (!destination) return null;
  try {
    const [originCoordinates, destinationCoordinates] = await Promise.all([geocode(TOURNAMENT_DISTANCE_ORIGIN), geocode(destination)]);
    if (!originCoordinates || !destinationCoordinates) return null;
    return Math.round(distanceMilesBetween(originCoordinates, destinationCoordinates));
  } catch {
    return null;
  }
}
