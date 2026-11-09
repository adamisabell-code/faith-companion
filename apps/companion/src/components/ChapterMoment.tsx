// The quiet moment when a chapter of the world is finished: the buddy, a title,
// one line in its voice, and (for Lumi) naming the new constellation.
// No confetti. Scripture is referenced, never quoted; "Read it" opens the chat.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Character } from "./Character";
import { chapterInfo } from "@/lib/chapters";
import { nativeDriver, useReduceMotion } from "@/lib/motion";
import { companions, fonts, type CompanionId } from "@/lib/theme";

export function ChapterMoment({ visible, id, number, onClose, onRead, onOpenBook, onName }: {
  visible: boolean;
  id: CompanionId;
  number: number;
  onClose: () => void;
  onRead: (reference: string) => void;
  onOpenBook: () => void;
  /** Lumi only: save the constellation's name. Returns an error message, if any. */
  onName?: (name: string) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = chapterInfo(id, number);
  const c = companions[id];
  const naming = id === "lumi" && !!onName;

  useEffect(() => {
    if (!visible) return;
    setName(""); setError(null);
    fade.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.timing(fade, { toValue: 1, duration: 900, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const v = name.trim();
    if (!v || !onName) return;
    setSaving(true); setError(null);
    const err = await onName(v);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  const kicker = id === "lumi" ? `CONSTELLATION ${number}` : `CHAPTER ${number}`;
  const rise = fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Modal visible={visible} transparent animationType={reduce ? "none" : "fade"} onRequestClose={onClose} statusBarTranslucent>
      <View style={[st.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <View style={st.center}>
          <View style={st.buddyWrap}>
            {[220, 196, 172, 150, 130, 112].map((d) => (
              <View key={d} style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, backgroundColor: "#F6DDA4", opacity: 0.03 }} />
            ))}
            <Character id={id} size={140} eyes="happy" />
          </View>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: "center", gap: 12 }} accessibilityLiveRegion="polite">
            <Text style={st.kicker}>{kicker}</Text>
            <Text style={st.title} accessibilityRole="header">{info.title}</Text>
            <Text style={st.line}>{info.line}</Text>
            <Text style={st.voice}>— {c.name}</Text>
          </Animated.View>
        </View>

        <View style={st.bottom}>
          {naming ? (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name it after what God did"
                placeholderTextColor="#7F879B"
                maxLength={40}
                autoFocus={false}
                returnKeyType="done"
                onSubmitEditing={save}
                accessibilityLabel="Constellation name"
                style={st.input}
              />
              {error ? <Text style={st.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={save} disabled={!name.trim() || saving} style={({ pressed }) => [st.primary, (!name.trim() || saving) && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}>
                <Text style={st.primaryText}>{saving ? "Saving…" : "Name it"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onClose} style={st.secondary}>
                <Text style={st.secondaryText}>Later. I can name it in the Book of Remembrance.</Text>
              </Pressable>
            </>
          ) : (
            <>
              {info.reference ? (
                <Pressable accessibilityRole="button" onPress={() => onRead(info.reference!)} style={({ pressed }) => [st.ghost, pressed && { opacity: 0.8 }]}>
                  <Text style={st.ghostText}>Read {info.reference} with {c.name}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [st.primary, pressed && { opacity: 0.85 }]}>
                <Text style={st.primaryText}>Keep going</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onOpenBook} style={st.secondary}>
                <Text style={st.secondaryText}>Open the Book of Remembrance</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#10152A", paddingHorizontal: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28, maxWidth: 480, alignSelf: "center", width: "100%" },
  buddyWrap: { width: 220, height: 180, alignItems: "center", justifyContent: "center" },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.6, color: "#A7AEC0" },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: "#F1ECE2", textAlign: "center" },
  line: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, color: "#D9DDE6", textAlign: "center" },
  voice: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#A7AEC0" },
  bottom: { gap: 12, width: "100%", maxWidth: 480, alignSelf: "center" },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: "#3A4566", backgroundColor: "#1A2136", paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16, color: "#F1ECE2" },
  error: { fontFamily: fonts.body, fontSize: 13, color: "#E9B4A4", textAlign: "center" },
  primary: { minHeight: 56, borderRadius: 28, backgroundColor: "#F1ECE2", alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#151B2B" },
  ghost: { minHeight: 52, borderRadius: 26, borderWidth: 1, borderColor: "#3A4566", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  ghostText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#F1ECE2" },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#A7AEC0", textDecorationLine: "underline" },
});
