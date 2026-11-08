// The companion, alive: breathes, blinks, sways, gets sleepy at night, stretches on a
// morning visit, and reacts to taps in its own way. Keep tapping and it says something.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Character, type Eyes } from "./Character";
import { haptic, nativeDriver, sleep, useReduceMotion } from "@/lib/motion";
import { fonts, type CompanionId } from "@/lib/theme";
import type { Period } from "@/lib/timeOfDay";

export type BuddyHandle = {
  /** A small in-character reaction (used for taps). */
  react: () => void;
  /** Delight: kept a commitment, answered prayer, said Amen. */
  celebrate: () => void;
  /** The Amen bow: eyes closed, a gentle dip, then up with a smile. */
  bow: () => Promise<void>;
};

type Props = {
  id: CompanionId;
  size: number;
  period: Period;
  stage?: 0 | 1 | 2 | 3;
  /** Eyes stay closed (praying). */
  praying?: boolean;
  /** Breathing pace in ms per breath; the prayer screen slows it down. */
  breathMs?: number;
  /** Turn off tap reactions (e.g. on the prayer screen). */
  interactive?: boolean;
  /** Bubble text color/background for the easter-egg lines. */
  dark?: boolean;
};

const lines: Record<CompanionId, string[]> = {
  pip: ["Hehe. That tickles my leaves.", "Careful, I'm still sprouting.", "Small, but I'm trying.", "Okay, okay. I'm awake!"],
  bram: ["I'm a donkey, not a button.", "Still here. Still a donkey.", "You know I can talk, right? Ask me something.", "Balaam never patted me like this."],
  sola: ["Hi. I see you too.", "Hop. Hop.", "I'm right here.", "You're doing better than you think."],
  lumi: ["Baa. I mean, hello.", "So soft, right?", "You found me.", "Stay a minute."],
};

let stretchedThisSession = false;

