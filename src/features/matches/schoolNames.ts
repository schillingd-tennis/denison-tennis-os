import { resolveSchoolIdentityFromLabelExact } from "@/features/teamSchedule/schoolIdentity";

const MATCH_SCHOOL_CODE_NAMES: Readonly<Record<string, string>> = {
  DEN: "Denison University",
  KEN: "Kenyon College",
  CMU: "Carnegie Mellon University",
  CWRU: "Case Western Reserve University",
  DPU: "DePauw University",
};

const FULL_NAME_BY_IDENTITY_SLUG: Readonly<Record<string, string>> = {
  kenyon: "Kenyon College",
  "carnegie-mellon": "Carnegie Mellon University",
  "case-western": "Case Western Reserve University",
  depauw: "DePauw University",
};

export function resolveMatchSchoolName(raw: string | null | undefined): {
  name: string | null;
  needsConfirmation: boolean;
} {
  const value = raw?.trim();
  if (!value) return { name: null, needsConfirmation: false };

  const codeName = MATCH_SCHOOL_CODE_NAMES[value.toUpperCase()];
  if (codeName) return { name: codeName, needsConfirmation: false };

  const identity = resolveSchoolIdentityFromLabelExact(value);
  if (identity) {
    return {
      name: FULL_NAME_BY_IDENTITY_SLUG[identity.slug] ?? identity.label,
      needsConfirmation: false,
    };
  }

  return {
    name: value,
    needsConfirmation: /^[A-Z][A-Z0-9&.-]{1,7}$/.test(value),
  };
}

export function isDenisonSchoolName(value: string | null | undefined): boolean {
  return resolveMatchSchoolName(value).name === "Denison University";
}
