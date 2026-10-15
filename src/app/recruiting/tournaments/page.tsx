import TournamentsDashboard from "@/features/tournaments/components/TournamentsDashboard";
import { listTournaments } from "@/features/tournaments/repository";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function classifyTournamentLoadError(error: string): string {
  if (/does not exist|schema cache|could not find the table/i.test(error)) {
    return `Database table or migration missing. ${error}`;
  }
  if (/permission|row-level security|rls|not authorized|42501/i.test(error)) {
    return `Permission/RLS error. ${error}`;
  }
  return `Query failed. ${error}`;
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ view }, result, directory] = await Promise.all([
    searchParams,
    listTournaments(),
    loadRecruitingDirectory().catch(() => ({ rows: [] as RecruitDirectoryRow[] })),
  ]);

  // A Mac sleep/wake or clock correction can leave Safari holding a token
  // that local PostgREST considers future-dated. Clear it once through a
  // database-independent route instead of rendering a permanently broken page.
  if (!result.ok && /jwt issued at future/i.test(result.error)) {
    redirect("/auth/reset-session?next=/recruiting/tournaments");
  }

  return (
    <TournamentsDashboard
      tournaments={result.ok ? result.tournaments : []}
      recruits={directory.rows}
      loadError={result.ok ? null : classifyTournamentLoadError(result.error)}
      initialView={view === "calendar" ? "calendar" : "list"}
    />
  );
}
