import { Suspense } from "react";

import RecruitingChangeLogPage from "@/features/recruiting/changeLog/RecruitingChangeLogPage";
import {
  listCentralRecruitChangeLog,
  listChangeLogForSummaries,
  parseChangeLogSearchParams,
} from "@/features/recruiting/changeLog/repository";

export const dynamic = "force-dynamic";

export default async function RecruitingLogRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseChangeLogSearchParams(params);
  const [{ events, hasMore }, summaryEvents] = await Promise.all([
    listCentralRecruitChangeLog(filters),
    listChangeLogForSummaries(filters),
  ]);
  return (
    <Suspense>
      <RecruitingChangeLogPage events={events} filters={filters} hasMore={hasMore} summaryEvents={summaryEvents} />
    </Suspense>
  );
}
