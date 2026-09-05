import HotelsWorkspace from "@/features/hotels/components/HotelsWorkspace";
import { listHotels } from "@/features/hotels/repository";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  let hotels: Awaited<ReturnType<typeof listHotels>> = [];
  let loadError: string | null = null;
  try { hotels = await listHotels(); } catch (error) { loadError = error instanceof Error ? error.message : "Could not load hotels."; }
  return <HotelsWorkspace hotels={hotels} loadError={loadError}/>;
}
