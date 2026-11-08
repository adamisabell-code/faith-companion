// The companion's world with the living buddy standing in it, plus a soft burst of
// light wherever the world just grew (a flower, a lamp, a twig, a new star).
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import { LivingBuddy, type BuddyHandle } from "./LivingBuddy";
import { companionBox, growthPoint, Scene, SCENE_HEIGHT, type SceneProps } from "./Scene";
import { haptic, nativeDriver, useReduceMotion } from "@/lib/motion";

export type StageHandle = {
  /** Kept today's commitment: the world grows and the buddy celebrates. */
  kept: (newKeptTotal: number) => void;
  /** A prayer was answered: a star rises (Lumi) and the buddy celebrates. */
  answered: (newAnswered: number) => void;
  /** The Amen bow, played on the home buddy after praying. */
  celebrate: () => void;
};

type Burst = { key: number; x: number; y: number; color: string };

export const SceneStage = forwardRef<StageHandle, Omit<SceneProps, "hideCompanion"> & { dark: boolean }>(function SceneStage(props, ref) {
  const { id, period, stage, keptTotal, answered } = props;
  const reduce = useReduceMotion();
  const buddy = useRef<BuddyHandle>(null);
  const [width, setWidth] = useState(390);
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Same math as the SVG's preserveAspectRatio="xMidYMax slice".
  const k = Math.max(width / 390, SCENE_HEIGHT / 260);
  const offX = (width - 390 * k) / 2;
  const offY = SCENE_HEIGHT - 260 * k;
  const toScreen = (x: number, y: number) => ({ x: offX + x * k, y: offY + y * k });

  const box = companionBox[id];
  const pos = toScreen(box.x, box.y);
  const size = box.size * k;

  const burstAt = useCallback((p: { x: number; y: number } | null, color: string) => {
    if (!p || reduce) return;
    const s = { x: offX + p.x * k, y: offY + p.y * k };
    const b = { key: Date.now() + Math.random(), x: s.x, y: s.y, color };
    setBursts((list) => [...list, b]);
    setTimeout(() => setBursts((list) => list.filter((x) => x.key !== b.key)), 1800);
  }, [reduce, offX, offY, k]);

  useImperativeHandle(ref, () => ({
    kept: (n) => {
      haptic.success();
      buddy.current?.celebrate();
      if (id !== "lumi") burstAt(growthPoint(id, n, answered), id === "bram" ? "#F4CF84" : id === "pip" ? "#F6E6B0" : "#E9D8B8");
    },
    answered: (n) => {
      haptic.success();
      buddy.current?.celebrate();
      if (id === "lumi") burstAt(growthPoint(id, keptTotal, n), "#F2DFA8");
    },
    celebrate: () => buddy.current?.celebrate(),
  }), [id, answered, keptTotal, burstAt]);

  return (
    <View style={{ height: SCENE_HEIGHT, width: "100%", overflow: "hidden" }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Scene {...props} hideCompanion />
      <View pointerEvents="box-none" style={{ position: "absolute", left: pos.x, top: pos.y }}>
        <LivingBuddy ref={buddy} id={id} size={size} period={period} stage={stage} dark={props.dark} />
      </View>
      {bursts.map((b) => <GlowBurst key={b.key} x={b.x} y={b.y} color={b.color} scale={k} />)}
    </View>
  );
});

function GlowBurst({ x, y, color, scale }: { x: number; y: number; color: string; scale: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }
  const ring = 46 * scale;
  const opacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.75, 0] });
  const grow = v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] });
  const motes = [-1, -0.5, 0, 0.5, 1];
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y }}>
      <Animated.View style={{ position: "absolute", left: -ring / 2, top: -ring / 2, width: ring, height: ring, borderRadius: ring / 2, backgroundColor: color, opacity, transform: [{ scale: grow }] }} />
      <Animated.View style={{ position: "absolute", left: -ring / 4, top: -ring / 4, width: ring / 2, height: ring / 2, borderRadius: ring / 4, backgroundColor: "#FFFFFF", opacity: v.interpolate({ inputRange: [0, 0.1, 0.6], outputRange: [0, 0.6, 0] }) }} />
      {motes.map((m, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute", left: -2, top: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, m * 22 * scale] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, (-26 - (i % 2) * 10) * scale] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
