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
