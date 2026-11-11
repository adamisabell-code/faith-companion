// iPhone / Android: turn the share card into a PNG and open the system share sheet.
// TODO(device test): confirmed in code review only. On iOS the image goes to the share
// sheet as a picture; Android's built-in sheet can't take an image this way, so it
// shares the verse as text until expo-sharing is added.
import { Platform, Share } from "react-native";
import type Svg from "react-native-svg";
import { CARD_H, CARD_W, type CardLine } from "@/components/ShareCard";

export const CARD_DOM_ID = "ab-share-card";
export type ShareResult = "shared" | "saved" | "cancelled";

function toPng(ref: Svg): Promise<string> {
  return new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("Couldn't draw the card.")), 6000);
    ref.toDataURL((base64: string) => { clearTimeout(t); ok(base64); }, { width: CARD_W * 3, height: CARD_H * 3 });
  });
}

export async function shareCard(ref: Svg | null, _lines: CardLine[], text: string, _forceSave = false): Promise<ShareResult> {
  if (Platform.OS === "ios" && ref) {
    const base64 = await toPng(ref);
    const r = await Share.share({ url: `data:image/png;base64,${base64}` });
    return r.action === Share.dismissedAction ? "cancelled" : "shared";
  }
  const r = await Share.share({ message: text });
  return r.action === Share.dismissedAction ? "cancelled" : "shared";
}

export const canSaveImage = false;
