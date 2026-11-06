import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function OnboardingLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
