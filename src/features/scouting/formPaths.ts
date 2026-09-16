export const SCOUTING_PUBLIC_FORM_ROUTE = "/scouting-form";

export function scoutingFormPublicPath(rawToken: string): string {
  return `${SCOUTING_PUBLIC_FORM_ROUTE}/${encodeURIComponent(rawToken)}`;
}

export function isScoutingPublicFormPath(pathname: string): boolean {
  return (
    pathname === SCOUTING_PUBLIC_FORM_ROUTE ||
    pathname.startsWith(`${SCOUTING_PUBLIC_FORM_ROUTE}/`)
  );
}
