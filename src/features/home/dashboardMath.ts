export function sparklinePoints(
  values: readonly number[],
  width = 420,
  height = 92,
): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index * width) / (values.length - 1);
      const y = height - 8 - ((value - min) / spread) * (height - 16);
      return `${x},${y}`;
    })
    .join(" ");
}

export function dayRulePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export function sparklinePointsInRange(
  values: readonly number[],
  min: number,
  max: number,
  width = 420,
  height = 92,
): string {
  if (!values.length) return "";
  const spread = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index * width) / (values.length - 1);
      const y = height - 8 - ((value - min) / spread) * (height - 16);
      return `${x},${y}`;
    })
    .join(" ");
}

export type UtrMover = {
  personId: string;
  displayName: string;
  utr: number | null;
  utrChange: number | null;
};

/** Largest week-over-week UTR moves, regardless of direction. */
export function topUtrMovers<T extends UtrMover>(
  rows: readonly T[],
  limit = 5,
): T[] {
  return rows
    .filter((row) => row.utrChange != null && Number.isFinite(row.utrChange) && row.utrChange !== 0)
    .sort((a, b) => {
      const magnitude = Math.abs(b.utrChange!) - Math.abs(a.utrChange!);
      return magnitude || a.displayName.localeCompare(b.displayName);
    })
    .slice(0, Math.max(0, limit));
}
