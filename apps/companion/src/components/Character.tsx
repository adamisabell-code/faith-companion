// The four companions, drawn as SVG so they look identical on web, iOS and Android.
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { CompanionId } from "@/lib/theme";

/** open = normal; closed = praying / sleepy / mid-blink; happy = delighted (^ ^). */
export type Eyes = "open" | "closed" | "happy";

function Arc({ d, color, w = 3.5 }: { d: string; color: string; w?: number }) {
  return <Path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;
}

/**
 * `stage` shows growth with the user's streak (0 new → 3 at 30 days).
 * Pip literally grows (more leaves, then a flower); the others collect sparkles
 * and, at 30 days, a little crown (James 1:12, "the crown of life").
 */
export function Character({ id, size = 96, stage, eyes = "open" }: { id: CompanionId; size?: number; stage?: 0 | 1 | 2 | 3; eyes?: Eyes }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {id === "pip" && <Pip stage={stage ?? 1} eyes={eyes} />}
      {id === "bram" && <Bram eyes={eyes} />}
      {id === "sola" && <Sola eyes={eyes} />}
      {id === "lumi" && <Lumi eyes={eyes} />}
      {id !== "pip" && stage !== undefined && stage >= 1 && <Sparkle x={160} y={46} r={9} />}
      {id !== "pip" && stage !== undefined && stage >= 2 && <Sparkle x={40} y={70} r={7} />}
      {id !== "pip" && stage !== undefined && stage >= 3 && <Crown y={id === "bram" ? 40 : id === "sola" ? 52 : 44} />}
    </Svg>
  );
}

/** Just the companion's drawing, for placing inside a larger SVG scene. */
export function CompanionArt({ id, stage = 1, eyes = "open" }: { id: CompanionId; stage?: 0 | 1 | 2 | 3; eyes?: Eyes }) {
  if (id === "pip") return <Pip stage={stage} eyes={eyes} />;
  if (id === "bram") return <Bram eyes={eyes} />;
  if (id === "sola") return <Sola eyes={eyes} />;
  return <Lumi eyes={eyes} />;
}

function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  return <Path d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill="#E8B83A" />;
}

function Crown({ y }: { y: number }) {
  return (
    <G>
      <Path d={`M80 ${y + 16} L82 ${y} L92 ${y + 9} L100 ${y - 4} L108 ${y + 9} L118 ${y} L120 ${y + 16} Z`} fill="#E8B83A" stroke="#C99A22" strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={100} cy={y + 10} r={2.5} fill="#FFFFFF" />
    </G>
  );
}

