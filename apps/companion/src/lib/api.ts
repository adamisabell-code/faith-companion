// Calls to the Supabase Edge Functions (chat, delete-account).
import { functionsUrl, supabase } from "./supabase";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You're signed out. Please sign in again.");
  return {
    Authorization: `Bearer ${token}`,
    apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    "Content-Type": "application/json",
  };
}

/** A server error, with a short machine code when the app should react to it (e.g. "free_limit"). */
export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

async function post<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${functionsUrl}/${fn}`, { method: "POST", headers: await authHeader(), body: JSON.stringify(body) });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Server error (${res.status}).`); }
  if (!res.ok || json.error) throw new ApiError(json.error ?? `Server error (${res.status}).`, json.code);
  return json as T;
}

export type ChatReply = { reply: string | null; message_id?: string | null; tools_used?: string[]; checkin?: "morning" | "evening" | "first" | null };

/** Send a message to the companion. */
export const sendMessage = (message: string) => post<ChatReply>("chat", { message });

/** Ask the server whether a check-in is due right now; if so it writes the opener. */
export const openChat = () => post<ChatReply>("chat", { open: true });

/** Permanently delete the signed-in account and all of its data. */
export const deleteAccount = () => post<{ deleted: boolean }>("delete-account", {});
