import { notFound } from "next/navigation";

import { familyContacts, getFamilyContactsForPerson } from "@/features/people/family";
import { getPersonById } from "@/features/people/repository";
import PlayerWorkspace from "@/features/team/components/PlayerWorkspace";

// The roster now lives in Supabase (BP-015) — always render with the
// current table contents rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function PlayerWorkspacePage(props: PageProps<"/team/[id]">) {
  const { id } = await props.params;
  const person = await getPersonById(id);

  if (!person) {
    notFound();
  }

  const contacts = getFamilyContactsForPerson(familyContacts, person.id);

  return <PlayerWorkspace person={person} familyContacts={contacts} />;
}
