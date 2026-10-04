import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { RECRUIT_PRIORITY_KEYS } from "@/features/recruiting/lookupSeed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  RecruitRatingDashboardRow,
  RecruitRatingObservation,
  RecruitRatingPlayer,
  RecruitRatingProvider,
} from "./types";

export const FIRST_ACTIVE_RECRUIT_CLASS = 2027;

function profileUrlFor(provider: RecruitRatingProvider, person: { utrUrl?: string; wtnUrl?: string; trnUrl?: string }): string | undefined {
  if (provider === "utr") return person.utrUrl;
  if (provider === "wtn") return person.wtnUrl;
  return person.trnUrl;
}

export function parseRecruitExternalId(provider: RecruitRatingProvider, url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (provider === "utr") return trimmed.match(/\/profiles\/(\d+)/i)?.[1] ?? null;
  if (provider === "wtn") {
    return trimmed.match(/[?&](?:id|playerId)=([a-z0-9-]+)/i)?.[1] ??
      trimmed.match(/(?:player|profile)[/=]([a-z0-9-]+)/i)?.[1] ?? null;
  }
  return trimmed.match(/[?&](?:id|playerId)=([a-z0-9-]+)/i)?.[1] ??
    trimmed.match(/\/player\/(?:[^/]+\/)?([a-z0-9-]+)/i)?.[1] ?? trimmed;
}

async function eliteRows() {
  const { rows } = await loadRecruitingDirectory();
  return rows.filter((row) =>
    row.profile.priority?.key === RECRUIT_PRIORITY_KEYS.elite &&
    (row.profile.recruitClassYear ?? 0) >= FIRST_ACTIVE_RECRUIT_CLASS
  );
}

export async function listEliteRecruitRatingPlayers(
  provider: RecruitRatingProvider,
): Promise<RecruitRatingPlayer[]> {
  const rows = await eliteRows();
  return rows.flatMap(({ person, profile }) => {
    const profileUrl = profileUrlFor(provider, person);
    const classYear = profile.recruitClassYear;
    if (!profileUrl || !classYear) return [];
    const externalPlayerId = parseRecruitExternalId(provider, profileUrl);
    if (!externalPlayerId) return [];
    return [{
      personId: person.id,
      displayName: `${person.preferredName?.trim() || person.firstName} ${person.lastName}`.trim(),
      classYear,
      provider,
      externalPlayerId,
      profileUrl,
    }];
  });
}

export async function recordRecruitRatingObservation(
  observation: RecruitRatingObservation,
  jobId: string,
): Promise<void> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("record_recruit_rating", {
    p_person_id: observation.personId,
    p_provider: observation.provider,
    p_rating: observation.rating,
    p_rating_date: observation.ratingDate,
    p_star_rating: observation.starRating ?? null,
    p_external_player_id: observation.externalPlayerId,
    p_source_url: observation.profileUrl,
    p_job_id: jobId,
    p_diagnostic: observation.diagnostic ?? null,
  });
  if (error) throw new Error(`Failed to record recruit ${observation.provider.toUpperCase()} rating: ${error.message}`);
}

type SnapshotRow = {
  person_id: string;
  provider: RecruitRatingProvider;
  rating_change: number | null;
  captured_at: string;
};

export async function listRecruitRatingDashboard(): Promise<RecruitRatingDashboardRow[]> {
  const [rows, db] = await Promise.all([eliteRows(), createSupabaseServerClient()]);
  const { data: snapshots, error } = await db.from("recruit_rating_snapshots")
    .select("person_id, provider, rating_change, captured_at")
    .order("captured_at", { ascending: false });
  const missing = error?.code === "42P01" || error?.code === "PGRST205";
  if (error && !missing) throw new Error(`Failed to load recruit rating history: ${error.message}`);

  const latest = new Map<string, SnapshotRow>();
  for (const snapshot of (snapshots ?? []) as SnapshotRow[]) {
    const key = `${snapshot.person_id}:${snapshot.provider}`;
    if (!latest.has(key)) latest.set(key, snapshot);
  }

  return rows.map(({ person, profile }) => {
    const snapshot = (provider: RecruitRatingProvider) => latest.get(`${person.id}:${provider}`);
    return {
      personId: person.id,
      displayName: `${person.preferredName?.trim() || person.firstName} ${person.lastName}`.trim(),
      classYear: profile.recruitClassYear!,
      utr: person.utr ?? null,
      wtn: person.wtn ?? null,
      trnRank: person.trnRank ?? null,
      trnStarRating: person.trnStarRating ?? null,
      utrUrl: person.utrUrl ?? null,
      wtnUrl: person.wtnUrl ?? null,
      trnUrl: person.trnUrl ?? null,
      utrChange: snapshot("utr")?.rating_change ?? null,
      wtnChange: snapshot("wtn")?.rating_change ?? null,
      trnChange: snapshot("trn")?.rating_change ?? null,
      utrCheckedAt: snapshot("utr")?.captured_at ?? null,
      wtnCheckedAt: snapshot("wtn")?.captured_at ?? null,
      trnCheckedAt: snapshot("trn")?.captured_at ?? null,
    };
  }).sort((a, b) => a.classYear - b.classYear || a.displayName.localeCompare(b.displayName));
}

export async function requestRecruitRatingJob(provider: RecruitRatingProvider): Promise<void> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("request_recruit_rating_job", { p_provider: provider });
  if (error) throw new Error(`Failed to queue recruit ${provider.toUpperCase()} rating check: ${error.message}`);
}
