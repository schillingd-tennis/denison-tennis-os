/** First-class role / status lookup records (BP-025A). */

export type LookupRecord = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

/** Compact join shape embedded on Person after load. */
export type LookupRef = {
  id: string;
  key: string;
  label: string;
};
