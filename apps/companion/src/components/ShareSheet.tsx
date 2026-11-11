// "Share today's words": a preview of the card and one button. Sharing is always the
// user's choice, and the card only ever holds Scripture and the buddy's world.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type Svg from "react-native-svg";
import { cardLines, ShareCard } from "./ShareCard";
import { track } from "@/lib/analytics";
import { WEB_URL } from "@/lib/config";
import type { Words } from "@/lib/jesus";
import { canSaveImage, CARD_DOM_ID, shareCard } from "@/lib/shareImage";
import { companions, fonts, type CompanionId } from "@/lib/theme";
import type { Period } from "@/lib/timeOfDay";

export function ShareSheet({ visible, onClose, id, period, words, keptTotal, stage }: {
  visible: boolean;
  onClose: () => void;
  id: CompanionId;
  period: Period;
  words: Words;
  keptTotal: number;
  stage: 0 | 1 | 2 | 3;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const card = useRef<Svg>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Fit the 4:5 card on small phones with room for the buttons.
  const cardWidth = Math.round(Math.min(340, width - 48, (height - insets.top - insets.bottom - 250) * 0.8));

  useEffect(() => { if (visible) { setNote(null); track("share_opened", { buddy: id }); } }, [visible, id]);

  const link = /YOUR-WEB-APP/.test(WEB_URL) ? "" : `\n\n${WEB_URL}`;
  const text = `“${words.text}”\n${words.reference} (${words.translation})${link}`;

  async function go(save: boolean) {
    if (busy) return;
    setBusy(true); setNote(null);
    try {
      const r = await shareCard(card.current, cardLines(words, period), text, save);
      if (r !== "cancelled") track("share_completed", { buddy: id, how: r });
      if (r === "saved") setNote("Saved to your downloads.");
      if (r === "shared") onClose();
    } catch {
      setNote("That didn't work. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[st.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={st.top}>
          <Text style={st.kicker}>SHARE TODAY'S WORDS</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={st.close}>
            <Text style={st.closeText}>Close</Text>
          </Pressable>
        </View>

        <View style={st.center}>
          <View nativeID={CARD_DOM_ID} style={[st.cardWrap, { width: cardWidth }]}>
            <ShareCard ref={card} id={id} period={period} words={words} keptTotal={keptTotal} stage={stage} width={cardWidth} />
          </View>
          <Text style={st.privacy}>Only the verse and {companions[id].name}'s world are on the card. Nothing you've written or prayed is ever shared.</Text>
        </View>

        <View style={st.bottom}>
          {note ? <Text accessibilityRole="alert" style={st.note}>{note}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => go(false)} disabled={busy} style={({ pressed }) => [st.primary, (pressed || busy) && { opacity: 0.8 }]}>
            <Text style={st.primaryText}>{busy ? "Getting it ready…" : "Share"}</Text>
          </Pressable>
          {canSaveImage ? (
            <Pressable accessibilityRole="button" onPress={() => go(true)} disabled={busy} style={st.secondary}>
              <Text style={st.secondaryText}>Save the image</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#10152A", paddingHorizontal: 24 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, color: "#A7AEC0" },
  close: { minHeight: 44, justifyContent: "center" },
  closeText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#D9DDE6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  cardWrap: { borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  privacy: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: "#A7AEC0", textAlign: "center", maxWidth: 320 },
  bottom: { gap: 8, width: "100%", maxWidth: 480, alignSelf: "center" },
  note: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#D9DDE6", textAlign: "center" },
  primary: { minHeight: 56, borderRadius: 28, backgroundColor: "#F1ECE2", alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#151B2B" },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#A7AEC0", textDecorationLine: "underline" },
});
