import { notFound } from "next/navigation";

import { ROLE_KEYS } from "@/features/lookups/seed";
import PersonWorkspace from "@/features/people/components/PersonWorkspace";
import { listRelationshipsByRelatedPerson } from "@/features/people/personRelationships";
import { getPersonById } from "@/features/people/repository";
import { hasRole, isFamilyPerson } from "@/features/people/utils";

/**
 * BP-031A — Player Workspace route (existing PersonWorkspace).
 * Uses stable Person.id (e.g. `player-nick-meyers`), not a display slug.
 * Directory state (search / filters / sort / view) is restored via session
 * storage when returning to `/team`.
 *
 * Optional `?fromPlayer=` preserves originating Player context when opening a
 * Family Person from a player's Family workspace (Back to Player).
 * Accepted only when the Family Person has a real relationship edge to that Player.
 */
export const dynamic = "force-dynamic";

export default async function PersonWorkspacePage(props: PageProps<"/team/[id]">) {
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
      // Edges are player → parent (person_id → related_person_id).
      const edges = await listRelationshipsByRelatedPerson(person.id);
      const isRelated = edges.some((edge) => edge.personId === origin.id);
      if (isRelated) {
        fromPlayerId = origin.id;
      }
    }
  }

  return <PersonWorkspace person={person} fromPlayerId={fromPlayerId} />;
}
