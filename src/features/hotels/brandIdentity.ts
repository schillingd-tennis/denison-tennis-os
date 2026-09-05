export type HotelBrandIdentity = { label: string; domain: string | null; logoSrc: string | null; initials: string };

const BRANDS: { match: RegExp; label: string; domain: string }[] = [
  { match: /hilton garden inn/i, label: "Hilton Garden Inn", domain: "hiltongardeninn.com" },
  { match: /hampton in|hampton inn/i, label: "Hampton by Hilton", domain: "hampton.com" },
  { match: /home2/i, label: "Home2 Suites", domain: "home2suites.com" },
  { match: /tru by hilton/i, label: "Tru by Hilton", domain: "trubyhilton.com" },
  { match: /doubletree/i, label: "DoubleTree by Hilton", domain: "doubletree.com" },
  { match: /homewood suites/i, label: "Homewood Suites", domain: "homewoodsuites.com" },
  { match: /holiday|holliday|holday inn/i, label: "Holiday Inn", domain: "holidayinn.com" },
  { match: /staybridge/i, label: "Staybridge Suites", domain: "staybridge.com" },
  { match: /candalwood|candlewood/i, label: "Candlewood Suites", domain: "candlewoodsuites.com" },
  { match: /^avid$/i, label: "avid hotels", domain: "avidhotels.com" },
  { match: /hyatt place/i, label: "Hyatt Place", domain: "hyattplace.com" },
  { match: /wyngate|wingate/i, label: "Wingate by Wyndham", domain: "wingatehotels.com" },
  { match: /residence inn/i, label: "Residence Inn", domain: "residenceinn.com" },
  { match: /towne\s*place|town place/i, label: "TownePlace Suites", domain: "towneplacesuites.com" },
  { match: /springhill suites/i, label: "SpringHill Suites", domain: "springhillsuites.com" },
];

export function resolveHotelBrand(name: string): HotelBrandIdentity {
  const brand = BRANDS.find((candidate) => candidate.match.test(name));
  const label = brand?.label ?? name;
  return {
    label,
    domain: brand?.domain ?? null,
    logoSrc: brand?.label === "Home2 Suites" ? "/hotel-logos/home2-suites.png" : null,
    initials: label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "H",
  };
}

export function hotelBrandLogoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
