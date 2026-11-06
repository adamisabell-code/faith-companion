import { traditionsWithProfiles } from "./theme";

/** The tradition id stored in profiles (must exist in the traditions table, or null). */
export function traditionIdFor(choice: string): string | null {
  return traditionsWithProfiles.has(choice) ? choice : null;
}

/** Sensible default translation for a tradition until the user picks one. */
export function defaultTranslation(choice: string): string {
  if (choice === "catholic") return "DRA";
  if (choice === "baptist") return "KJV";
  if (choice === "orthodox") return "WEB";
  return "BSB";
}
