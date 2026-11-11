// Sends people to the right place: welcome, onboarding, or their chat.
import { Redirect } from "expo-router";
import { Text } from "react-native";
import { Screen, H1, Body } from "@/components/ui";
import { draftReady, useOnboarding } from "@/lib/onboarding";
import { useSession } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

export default function Index() {
  const { session, profile, profileLoading } = useSession();
  const { draft } = useOnboarding();

  if (!supabaseConfigured) {
    return (
      <Screen>
        <H1>Almost there</H1>
        <Body>This build is missing its Supabase settings. Copy apps/companion/.env.example to .env and fill in the project URL and publishable key.</Body>
        <Text />
      </Screen>
    );
  }

  if (!session) return <Redirect href="/welcome" />;
  if (profileLoading) return null; // wait for the profile before choosing a screen
  // New account: if they already met their buddy before signing up, go straight to the last steps.
  if (!profile?.onboarded_at) return <Redirect href={draftReady(draft) ? "/onboarding/times" : "/onboarding/companion"} />;
  return <Redirect href="/home" />;
}