function Pip({ stage, eyes }: { stage: 0 | 1 | 2 | 3; eyes: Eyes }) {
  return (
    <G>
      {stage === 0 ? (
        <>
          <Path d="M100 72 C100 66 100 62 100 58" stroke="#4E8A3E" strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M100 60 C 92 50 82 52 80 57 C 86 63 94 63 100 60 Z" fill="#6BAA4F" />
          <Path d="M100 58 C 108 47 120 48 123 54 C 117 62 107 63 100 58 Z" fill="#7DBE5C" />
        </>
      ) : (
        <>
          <Path d={stage >= 2 ? "M100 72 C100 56 100 40 100 26" : "M100 72 C100 60 100 52 100 44"} stroke="#4E8A3E" strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M100 50 C 82 32 62 36 58 46 C 70 58 88 58 100 50 Z" fill="#6BAA4F" />
          <Path d="M100 46 C 116 24 140 26 146 36 C 134 52 114 54 100 46 Z" fill="#7DBE5C" />
          {stage >= 2 ? <Path d="M100 30 C 90 16 76 16 72 24 C 80 34 92 34 100 30 Z" fill="#5E9F45" /> : null}
          {stage >= 3 ? (
            <G>
              {[0, 72, 144, 216, 288].map((a) => {
                const rad = (a * Math.PI) / 180;
                return <Circle key={a} cx={100 + Math.cos(rad) * 8} cy={18 + Math.sin(rad) * 8} r={6} fill="#FFFFFF" stroke="#F0D9A8" strokeWidth={1.5} />;
              })}
              <Circle cx={100} cy={18} r={5} fill="#E8B83A" />
            </G>
          ) : null}
        </>
      )}
      <Path d="M100 70 C 60 70 52 120 64 148 C 76 176 124 176 136 148 C 148 120 140 70 100 70 Z" fill="#E0AE4A" />
      <Ellipse cx={78} cy={134} rx={8} ry={4.5} fill="#EE9A82" opacity={0.6} />
      <Ellipse cx={122} cy={134} rx={8} ry={4.5} fill="#EE9A82" opacity={0.6} />
      {eyes === "open" ? (
        <>
          <Circle cx={86} cy={118} r={6.5} fill="#2A2320" />
          <Circle cx={88} cy={116} r={2} fill="#FFFFFF" />
          <Circle cx={114} cy={118} r={6.5} fill="#2A2320" />
          <Circle cx={116} cy={116} r={2} fill="#FFFFFF" />
        </>
      ) : eyes === "closed" ? (
        <>
          <Arc d="M80 119 Q86 123 92 119" color="#2A2320" />
          <Arc d="M108 119 Q114 123 120 119" color="#2A2320" />
        </>
      ) : (
        <>
          <Arc d="M80 121 Q86 113 92 121" color="#2A2320" />
          <Arc d="M108 121 Q114 113 120 121" color="#2A2320" />
        </>
      )}
      <Path d="M92 134 Q100 143 108 134" stroke="#2A2320" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Bram({ eyes }: { eyes: Eyes }) {
  return (
    <G>
      <Path d="M70 82 C 58 42 64 20 74 22 C 86 26 90 56 86 86 Z" fill="#9C97A6" />
      <Path d="M74 76 C 66 46 70 32 75 32 C 81 36 83 58 81 78 Z" fill="#E6B8C2" />
      <Path d="M130 82 C 142 42 136 20 126 22 C 114 26 110 56 114 86 Z" fill="#9C97A6" />
      <Path d="M126 76 C 134 46 130 32 125 32 C 119 36 117 58 119 78 Z" fill="#E6B8C2" />
      <Ellipse cx={100} cy={114} rx={44} ry={46} fill="#ABA6B6" />
      <Path d="M86 74 C 90 58 100 60 100 70 C 102 58 114 60 114 74 C 106 70 94 70 86 74 Z" fill="#5E5868" />
      <Ellipse cx={100} cy={148} rx={32} ry={24} fill="#E4DED6" />
      <Ellipse cx={90} cy={146} rx={3} ry={4.5} fill="#6B6474" />
      <Ellipse cx={110} cy={146} rx={3} ry={4.5} fill="#6B6474" />
      {eyes === "open" ? (
        <>
          <Circle cx={82} cy={112} r={6.5} fill="#2A2320" />
          <Circle cx={118} cy={112} r={6.5} fill="#2A2320" />
        </>
      ) : eyes === "closed" ? (
        <>
          <Arc d="M76 113 Q82 117 88 113" color="#2A2320" />
          <Arc d="M112 113 Q118 117 124 113" color="#2A2320" />
        </>
      ) : (
        <>
          <Arc d="M76 115 Q82 108 88 115" color="#2A2320" />
          <Arc d="M112 115 Q118 108 124 115" color="#2A2320" />
        </>
      )}
      <Path d="M73 109 L91 106" stroke="#5E5868" strokeWidth={5} strokeLinecap="round" />
      <Path d="M109 106 L127 109" stroke="#5E5868" strokeWidth={5} strokeLinecap="round" />
      <Path d="M90 161 Q102 166 113 157" stroke="#5E5868" strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Sola({ eyes }: { eyes: Eyes }) {
  return (
    <G>
      <Path d="M56 122 L28 108 L36 132 Z" fill="#7A5236" />
      <Path d="M92 160 L90 176 M112 160 L114 176" stroke="#E2A33C" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={100} cy={118} rx={52} ry={46} fill="#A9774E" />
      <Ellipse cx={108} cy={134} rx={34} ry={28} fill="#F1E1C8" />
      <Path d="M62 102 C 70 70 130 70 140 98 C 120 88 82 88 62 102 Z" fill="#7A5236" />
      <Path d="M64 112 C 80 104 100 112 98 134 C 86 142 70 134 64 112 Z" fill="#8A5F3E" />
      <Path d="M148 108 L166 115 L148 122 Z" fill="#E2A33C" />
      <Ellipse cx={132} cy={124} rx={7} ry={4} fill="#EE9A82" opacity={0.6} />
      {eyes === "open" ? (
        <>
          <Circle cx={128} cy={106} r={6.5} fill="#2A2320" />
          <Circle cx={130} cy={104} r={2} fill="#FFFFFF" />
        </>
      ) : eyes === "closed" ? (
        <Arc d="M122 106 Q128 110 134 106" color="#2A2320" />
      ) : (
        <Arc d="M122 108 Q128 101 134 108" color="#2A2320" />
      )}
    </G>
  );
}

function Lumi({ eyes }: { eyes: Eyes }) {
  const wool: [number, number, number][] = [[100, 90, 26], [70, 104, 24], [130, 104, 24], [62, 134, 22], [138, 134, 22], [84, 156, 24], [116, 156, 24]];
  return (
    <G>
      {wool.map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#FFFFFF" stroke="#C9D6E2" strokeWidth={2} />)}
      <Circle cx={100} cy={128} r={40} fill="#FFFFFF" />
      <Ellipse cx={68} cy={112} rx={15} ry={7} fill="#4A4250" rotation={-22} origin="68, 112" />
      <Ellipse cx={132} cy={112} rx={15} ry={7} fill="#4A4250" rotation={22} origin="132, 112" />
      <Ellipse cx={100} cy={124} rx={26} ry={30} fill="#4A4250" />
      <Circle cx={89} cy={98} r={10} fill="#FFFFFF" />
      <Circle cx={100} cy={94} r={11} fill="#FFFFFF" />
      <Circle cx={111} cy={98} r={10} fill="#FFFFFF" />
      {eyes === "closed" ? (
        <>
          <Arc d="M86 118 Q91 123 96 118" color="#FFFFFF" w={3} />
          <Arc d="M104 118 Q109 123 114 118" color="#FFFFFF" w={3} />
        </>
      ) : eyes === "happy" ? (
        <>
          <Arc d="M86 122 Q91 112 96 122" color="#FFFFFF" w={3} />
          <Arc d="M104 122 Q109 112 114 122" color="#FFFFFF" w={3} />
        </>
      ) : (
        <>
          <Arc d="M86 121 Q91 115 96 121" color="#FFFFFF" w={3} />
          <Arc d="M104 121 Q109 115 114 121" color="#FFFFFF" w={3} />
        </>
      )}
      <Ellipse cx={84} cy={133} rx={5} ry={3} fill="#F2A3B3" opacity={0.8} />
      <Ellipse cx={116} cy={133} rx={5} ry={3} fill="#F2A3B3" opacity={0.8} />
      <Path d="M95 139 Q100 144 105 139" stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}
