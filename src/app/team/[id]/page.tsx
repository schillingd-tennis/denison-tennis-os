import { notFound } from "next/navigation";

import { people } from "@/features/people/data";
import { familyContacts, getFamilyContactsForPerson } from "@/features/people/family";
import { getPersonById } from "@/features/people/utils";
import PlayerWorkspace from "@/features/team/components/PlayerWorkspace";

export function generateStaticParams() {
  return people.map((person) => ({ id: person.id }));
}

export default async function PlayerWorkspacePage(props: PageProps<"/team/[id]">) {
  const { id } = await props.params;
  const person = getPersonById(people, id);

  if (!person) {
    notFound();
  }

  const contacts = getFamilyContactsForPerson(familyContacts, person.id);

  return <PlayerWorkspace person={person} familyContacts={contacts} />;
}
