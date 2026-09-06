import AgenciesWorkspace from "@/features/recruiting/agencies/AgenciesWorkspace";
import { loadAgencies } from "@/features/recruiting/agencies/repository";
export const dynamic = "force-dynamic";
export default async function AgenciesPage() { return <AgenciesWorkspace {...await loadAgencies()} />; }
