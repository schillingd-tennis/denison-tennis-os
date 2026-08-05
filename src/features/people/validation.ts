import { isRequired, isValidEmail, isValidPhone, isValidUtr, isValidWtn } from "@/components/editor/validators";
import type { FieldErrors } from "@/components/editor/types";

import type { Person } from "./types";

/**
 * The Person-specific validation rules for the Universal Person Editor
 * (BP-013). Composed entirely from the generic validators in
 * `src/components/editor/validators.ts` — a future Recruit/Parent/Coach
 * validator would follow the same pattern rather than duplicating rules.
 *
 * Required: First Name, Last Name, Status.
 * Format: email(s), phone, UTR (0–16), WTN (positive).
 */
export function validatePerson(person: Person): FieldErrors {
  const errors: FieldErrors = {};

  const firstNameError = isRequired(person.firstName);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = isRequired(person.lastName);
  if (lastNameError) errors.lastName = lastNameError;

  const statusError = isRequired(person.statusId);
  if (statusError) errors.status = statusError;

  const roleError = isRequired(person.roleId);
  if (roleError) errors.role = roleError;

  const personalEmailError = isValidEmail(person.personalEmail);
  if (personalEmailError) errors.personalEmail = personalEmailError;

  const denisonEmailError = isValidEmail(person.denisonEmail);
  if (denisonEmailError) errors.denisonEmail = denisonEmailError;

  const phoneError = isValidPhone(person.cellPhone);
  if (phoneError) errors.cellPhone = phoneError;

  const utrError = isValidUtr(person.utr);
  if (utrError) errors.utr = utrError;

  const wtnError = isValidWtn(person.wtn);
  if (wtnError) errors.wtn = wtnError;

  return errors;
}
