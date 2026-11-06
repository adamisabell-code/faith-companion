// Push notifications for check-ins (iOS/Android). On web this is a no-op:
// web users get their check-in when they open the app instead.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const pushSupported = Platform.OS !== "web";

if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission and return an Expo push token, or null if the user
 * declined, this is a simulator, or we're on web.
 */
export async function registerForPush(): Promise<string | null> {
  if (!pushSupported || !Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("checkins", {
      name: "Check-ins",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn("No EAS projectId yet. Run `npx eas-cli@latest init` in apps/companion.");
    return null;
  }
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.warn("Push token failed", e);
    return null;
  }
}
