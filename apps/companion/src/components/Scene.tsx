// Each companion's world, drawn as a quiet landscape that changes with the time of day
// and fills in as the user keeps their word:
//   Pip  – a garden bed, one flower per kept day (last 14 days)
//   Bram – a road lined with lamps, one lit per kept day
//   Sola – a nest, one twig per kept day
//   Lumi – the night sky, one star per answered prayer
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { CompanionArt } from "./Character";
import type { DaySlot } from "@/lib/progress";
import { fonts, type CompanionId } from "@/lib/theme";
import type { Period } from "@/lib/timeOfDay";

export const SCENE_HEIGHT = 260;

type Palette = { sky: string; far: string; mid: string; ground: string; caption: string; celestial: string };

const day: Record<CompanionId, Palette> = {
  pip: { sky: "#EFE4D2", far: "#CBD2B6", mid: "#AEBB93", ground: "#9DAE82", caption: "#26311D", celestial: "#F1CFA0" },
  bram: { sky: "#ECE1CD", far: "#D7C8A6", mid: "#C4B086", ground: "#C4B086", caption: "#3E3420", celestial: "#F0C98E" },
  sola: { sky: "#DFE6E8", far: "#C9D3D5", mid: "#B3C2C3", ground: "#A2B4B3", caption: "#24302F", celestial: "#F2EEE4" },
  lumi: { sky: "#DDE1EC", far: "#C5CBDB", mid: "#AEB8CC", ground: "#9DA9C0", caption: "#1F2840", celestial: "#F3EEE2" },
};
const night: Palette = { sky: "#1B2440", far: "#232D4B", mid: "#2B3758", ground: "#34446A", caption: "#C9CFDD", celestial: "#EFE3C2" };

export function skyColor(id: CompanionId, period: Period) {
  return period === "night" ? night.sky : day[id].sky;
}

const hills: Record<CompanionId, { far: string; mid: string; ground: string }> = {
  pip: {
    far: "M0 92 C 80 62 160 72 230 88 C 300 104 350 82 390 72 L390 260 L0 260 Z",
    mid: "M0 132 C 90 108 200 122 280 136 C 330 144 370 132 390 128 L390 260 L0 260 Z",
    ground: "M0 170 C 120 160 260 162 390 172 L390 260 L0 260 Z",
  },
  bram: {
    far: "M0 100 C 100 78 200 92 290 84 C 340 80 370 86 390 90 L390 260 L0 260 Z",
    mid: "M0 140 C 120 128 260 132 390 146 L390 260 L0 260 Z",
    ground: "M0 140 C 120 128 260 132 390 146 L390 260 L0 260 Z",
  },
  sola: {
    far: "M0 72 C 70 56 130 66 200 60 C 270 54 330 66 390 60 L390 260 L0 260 Z",
    mid: "M0 130 C 100 116 220 124 300 118 C 340 115 370 120 390 124 L390 260 L0 260 Z",
    ground: "M0 176 C 120 166 270 168 390 180 L390 260 L0 260 Z",
  },
  lumi: {
    far: "M0 110 C 90 88 190 100 270 94 C 330 90 366 98 390 104 L390 260 L0 260 Z",
    mid: "M0 146 C 110 132 250 138 390 150 L390 260 L0 260 Z",
    ground: "M0 174 C 130 166 270 168 390 178 L390 260 L0 260 Z",
  },
};

const ambientStars: [number, number, number][] = [
  [30, 14, 1], [96, 8, 1.2], [170, 22, 0.9], [352, 10, 1.1], [20, 70, 1], [372, 84, 1],
  [56, 52, 1.1], [120, 36, 0.9], [236, 18, 1], [286, 62, 1.2], [140, 78, 0.8], [210, 70, 0.9],
];

const answeredStars: [number, number][] = [
  [70, 72], [150, 44], [214, 92], [258, 36], [110, 98], [40, 30], [190, 20], [300, 86], [360, 70], [20, 88],
  [130, 16], [236, 60], [84, 46], [176, 74], [286, 14], [346, 100], [56, 100], [206, 40], [120, 64], [160, 96],
];

