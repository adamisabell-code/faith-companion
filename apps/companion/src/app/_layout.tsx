import { Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from "@expo-google-fonts/nunito";
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
      <Stack.Screen name="chat" options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_700Bold, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
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
