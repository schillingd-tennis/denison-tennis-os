import Image from "next/image";

import type { SchoolLogoResolution } from "../types";

export default function SchoolLogoMark({
  resolution,
  size = 28,
}: {
  resolution: SchoolLogoResolution;
  size?: number;
}) {
  const alt = `${resolution.displayName} logo`;
  if (resolution.logoSrc) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white"
        style={{ width: size, height: size }}
      >
        {/* Local public assets from /school-logos — not remote hotlinks. */}
        <Image
          src={resolution.logoSrc}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-label={alt}
      title={alt}
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-app-background text-[10px] font-semibold tracking-wide text-text-secondary"
      style={{ width: size, height: size }}
    >
      {resolution.initials}
    </span>
  );
}