export const LivingBuddy = forwardRef<BuddyHandle, Props>(function LivingBuddy(
  { id, size, period, stage, praying = false, breathMs, interactive = true, dark = false },
  ref,
) {
  const reduce = useReduceMotion();
  const [eyes, setEyes] = useState<Eyes>(praying ? "closed" : "open");
  const [bubble, setBubble] = useState<string | null>(null);
  const happyUntil = useRef(0);
  const taps = useRef(0);
  const lineIndex = useRef(0);
  const busy = useRef(false);

  // Animated layers: breath (idle), sway (idle), and action (reactions).
  const breath = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;      // translateY in px (negative = up)
  const squashY = useRef(new Animated.Value(1)).current;
  const squashX = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;     // degrees
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  const night = period === "night";
  const pace = breathMs ?? (night ? 4600 : 3400);

  // Idle breathing + sway.
  useEffect(() => {
    if (reduce) { breath.setValue(0); sway.setValue(0); return; }
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: pace * 0.45, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      Animated.timing(breath, { toValue: 0, duration: pace * 0.55, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
    ]));
    const s = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      Animated.timing(sway, { toValue: -1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
    ]));
    b.start();
    if (!praying) s.start();
    return () => { b.stop(); s.stop(); };
  }, [reduce, pace, praying, breath, sway]);

  // Eyes: closed while praying; otherwise blink now and then (slower, longer at night).
  useEffect(() => {
    if (praying) { setEyes("closed"); return; }
    if (Date.now() > happyUntil.current) setEyes("open"); // don't interrupt a bow or a smile
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = night ? 3500 + Math.random() * 4500 : 2400 + Math.random() * 3600;
      timer = setTimeout(async () => {
        if (!alive) return;
        if (Date.now() > happyUntil.current) {
          setEyes("closed");
          await sleep(night ? 320 : 130);
          if (!alive) return;
          if (Date.now() > happyUntil.current) setEyes("open");
          if (!night && Math.random() < 0.2) { // the occasional double blink
            await sleep(140);
            if (alive && Date.now() > happyUntil.current) setEyes("closed");
            await sleep(120);
            if (alive && Date.now() > happyUntil.current) setEyes("open");
          }
        }
        schedule();
      }, wait);
    };
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, [praying, night]);

  const happy = useCallback((ms: number) => {
    happyUntil.current = Date.now() + ms;
    setEyes("happy");
    setTimeout(() => { if (Date.now() >= happyUntil.current && !praying) setEyes("open"); }, ms + 10);
  }, [praying]);

  const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.quad)) =>
    Animated.timing(v, { toValue, duration, easing, useNativeDriver: nativeDriver });
  const settle = () => Animated.parallel([
    Animated.spring(hop, { toValue: 0, friction: 5, tension: 140, useNativeDriver: nativeDriver }),
    Animated.spring(squashY, { toValue: 1, friction: 4, tension: 160, useNativeDriver: nativeDriver }),
    Animated.spring(squashX, { toValue: 1, friction: 4, tension: 160, useNativeDriver: nativeDriver }),
    Animated.spring(tilt, { toValue: 0, friction: 5, tension: 120, useNativeDriver: nativeDriver }),
  ]);
  const unit = size / 130; // motions are tuned for a 130px buddy

  const reaction = useCallback((): Animated.CompositeAnimation => {
    if (id === "pip") {
      return Animated.sequence([
        Animated.parallel([t(squashY, 0.86, 90), t(squashX, 1.1, 90)]),
        Animated.parallel([t(hop, -16 * unit, 170), t(squashY, 1.1, 170), t(squashX, 0.94, 170)]),
        Animated.parallel([t(hop, 0, 150, Easing.in(Easing.quad)), t(squashY, 0.92, 150), t(squashX, 1.05, 150)]),
        settle(),
      ]);
    }
    if (id === "bram") { // the unimpressed double-take
      return Animated.sequence([t(tilt, 8, 90), t(tilt, -6, 120), t(tilt, 3, 110), settle()]);
    }
    if (id === "sola") { // two quick sparrow hops
      return Animated.sequence([
        t(hop, -11 * unit, 110), t(hop, 0, 100, Easing.in(Easing.quad)),
        t(hop, -7 * unit, 100), t(hop, 0, 95, Easing.in(Easing.quad)),
        settle(),
      ]);
    }
    return Animated.sequence([ // Lumi's happy wool-puff
      Animated.parallel([t(squashX, 1.08, 220), t(squashY, 1.06, 220)]),
      settle(),
    ]);
  }, [id, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const react = useCallback(() => {
    if (busy.current) return;
    if (id !== "bram") happy(900);
    if (reduce) return;
    busy.current = true;
    reaction().start(() => { busy.current = false; });
  }, [id, happy, reduce, reaction]);

  const celebrate = useCallback(() => {
    happy(1800);
    if (reduce) return;
    busy.current = true;
    Animated.sequence([reaction(), Animated.delay(60), reaction()]).start(() => { busy.current = false; });
  }, [happy, reduce, reaction]);

  const bow = useCallback(async () => {
    setEyes("closed");
    happyUntil.current = Date.now() + 2600;
    if (!reduce) {
      await new Promise<void>((done) => Animated.sequence([
        Animated.parallel([t(hop, 7 * unit, 520, Easing.inOut(Easing.sin)), t(squashY, 0.93, 520, Easing.inOut(Easing.sin)), t(tilt, id === "sola" ? 10 : 0, 520)]),
        Animated.delay(450),
        Animated.parallel([t(hop, 0, 480, Easing.inOut(Easing.sin)), t(squashY, 1, 480, Easing.inOut(Easing.sin)), t(tilt, 0, 480)]),
      ]).start(() => done()));
    } else {
      await sleep(900);
    }
    happy(1600);
  }, [reduce, unit, id, happy]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ react, celebrate, bow }), [react, celebrate, bow]);

  // A little stretch the first time you visit in the morning.
  useEffect(() => {
    if (period !== "morning" || stretchedThisSession || reduce || praying) return;
    stretchedThisSession = true;
    const timer = setTimeout(() => {
      happy(1200);
      Animated.sequence([
        Animated.parallel([t(squashY, 1.12, 420, Easing.out(Easing.sin)), t(squashX, 0.93, 420, Easing.out(Easing.sin))]),
        Animated.delay(220),
        settle(),
      ]).start();
    }, 700);
    return () => clearTimeout(timer);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onTap() {
    haptic.tap();
    react();
    taps.current += 1;
    if (taps.current % 4 === 0) {
      const all = lines[id];
      const line = all[lineIndex.current % all.length];
      lineIndex.current += 1;
      setBubble(line);
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 180, useNativeDriver: nativeDriver }).start();
      await sleep(2600);
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 260, useNativeDriver: nativeDriver }).start(() => setBubble(null));
    }
  }

  const breathY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, praying ? 1.05 : 1.028] });
  const breathX = breath.interpolate({ inputRange: [0, 1], outputRange: [1, praying ? 1.02 : 0.99] });
  const swayDeg = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-1.6deg", "1.6deg"] });
  const tiltDeg = tilt.interpolate({ inputRange: [-30, 30], outputRange: ["-30deg", "30deg"] });

  const body = (
    <Animated.View
      style={{
        width: size, height: size,
        transformOrigin: "bottom",
        transform: [
          { translateY: hop },
          { rotate: swayDeg },
          { rotate: tiltDeg },
          { scaleX: Animated.multiply(breathX, squashX) },
          { scaleY: Animated.multiply(breathY, squashY) },
        ],
      }}
    >
      <Character id={id} size={size} stage={id === "pip" ? stage : undefined} eyes={eyes} />
    </Animated.View>
  );

  return (
    <View style={{ width: size, height: size }} pointerEvents="box-none">
      {bubble ? (
        <Animated.View pointerEvents="none" style={[st.bubbleWrap, { bottom: size * 0.98, opacity: bubbleOpacity }]}>
          <View style={[st.bubble, dark && st.bubbleDark]}>
            <Text style={[st.bubbleText, dark && { color: "#F1ECE2" }]}>{bubble}</Text>
          </View>
        </Animated.View>
      ) : null}
      {interactive ? (
        <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel={`Your companion. Tap to say hi.`} hitSlop={8}>
          {body}
        </Pressable>
      ) : body}
    </View>
  );
});

const st = StyleSheet.create({
  bubbleWrap: { position: "absolute", left: -60, right: -60, alignItems: "center" },
  bubble: {
    backgroundColor: "#FFFDF9", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 240,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  bubbleDark: { backgroundColor: "#26304A" },
  bubbleText: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: "#23211D", textAlign: "center" },
});
