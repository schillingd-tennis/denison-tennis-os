import OfficialsWorkspace from "@/features/officials/components/OfficialsWorkspace";
import { listOfficials } from "@/features/officials/repository";

export const dynamic = "force-dynamic";

export default async function OfficialsPage() {
  let officials: Awaited<ReturnType<typeof listOfficials>> = [];
  let loadError: string | null = null;
  try {
    officials = await listOfficials();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load officials.";
  }
  return <OfficialsWorkspace officials={officials} loadError={loadError} />;
}
