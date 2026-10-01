export type TeamRatingProvider = "utr" | "wtn";

export type TeamRatingPlayer = {
  personId: string;
  displayName: string;
  provider: TeamRatingProvider;
  externalPlayerId: string;
  profileUrl: string;
};

export type TeamRatingObservation = TeamRatingPlayer & {
  rating: number;
  ratingDate: string;
  diagnostic?: string;
};

export type TeamRatingDashboardRow = {
  personId: string;
  displayName: string;
  utr: number | null;
  wtn: number | null;
  utrUrl: string | null;
  wtnUrl: string | null;
  utrChange: number | null;
  wtnChange: number | null;
  utrCheckedAt: string | null;
  wtnCheckedAt: string | null;
};

export type TeamPower6HistoryPoint = {
  rating: number;
  ratingDate: string;
  capturedAt: string;
};
