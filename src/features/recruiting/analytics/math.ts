/**
 * Pure numeric helpers for recruiting analytics (BP-044).
 */

export function round2(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + 1e-10)) / 100;
}

export function sampleMean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("sampleMean requires at least one value.");
  }
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/** Sample standard deviation (n − 1). */
export function sampleSd(values: readonly number[]): number {
  if (values.length < 2) {
    throw new Error("sampleSd requires at least two values.");
  }
  const mean = sampleMean(values);
  let ss = 0;
  for (const value of values) {
    const d = value - mean;
    ss += d * d;
  }
  return Math.sqrt(ss / (values.length - 1));
}

/**
 * Excel RANK.EQ / competition rank: ties share the minimum rank.
 * `asc` = lower value is rank 1. `desc` = higher value is rank 1.
 */
export function competitionRank(
  value: number,
  universe: readonly number[],
  direction: "asc" | "desc",
): number {
  let better = 0;
  if (direction === "asc") {
    for (const other of universe) {
      if (other < value) better += 1;
    }
  } else {
    for (const other of universe) {
      if (other > value) better += 1;
    }
  }
  return better + 1;
}
