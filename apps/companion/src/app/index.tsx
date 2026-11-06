// Sends people to the right place: welcome, onboarding, or their chat.
import { Redirect } from "expo-router";
import { Text } from "react-native";
import { Screen, H1, Body } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

export default function Index() {
  const { session, profile } = useSession();

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
  if (!profile?.onboarded_at) return <Redirect href="/onboarding/about" />;
  return <Redirect href="/chat" />;
}
