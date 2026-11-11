import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function OnboardingLayout() {
  const { session, profile, profileLoading } = useSession();
  // The first steps (buddy, focus, about you) happen before the account exists.
  if (session && profileLoading) return null;
  // Already set up (e.g. a returning user): go to the chat, don't redo onboarding.
  if (profile?.onboarded_at) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
