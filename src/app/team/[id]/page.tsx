import { notFound } from "next/navigation";

import { familyContacts, getFamilyContactsForPerson } from "@/features/people/family";
import PersonWorkspace from "@/features/people/components/PersonWorkspace";
import { getPersonById } from "@/features/people/repository";

// People live in Supabase (BP-015) — always render with the current table
// contents rather than a build-time snapshot. Route stays /team/[id] (BP-021).
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
