export type RecruitRatingProvider = "utr" | "wtn" | "trn";

export type RecruitRatingJobStatus = {
  id: string;
  provider: RecruitRatingProvider;
  status: "queued" | "running" | "complete" | "partial" | "auth_required" | "error";
  requestedAt: string;
  checkedCount: number;
  totalCount: number;
  error: string | null;
};

export type RecruitRatingPlayer = {
  personId: string;
  displayName: string;
  classYear: number;
  provider: RecruitRatingProvider;
  externalPlayerId: string;
  profileUrl: string;
};

export type RecruitRatingObservation = RecruitRatingPlayer & {
  rating: number;
  starRating?: number | null;
  ratingDate: string;
  diagnostic?: string;
};

export type RecruitRatingDashboardRow = {
  personId: string;
  displayName: string;
  classYear: number;
  utr: number | null;
  wtn: number | null;
  trnRank: number | null;
  trnStarRating: number | null;
  utrUrl: string | null;
  wtnUrl: string | null;
  trnUrl: string | null;
  utrChange: number | null;
  wtnChange: number | null;
  trnChange: number | null;
  utrCheckedAt: string | null;
  wtnCheckedAt: string | null;
  trnCheckedAt: string | null;
};
