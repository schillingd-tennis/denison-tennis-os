import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RecruitingAgency, RecruitingAgent } from "./types";

function missingTable(message: string) { return /schema cache|does not exist|could not find the table/i.test(message); }

export async function loadAgencies(): Promise<{ agencies: RecruitingAgency[]; agents: RecruitingAgent[] }> {
  const client = await createSupabaseServerClient();
  const [agencyResult, agentResult] = await Promise.all([
    client.from("recruiting_agencies").select("*").order("name"),
    client.from("recruiting_agents").select("*, recruiting_agencies(name)").order("last_name"),
  ]);
  for (const result of [agencyResult, agentResult]) {
    if (result.error && !missingTable(result.error.message)) throw new Error(`Failed to load recruiting agencies: ${result.error.message}`);
  }
  const agencies = (agencyResult.data ?? []).map((r: any) => ({ id: r.id, name: r.name, city: r.city ?? "", state: r.state ?? "", website: r.website ?? "", phone: r.phone ?? "", status: r.status ?? "", notes: r.notes ?? "" }));
  const agents = (agentResult.data ?? []).map((r: any) => ({ id: r.id, agencyId: r.agency_id, agencyName: r.recruiting_agencies?.name ?? "", firstName: r.first_name, lastName: r.last_name, title: r.title ?? "", email: r.email ?? "", phone: r.phone ?? "", city: r.city ?? "", state: r.state ?? "", status: r.status ?? "", notes: r.notes ?? "" }));
  return { agencies, agents };
}
