import { traditionsWithProfiles } from "./theme";

/** The tradition id stored in profiles (must exist in the traditions table, or null). */
export function traditionIdFor(choice: string): string | null {
  return traditionsWithProfiles.has(choice) ? choice : null;
}

/**
 * Preselected translation for a tradition: modern English for everyone.
 * Catholic and Orthodox Bibles include extra books, which World English has.
 */
export function defaultTranslation(choice: string): string {
  if (choice === "catholic" || choice === "orthodox") return "WEB";
  return "BSB";
}
