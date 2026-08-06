import { notFound } from "next/navigation";

import { familyContacts, getFamilyContactsForPerson } from "@/features/people/family";
import PersonWorkspace from "@/features/people/components/PersonWorkspace";
import { getPersonById } from "@/features/people/repository";

/**
 * BP-031A — Player Workspace route (existing PersonWorkspace).
 * Uses stable Person.id (e.g. `player-nick-meyers`), not a display slug.
 * Directory state (search / filters / sort / view) is restored via session
 * storage when returning to `/team`.
 */
export const dynamic = "force-dynamic";

export default async function PersonWorkspacePage(props: PageProps<"/team/[id]">) {
  const { id } = await props.params;
  const person = await getPersonById(id);

  if (!person) {
    notFound();
  }

  const contacts = getFamilyContactsForPerson(familyContacts, person.id);

  return <PersonWorkspace person={person} familyContacts={contacts} />;
}
