// "Pause and pray": the world dims, your companion closes its eyes and breathes with
// you through a short breath prayer, quietly holding up what you're praying for.
// When you say Amen, it bows. Breath prayers are prayers, not Scripture quotes.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { LivingBuddy, type BuddyHandle } from "./LivingBuddy";
import { haptic, nativeDriver, sleep, useReduceMotion } from "@/lib/motion";
import { companions, fonts, type CompanionId } from "@/lib/theme";

const prayers: { inhale: string; exhale: string; note?: string }[] = [
  { inhale: "Lord Jesus Christ,", exhale: "have mercy on me.", note: "The Jesus Prayer, prayed by Christians for centuries" },
  { inhale: "Jesus,", exhale: "I trust in You." },
  { inhale: "Here I am, Lord.", exhale: "Be near to me." },
  { inhale: "Your will,", exhale: "not mine." },
  { inhale: "I give You", exhale: "what I'm carrying." },
];

const IN_MS = 4000;
const OUT_MS = 5000;
const BREATHS = 3;

function todaysPrayer() {
  const d = new Date();
  const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return prayers[n % prayers.length];
}

export function PrayerPause({ visible, id, intentions, onClose, onAmen }: {
  visible: boolean;
  id: CompanionId;
  intentions: string[];
  onClose: () => void;
  onAmen: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const buddy = useRef<BuddyHandle>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [breath, setBreath] = useState(0);
  const [amen, setAmen] = useState(false);
  const prayer = useRef(todaysPrayer()).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current; // breathing light behind the buddy
  const c = companions[id];

  // Breath cycle: inhale text, exhale text, three times; then wait for Amen.
  useEffect(() => {
    if (!visible) return;
    setAmen(false); setBreath(0); setPhase("in"); glow.setValue(0);
    let alive = true;
    (async () => {
      await sleep(500);
      for (let i = 0; i < BREATHS && alive; i++) {
        setBreath(i + 1);
        for (const p of ["in", "out"] as const) {
          if (!alive) return;
          setPhase(p);
          Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: nativeDriver }).start();
          if (!reduce) {
            Animated.timing(halo, { toValue: p === "in" ? 1 : 0, duration: p === "in" ? IN_MS : OUT_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }).start();
          }
          await sleep((p === "in" ? IN_MS : OUT_MS) - 500);
          if (!alive) return;
          Animated.timing(textOpacity, { toValue: 0.35, duration: 450, useNativeDriver: nativeDriver }).start();
          await sleep(500);
        }
      }
      if (alive) setBreath(BREATHS + 1); // done: Amen invites
    })();
    return () => { alive = false; };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sayAmen() {
    if (amen) return;
    setAmen(true);
    haptic.success();
    Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: nativeDriver }).start();
    Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    await buddy.current?.bow();
    await sleep(900);
    onAmen();
  }

  const done = breath > BREATHS;
  const words = amen ? "Amen." : phase === "in" ? prayer.inhale : prayer.exhale;
  const cue = amen ? "" : done ? "When you're ready" : phase === "in" ? "Breathe in" : "Breathe out";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[st.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={st.top}>
          <Text style={st.kicker}>A BREATH PRAYER</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={st.close} hitSlop={8}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#C9CFDD" strokeWidth={2} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
          </Pressable>
        </View>

        <View style={st.center}>
          <View style={st.buddyWrap}>
            {/* Soft light behind the buddy: stacked circles fake a radial glow on every platform. */}
            <Animated.View pointerEvents="none" style={[st.haloWrap, {
              opacity: Animated.add(halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), glow.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.6, 0.35] })),
              transform: [{ scale: Animated.add(halo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }), glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] })) }],
            }]}>
              {[260, 238, 216, 194, 172, 150, 130, 112].map((d) => (
                <View key={d} style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, backgroundColor: "#F6DDA4", opacity: 0.028 }} />
              ))}
            </Animated.View>
            <LivingBuddy ref={buddy} id={id} size={170} period="night" praying={!amen} breathMs={IN_MS + OUT_MS} interactive={false} dark />
          </View>

          <View style={st.words} accessibilityLiveRegion="polite">
            <Animated.Text style={[st.prayer, { opacity: textOpacity }]}>{words}</Animated.Text>
            <Text style={st.cue}>{cue}</Text>
          </View>
        </View>

        <View style={st.bottom}>
          {intentions.length ? (
            <View style={st.intentions}>
              <Text style={st.kicker}>BRINGING TO GOD</Text>
              <Text style={st.intentionText}>{intentions.slice(0, 3).join("  ·  ")}</Text>
            </View>
          ) : null}
          {prayer.note && !amen ? <Text style={st.note}>{prayer.note}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Amen"
            onPress={sayAmen}
            style={({ pressed }) => [st.amen, done && !amen && st.amenReady, pressed && { opacity: 0.85 }, amen && { opacity: 0 }]}
          >
            <Text style={[st.amenText, done && !amen && { color: "#151B2B" }]}>Amen</Text>
          </Pressable>
          <Text style={st.footer}>{amen ? " " : `${c.name} is praying with you`}</Text>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#10152A", paddingHorizontal: 24 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, color: "#A7AEC0" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 36 },
  buddyWrap: { width: 170, height: 170, alignItems: "center", justifyContent: "center" },
  haloWrap: { position: "absolute", width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  words: { alignItems: "center", gap: 10, minHeight: 96, paddingHorizontal: 8 },
  prayer: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 38, color: "#F1ECE2", textAlign: "center" },
  cue: { fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 0.4, color: "#A7AEC0" },
  bottom: { gap: 16, alignItems: "center", width: "100%", maxWidth: 480, alignSelf: "center" },
  intentions: { alignItems: "center", gap: 6 },
  intentionText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: "#D9DDE6", textAlign: "center" },
  note: { fontFamily: fonts.body, fontSize: 12, color: "#8F97AB", textAlign: "center" },
  amen: { minHeight: 56, alignSelf: "stretch", borderRadius: 28, borderWidth: 1, borderColor: "#3A4566", alignItems: "center", justifyContent: "center" },
  amenReady: { backgroundColor: "#F1ECE2", borderColor: "#F1ECE2" },
  amenText: { fontFamily: fonts.serif, fontSize: 20, color: "#F1ECE2" },
  footer: { fontFamily: fonts.body, fontSize: 12, color: "#8F97AB" },
});
