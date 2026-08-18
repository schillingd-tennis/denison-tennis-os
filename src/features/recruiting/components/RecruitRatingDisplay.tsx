"use client";

import { Star } from "lucide-react";

import type { Person } from "@/features/people/types";

type RatingSize = "sm" | "md";

const starSizeClass: Record<RatingSize, string> = {
  sm: "h-4 w-4",
  md: "h-4.5 w-4.5",
};

const chipSizeClass: Record<RatingSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

export function BlueChipRatingIcon({ size = "md" }: { size?: RatingSize }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-sky-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(2,132,199,0.65),0_0_0_1px_rgba(2,132,199,0.35)] ${chipSizeClass[size]}`}
    >
      <span className="h-2 w-2 rounded-full bg-sky-100/95 shadow-[0_0_0_1px_rgba(186,230,253,0.8)]" />
      <span className="absolute top-0.5 h-1 w-1 rounded-full bg-sky-100/95" />
      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sky-100/95" />
      <span className="absolute left-0.5 h-1 w-1 rounded-full bg-sky-100/95" />
      <span className="absolute right-0.5 h-1 w-1 rounded-full bg-sky-100/95" />
    </span>
  );
}

export function RecruitStarRatingDisplay({
  rating,
  size = "md",
  showBlueChipLabel = false,
  emptyLabel = "—",
}: {
  rating: Person["trnStarRating"] | undefined;
  size?: RatingSize;
  showBlueChipLabel?: boolean;
  emptyLabel?: string | null;
}) {
  const count = rating ? Number(rating) : 0;
  const blueChip = count === 6;
  const valid = blueChip ? 0 : Number.isFinite(count) ? Math.max(0, Math.min(5, count)) : 0;
  if (blueChip) {
    return (
      <span className="inline-flex items-center gap-2">
        <BlueChipRatingIcon size={size} />
        {showBlueChipLabel ? <span className="text-sm font-semibold text-sky-700">Blue Chip</span> : null}
      </span>
    );
  }
  if (valid > 0) {
    return (
      <span className="inline-flex items-center gap-1">
        {Array.from({ length: valid }, (_, index) => (
          <Star
            key={index}
            className={`${starSizeClass[size]} fill-[#f4b400] text-[#f4b400] stroke-0`}
            strokeWidth={0}
            aria-hidden
          />
        ))}
      </span>
    );
  }
  if (emptyLabel === null) return null;
  return <span className="text-sm text-text-secondary">{emptyLabel}</span>;
}
