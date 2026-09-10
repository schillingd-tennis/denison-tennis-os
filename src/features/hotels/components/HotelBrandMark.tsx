"use client";

import { useState } from "react";

import { hotelBrandLogoUrl, resolveHotelBrand } from "../brandIdentity";

export default function HotelBrandMark({ name, size = 44 }: { name: string; size?: number }) {
  const brand = resolveHotelBrand(name);
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = brand.logoSrc ?? (brand.domain ? hotelBrandLogoUrl(brand.domain) : null);
  return <span title={brand.label} aria-label={`${brand.label} logo`} className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-teal-200/70 bg-white font-bold text-teal-800 shadow-sm" style={{ width: size, height: size }}>
    <span aria-hidden="true" className="text-[10px] tracking-tight">{brand.initials}</span>
    {logoUrl && !imageFailed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" aria-hidden="true" onError={() => setImageFailed(true)} className="absolute inset-[8%] h-[84%] w-[84%] object-contain"/>
    ) : null}
  </span>;
}
