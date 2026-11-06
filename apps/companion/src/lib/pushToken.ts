import { supabase } from "./supabase";

/**
 * Attach a device's push token to the signed-in user, removing it from any other
 * account that used this device before (so nobody gets someone else's check-ins).
 */
export async function claimPushToken(token: string | null): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("claim_push_token", { p_token: token });
  return error ? { error: error.message } : {};
}
