// On iOS/Android, give Supabase a localStorage backed by SQLite so the session persists.
import "expo-sqlite/localStorage/install";

export const sessionStorage = globalThis.localStorage;
