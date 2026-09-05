import { hotelBrandLogoUrl, resolveHotelBrand } from "../brandIdentity";

export default function HotelBrandMark({ name, size = 36 }: { name: string; size?: number }) {
  const brand = resolveHotelBrand(name);
  return <span title={brand.label} aria-label={`${brand.label} logo`} className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-teal-200/70 bg-white font-bold text-teal-800 shadow-sm" style={{ width: size, height: size }}>
    <span aria-hidden="true" className="text-[10px] tracking-tight">{brand.initials}</span>
    {brand.logoSrc || brand.domain ? <span aria-hidden="true" className="absolute inset-[8%] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${brand.logoSrc ?? hotelBrandLogoUrl(brand.domain!)})` }}/> : null}
  </span>;
}
