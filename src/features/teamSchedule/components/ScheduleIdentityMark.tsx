"use client";

import { useState } from "react";

import type { ScheduleIdentity } from "../schoolIdentity";

const MARK_SIZE = 32;

function InitialsBadge({
  identity,
  size,
}: {
  identity: ScheduleIdentity;
  size: number;
}) {
  const fontSize = identity.initials.length > 3 ? size * 0.28 : size * 0.34;
  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className="flex shrink-0 items-center justify-center rounded-md bg-black/[0.06] font-semibold leading-none text-text-secondary"
      aria-hidden
    >
      {identity.initials}
    </div>
  );
}

export default function ScheduleIdentityMark({
  identity,
  size = MARK_SIZE,
}: {
  identity: ScheduleIdentity;
  size?: number;
}) {
  const [useFallback, setUseFallback] = useState(false);

  if (!identity.logoSrc || useFallback) {
    return <InitialsBadge identity={identity} size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local school identity assets with initials fallback
    <img
      src={identity.logoSrc}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-md object-contain"
      onError={() => setUseFallback(true)}
    />
  );
}
