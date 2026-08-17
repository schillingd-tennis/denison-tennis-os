import { notFound } from "next/navigation";

import { ROLE_KEYS } from "@/features/lookups/seed";
import PersonWorkspace from "@/features/people/components/PersonWorkspace";
import { listRelationshipsByRelatedPerson } from "@/features/people/personRelationships";
import { getPersonById } from "@/features/people/repository";
import { hasRole, isFamilyPerson } from "@/features/people/utils";

/**
 * Player/coach workspace route. Directory state (search / filters / sort / view)
 * is restored via session storage when returning to `/players-coaches`.
 */
export const dynamic = "force-dynamic";

export default async function PlayersCoachesWorkspacePage(
  props: PageProps<"/players-coaches/[id]">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const person = await getPersonById(id);

  if (!person) {
    notFound();
  }

  const rawFromPlayer =
    typeof searchParams.fromPlayer === "string" ? searchParams.fromPlayer.trim() : "";
  let fromPlayerId: string | undefined;

  if (isFamilyPerson(person) && rawFromPlayer && rawFromPlayer !== person.id) {
    const origin = await getPersonById(rawFromPlayer);
    if (origin && hasRole(origin, ROLE_KEYS.player)) {
      const edges = await listRelationshipsByRelatedPerson(person.id);
      const isRelated = edges.some((edge) => edge.personId === origin.id);
      if (isRelated) {
        fromPlayerId = origin.id;
      }
    }
  }

  return <PersonWorkspace person={person} fromPlayerId={fromPlayerId} />;
}