function sparklePath(x: number, y: number, r: number) {
  return `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
}

export type SceneProps = {
  id: CompanionId;
  period: Period;
  stage: 0 | 1 | 2 | 3;
  keptTotal: number;      // all-time kept days (Bram's lamps, Sola's twigs)
  answered: number;       // answered prayers (Lumi's stars)
  last14: DaySlot[];      // oldest → today (Pip's garden)
  /** Leave the companion out (it's drawn alive on top by SceneStage). */
  hideCompanion?: boolean;
};

/** Where each companion stands in the 390×260 scene: top-left corner and drawn size. */
export const companionBox: Record<CompanionId, { x: number; y: number; size: number }> = {
  pip: { x: 130, y: 40, size: 130 },
  bram: { x: 135, y: 34, size: 130 },
  sola: { x: 111, y: 23, size: 110 },
  lumi: { x: 130, y: 52, size: 130 },
};

/** Scene position of the newest growth (today's flower, latest lamp, the nest, newest star). */
export function growthPoint(id: CompanionId, keptTotal: number, answered: number): { x: number; y: number } | null {
  if (id === "pip") return { x: 352, y: 188 };
  if (id === "bram") {
    if (keptTotal < 1) return null;
    const [x, y, s] = lamps[Math.min(keptTotal, lamps.length) - 1];
    return { x, y: y - 39 * s };
  }
  if (id === "sola") return { x: 250, y: 114 };
  if (answered < 1) return null;
  const [x, y] = answeredStars[Math.min(answered, answeredStars.length) - 1];
  return { x, y };
}

export function Scene(props: SceneProps) {
  const { id, period } = props;
  const isNight = period === "night";
  const pal = isNight ? night : day[id];
  const h = hills[id];
  const caption = captionFor(props);
  const label = caption;

  return (
    <Svg width="100%" height={SCENE_HEIGHT} viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" accessibilityLabel={label} accessibilityRole="image">
      <Rect x={0} y={0} width={390} height={260} fill={pal.sky} />

      {isNight ? (
        <G>
          {ambientStars.map(([x, y, r]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#E8E6F0" opacity={0.5} />)}
          <Circle cx={326} cy={40} r={16} fill={pal.celestial} />
          <Circle cx={334} cy={34} r={15} fill={pal.sky} />
        </G>
      ) : period === "morning" ? (
        <Circle cx={304} cy={54} r={40} fill={pal.celestial} />
      ) : (
        <Circle cx={84} cy={34} r={32} fill={pal.celestial} />
      )}

      {id === "lumi" ? <LumiStars count={props.answered} night={isNight} /> : null}

      <Path d={h.far} fill={pal.far} />
      <Path d={h.mid} fill={pal.mid} />
      <Path d={h.ground} fill={pal.ground} />

      {id === "pip" ? <PipGarden {...props} night={isNight} /> : null}
      {id === "bram" ? <BramRoad {...props} night={isNight} /> : null}
      {id === "sola" ? <SolaNest {...props} night={isNight} /> : null}
      {id === "lumi" ? <LumiPasture night={isNight} hideCompanion={props.hideCompanion} /> : null}

      <SvgText x={195} y={246} textAnchor="middle" fontFamily={fonts.body} fontSize={11.5} fill={pal.caption}>{caption}</SvgText>
    </Svg>
  );
}

function captionFor({ id, keptTotal, answered }: SceneProps) {
  if (id === "pip") return "Each flower is a day you kept your word.";
  if (id === "bram") {
    if (keptTotal === 0) return "Each lamp is a day you kept your word. The first lights today.";
    if (keptTotal > 8) return `${keptTotal} days kept. The whole road is lit.`;
    return "Each lamp is a day you kept your word.";
  }
  if (id === "sola") return "Every twig in the nest is a day you kept your word.";
  return answered === 0 ? "Each answered prayer becomes a star here." : "Each star is a prayer God answered.";
}

// ---------- Pip ----------

const flowerColors = ["#F4EEE2", "#E7B9A0", "#E9CF8A"];

function PipGarden({ last14, stage, night, hideCompanion }: SceneProps & { night: boolean }) {
  return (
    <G>
      <Rect x={22} y={200} width={346} height={24} rx={12} fill={night ? "#3A3240" : "#6E5643"} />
      {last14.map((d, i) => {
        const x = 40 + i * 24;
        const hy = 186 + ((i % 3) - 1);
        if (d.state === "kept") {
          return (
            <G key={d.date}>
              <Line x1={x} y1={204} x2={x} y2={hy + 2} stroke={night ? "#6F8B6A" : "#4E6A3A"} strokeWidth={2} strokeLinecap="round" />
              <Circle cx={x} cy={hy} r={4.5} fill={flowerColors[i % 3]} />
              <Circle cx={x} cy={hy} r={1.6} fill="#C9A23F" />
            </G>
          );
        }
        if (d.state === "open") return <Circle key={d.date} cx={x} cy={207} r={6} fill="none" stroke="#B9A48F" strokeWidth={1.5} strokeDasharray="3 3" />;
        if (d.state === "missed") return <Circle key={d.date} cx={x} cy={207} r={2} fill="#8C7360" />;
        return null;
      })}
      <Ellipse cx={195} cy={158} rx={34} ry={5} fill="#000000" opacity={0.12} />
      {hideCompanion ? null : <G transform="translate(130 40) scale(0.65)"><CompanionArt id="pip" stage={stage} /></G>}
    </G>
  );
}

// ---------- Bram ----------

// Nearest first; lit in this order.
const lamps: [number, number, number][] = [
  [126, 228, 1], [298, 228, 1], [155, 196, 0.75], [258, 196, 0.75],
  [173, 170, 0.55], [230, 170, 0.55], [186, 152, 0.4], [214, 152, 0.4],
];

function Lamp({ x, y, s, lit, night }: { x: number; y: number; s: number; lit: boolean; night: boolean }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      {lit ? <Circle cx={0} cy={-39} r={16} fill="#F4CF84" opacity={night ? 0.25 : 0.2} /> : null}
      <Line x1={0} y1={0} x2={0} y2={-34} stroke="#4A3B2E" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M-8 -46 L0 -53 L8 -46 Z" fill="#3A2F28" />
      <Rect x={-6} y={-46} width={12} height={13} rx={2} fill="#3A2F28" />
      <Rect x={-4} y={-44} width={8} height={9} rx={1} fill={lit ? "#F4CF84" : night ? "#5E6684" : "#D9CCB3"} />
    </G>
  );
}

function BramRoad({ keptTotal, night, hideCompanion }: SceneProps & { night: boolean }) {
  const lit = Math.min(keptTotal, lamps.length);
  return (
    <G>
      <Path d="M140 260 C 170 220 188 178 195 140 L205 140 C 216 178 252 220 310 260 Z" fill={night ? "#45557C" : "#E3D1B0"} />
      {[...lamps].map((l, i) => ({ l, i })).reverse().filter(({ i }) => i >= 6).map(({ l, i }) => <Lamp key={i} x={l[0]} y={l[1]} s={l[2]} lit={i < lit} night={night} />)}
      <Ellipse cx={200} cy={146} rx={38} ry={5} fill="#000000" opacity={0.12} />
      {hideCompanion ? null : <G transform="translate(135 34) scale(0.65)"><CompanionArt id="bram" /></G>}
      {[...lamps].map((l, i) => ({ l, i })).reverse().filter(({ i }) => i < 6).map(({ l, i }) => <Lamp key={i} x={l[0]} y={l[1]} s={l[2]} lit={i < lit} night={night} />)}
    </G>
  );
}

// ---------- Sola ----------

const twigs: [number, number, number, number][] = [
  [218, 110, 282, 104], [222, 116, 276, 110], [226, 121, 273, 115], [231, 126, 268, 121],
  [236, 130, 262, 127], [212, 107, 234, 113], [266, 102, 288, 100], [242, 133, 258, 132],
  [224, 103, 246, 108], [250, 106, 278, 101], [229, 113, 256, 118], [247, 120, 270, 114],
  [214, 112, 240, 118], [258, 124, 280, 108], [220, 106, 262, 112], [238, 128, 272, 118],
];

function SolaNest({ keptTotal, night, hideCompanion }: SceneProps & { night: boolean }) {
  const n = Math.min(keptTotal, twigs.length);
  const leafA = night ? "#5C7468" : "#8FA48A";
  const leafB = night ? "#52695E" : "#7E967A";
  return (
    <G>
      <Path d="M0 146 C 90 134 200 124 300 110 C 330 106 360 104 390 100 L390 108 C 360 112 330 114 300 118 C 200 132 90 144 0 156 Z" fill="#6B5444" />
      <Path d="M300 114 C 316 96 330 88 352 82" fill="none" stroke="#6B5444" strokeWidth={4} strokeLinecap="round" />
      <Path d="M90 140 C 100 126 112 120 126 118" fill="none" stroke="#6B5444" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={350} cy={76} rx={12} ry={5} fill={leafA} transform="rotate(-24 350 76)" />
      <Ellipse cx={364} cy={88} rx={11} ry={4.5} fill={leafA} transform="rotate(14 364 88)" />
      <Ellipse cx={126} cy={112} rx={11} ry={4.5} fill={leafA} transform="rotate(-30 126 112)" />
      <Ellipse cx={40} cy={136} rx={10} ry={4} fill={leafA} transform="rotate(-12 40 136)" />
      <Ellipse cx={336} cy={92} rx={10} ry={4} fill={leafB} transform="rotate(30 336 92)" />
      <Ellipse cx={112} cy={124} rx={9} ry={4} fill={leafB} transform="rotate(20 112 124)" />
      <Path d="M216 110 Q250 146 284 104 Z" fill="#7A5C42" />
      {twigs.slice(0, n).map(([x1, y1, x2, y2], i) => (
        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#A3825F" strokeWidth={2} strokeLinecap="round" />
      ))}
      <Ellipse cx={166} cy={125} rx={22} ry={3} fill="#000000" opacity={0.08} />
      {hideCompanion ? null : <G transform="translate(111 23) scale(0.55)"><CompanionArt id="sola" /></G>}
    </G>
  );
}

// ---------- Lumi ----------

function LumiStars({ count, night }: { count: number; night: boolean }) {
  return (
    <G>
      {answeredStars.slice(0, Math.min(count, answeredStars.length)).map(([x, y], i) => (
        <Path key={i} d={sparklePath(x, y, i < 5 ? 8 : 6)} fill={night ? "#F2DFA8" : "#C9A85B"} />
      ))}
    </G>
  );
}

function LumiPasture({ night, hideCompanion }: { night: boolean; hideCompanion?: boolean }) {
  return (
    <G>
      <Circle cx={276} cy={120} r={40} fill="#F4CF84" opacity={night ? 0.08 : 0.05} />
      <Circle cx={276} cy={120} r={22} fill="#F4CF84" opacity={night ? 0.14 : 0.1} />
      <Line x1={294} y1={104} x2={294} y2={178} stroke="#5A4A3A" strokeWidth={4} strokeLinecap="round" />
      <Path d="M294 106 L276 106 L276 110" fill="none" stroke="#5A4A3A" strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={267} y={110} width={18} height={22} rx={3} fill="#3A2F28" />
      <Rect x={270} y={113} width={12} height={16} rx={2} fill="#F4CF84" />
      <Ellipse cx={195} cy={162} rx={36} ry={5} fill="#000000" opacity={night ? 0.2 : 0.1} />
      {hideCompanion ? null : <G transform="translate(130 52) scale(0.65)"><CompanionArt id="lumi" /></G>}
    </G>
  );
}
