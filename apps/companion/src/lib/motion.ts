// Shared motion + haptics helpers. Everything respects the system "reduce motion" setting.
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export const nativeDriver = Platform.OS !== "web";

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => setReduce(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

const canBuzz = Platform.OS === "ios" || Platform.OS === "android";

export const haptic = {
  tap: () => { if (canBuzz) Haptics.selectionAsync().catch(() => {}); },
  soft: () => { if (canBuzz) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}); },
  success: () => { if (canBuzz) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
