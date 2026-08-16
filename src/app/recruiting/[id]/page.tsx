import { notFound } from "next/navigation";

import RecruitingPersonWorkspace from "@/features/recruiting/components/RecruitingPersonWorkspace";
import { getRecruitWorkspaceRecord } from "@/features/recruiting/directory";

export const dynamic = "force-dynamic";

export default async function RecruitingPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getRecruitWorkspaceRecord(id);

  if (!record) {
    notFound();
  }

  return (
    <RecruitingPersonWorkspace
      person={record.person}
      profile={record.profile}
      analytics={record.analytics}
      inCurrentCohort={record.inCurrentCohort}
    />
  );
}
