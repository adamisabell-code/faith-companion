import { Fraunces_400Regular, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OnboardingProvider } from "@/lib/onboarding";
import { pushSupported } from "@/lib/push";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useSession();
  const show = ready && fontsReady;
  useEffect(() => { if (show) SplashScreen.hideAsync().catch(() => {}); }, [show]);

  // Tapping a check-in notification opens the chat.
  useEffect(() => {
    if (!pushSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate("/chat"));
    return () => sub.remove();
  }, []);
  if (!show) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Screen name="home" options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_400Regular, Fraunces_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <OnboardingProvider>
          <StatusBar style="dark" />
          <Gate fontsReady={loaded || !!error} />
        </OnboardingProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
