// Each companion's world, drawn as a quiet landscape that changes with the time of day
// and fills in as the user keeps their word:
//   Pip  – a garden bed, one flower per kept day; every full bed (30) grows the mustard tree
//   Bram – a road of 8 lamps; every lit stretch reaches a new place (well, grove, house, town)
//   Sola – a nest of 16 twigs; finished nests stay in the tree, new ones go higher
//   Lumi – the night sky, one star per kept day; every 7 form a constellation the user names
// Worlds never reset. See lib/chapters.ts.
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { CompanionArt } from "./Character";
import { CHAPTER_SIZE, chaptersDone, progressIn } from "@/lib/chapters";
import { fonts, type CompanionId } from "@/lib/theme";
import type { Period } from "@/lib/timeOfDay";

export const SCENE_HEIGHT = 260;

/**
 * The art is drawn in a 390×260 box. On wider screens it grows a little (up to
 * 340px tall) and the landscape simply continues out to the sides, so it never
 * zooms in or crops the companion.
 */
export function sceneLayout(width: number) {
  const height = Math.round(Math.min(340, Math.max(260, (width * 260) / 390)));
  const k = Math.min(width / 390, height / 260);
  return { height, k, offX: (width - 390 * k) / 2, offY: height - 260 * k };
}

// Continue each hill outward horizontally past the 390-wide art box.
function widen(d: string) {
  return d
    .replace(/^M0 (\d+)/, "M-3000 $1 L0 $1")
    .replace(/390 (\d+) L390 260 L0 260 Z$/, "390 $1 L3390 $1 L3390 260 L-3000 260 Z");
}

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

function sparklePath(x: number, y: number, r: number) {
  return `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
}

export type SceneProps = {
  id: CompanionId;
  period: Period;
  stage: 0 | 1 | 2 | 3;
  keptTotal: number;      // all-time kept days (Pip, Bram, Sola)
  /** Today has a commitment that isn't kept yet (Pip shows where its flower will go). */
  todayOpen?: boolean;
  /** Lumi's constellation names, by number (1 = first). */
  constellationNames?: Record<number, string>;
  /** Leave the companion out (it's drawn alive on top by SceneStage). */
  hideCompanion?: boolean;
  /** Rendered height in px (see sceneLayout). */
  height?: number;
};

/** Where each companion stands in the 390×260 scene: top-left corner and drawn size. */
export const companionBox: Record<CompanionId, { x: number; y: number; size: number }> = {
  pip: { x: 130, y: 40, size: 130 },
  bram: { x: 135, y: 34, size: 130 },
  sola: { x: 111, y: 23, size: 110 },
  lumi: { x: 130, y: 52, size: 130 },
};

/** Scene position of the newest growth (today's flower, latest lamp, the nest, newest star). */
export function growthPoint(id: CompanionId, keptTotal: number, period?: Period): { x: number; y: number } | null {
  if (id === "pip") {
    const n = progressIn(keptTotal, CHAPTER_SIZE.pip);
    return n < 1 ? null : { x: flowerX(n - 1), y: 188 };
  }
  if (id === "bram") {
    const n = progressIn(keptTotal, CHAPTER_SIZE.bram);
    if (n < 1) return null;
    const [x, y, s] = lamps[n - 1];
    return { x, y: y - 39 * s };
  }
  if (id === "sola") return { x: 250, y: 114 };
  const n = progressIn(keptTotal, CHAPTER_SIZE.lumi);
  if (n < 1) return null;
  const { origin, pattern } = currentConstellation(keptTotal, period);
  const [px, py] = patterns[pattern].points[n - 1];
  return { x: origin[0] + px, y: origin[1] + py };
}

export function Scene(props: SceneProps) {
  const pal = props.period === "night" ? night : day[props.id];
  const caption = captionFor(props);
  return (
    <Svg width="100%" height={props.height ?? SCENE_HEIGHT} viewBox="0 0 390 260" preserveAspectRatio="xMidYMax meet" accessibilityLabel={caption} accessibilityRole="image">
      <SceneArt {...props} />
      <SvgText x={195} y={246} textAnchor="middle" fontFamily={fonts.body} fontSize={11.5} fill={pal.caption}>{caption}</SvgText>
    </Svg>
  );
}

/** The world itself (sky, hills, growth, buddy) in a 390×260 box, with no caption.
 *  Used by Scene, and by the share card, which places it inside a larger picture. */
export function SceneArt(props: SceneProps) {
  const { id, period } = props;
  const isNight = period === "night";
  const pal = isNight ? night : day[id];
  const h = hills[id];

  return (
    <G>
      <Rect x={-3000} y={-1000} width={6390} height={1260} fill={pal.sky} />

      {isNight ? (
        <G>
          {[-780, -390, 0, 390, 780].flatMap((dx) => ambientStars.map(([x, y, r]) => (
            <Circle key={`${dx}-${x}-${y}`} cx={x + dx} cy={dx === 0 ? y : (y + 37) % 100} r={r} fill="#E8E6F0" opacity={0.5} />
          )))}
          <Circle cx={326} cy={40} r={16} fill={pal.celestial} />
          <Circle cx={334} cy={34} r={15} fill={pal.sky} />
        </G>
      ) : period === "morning" ? (
        <Circle cx={304} cy={54} r={40} fill={pal.celestial} />
      ) : (
        <Circle cx={84} cy={34} r={32} fill={pal.celestial} />
      )}

      {id === "lumi" ? <LumiSky kept={props.keptTotal} period={period} /> : null}

      <Path d={widen(h.far)} fill={pal.far} />
      <Path d={widen(h.mid)} fill={pal.mid} />
      <Path d={widen(h.ground)} fill={pal.ground} />

      {id === "pip" ? <PipGarden {...props} night={isNight} /> : null}
      {id === "bram" ? <BramRoad {...props} night={isNight} far={pal.far} /> : null}
      {id === "sola" ? <SolaNest {...props} night={isNight} /> : null}
      {id === "lumi" ? <LumiPasture night={isNight} hideCompanion={props.hideCompanion} /> : null}
    </G>
  );
}

function captionFor({ id, keptTotal, constellationNames }: SceneProps) {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (id === "lumi") {
    if (keptTotal === 0) return "Each star is a day you kept your word.";
    const n = progressIn(keptTotal, 7);
    const number = Math.ceil(keptTotal / 7);
    if (n === 7) {
      const name = constellationNames?.[number];
      return name ? `\u201C${name}.\u201D Seven kept days.` : "Seven kept days. A new constellation.";
    }
    return `${plural(keptTotal, "day")} kept. ${n} of 7 stars in this constellation.`;
  }
  const done = chaptersDone(keptTotal, CHAPTER_SIZE[id]);
  if (id === "pip") {
    if (done === 0) return "Each flower is a day you kept your word.";
    if (done >= 4) return `${keptTotal} days kept. Birds rest in the tree you grew.`;
    return `${keptTotal} days kept. Every full bed grows the mustard tree.`;
  }
  if (id === "bram") {
    if (keptTotal === 0) return "Each lamp is a day you kept your word. The first lights today.";
    if (done === 0) return "Each lamp is a day you kept your word. Next stop: the well.";
    if (done >= 4) return `${keptTotal} days kept. The town on the hill is lit.`;
    return `${keptTotal} days kept. Next stop: ${["the olive grove", "a house on the hill", "the town on the hill"][done - 1]}.`;
  }
  if (done === 0) return "Every twig in the nest is a day you kept your word.";
  return `${keptTotal} days kept. ${plural(done, "nest")} finished.`;
}

// ---------- Pip ----------

const flowerColors = ["#F4EEE2", "#E7B9A0", "#E9CF8A"];

const flowerX = (i: number) => 34 + i * 11.2;

function PipGarden({ keptTotal, todayOpen, stage, night, hideCompanion }: SceneProps & { night: boolean }) {
  const size = CHAPTER_SIZE.pip;
  const n = progressIn(keptTotal, size);
  const done = chaptersDone(keptTotal, size);
  return (
    <G>
      <MustardTree grown={Math.min(done, 3)} birds={done >= 4 ? Math.min(done - 2, 5) : 0} night={night} />
      <Rect x={22} y={200} width={346} height={24} rx={12} fill={night ? "#3A3240" : "#6E5643"} />
      {Array.from({ length: n }, (_, i) => {
        const x = flowerX(i);
        const hy = 188 + ((i % 3) - 1) * 2;
        return (
          <G key={i}>
            <Line x1={x} y1={204} x2={x} y2={hy + 2} stroke={night ? "#6F8B6A" : "#4E6A3A"} strokeWidth={1.6} strokeLinecap="round" />
            <Circle cx={x} cy={hy} r={3.8} fill={flowerColors[i % 3]} />
            <Circle cx={x} cy={hy} r={1.3} fill="#C9A23F" />
          </G>
        );
      })}
      {todayOpen && n < size ? (
        <Circle cx={flowerX(n)} cy={207} r={4} fill="none" stroke="#B9A48F" strokeWidth={1.3} strokeDasharray="2.5 2.5" />
      ) : null}
      <Ellipse cx={195} cy={158} rx={34} ry={5} fill="#000000" opacity={0.12} />
      {hideCompanion ? null : <G transform="translate(130 40) scale(0.65)"><CompanionArt id="pip" stage={stage} /></G>}
    </G>
  );
}

// The mustard tree beside the bed: a sprout, a young tree, a full tree, then birds.
function MustardTree({ grown, birds, night }: { grown: number; birds: number; night: boolean }) {
  if (grown < 1) return null;
  const wood = night ? "#4A3E48" : "#6B5444";
  const leaf = night ? "#4F6658" : "#7E9468";
  const leafDark = night ? "#435A4E" : "#6C8259";
  const bloom = night ? "#B9A257" : "#E3C25A";
  if (grown === 1) {
    return (
      <G>
        <Path d="M66 204 C 66 186 64 168 67 150" fill="none" stroke={leafDark} strokeWidth={2.6} strokeLinecap="round" />
        <Ellipse cx={57} cy={166} rx={10} ry={4.2} fill={leaf} transform="rotate(-28 57 166)" />
        <Ellipse cx={76} cy={172} rx={10} ry={4.2} fill={leafDark} transform="rotate(26 76 172)" />
        <Ellipse cx={59} cy={152} rx={8} ry={3.6} fill={leafDark} transform="rotate(-34 59 152)" />
        <Ellipse cx={73} cy={150} rx={7} ry={3.2} fill={leaf} transform="rotate(-62 73 150)" />
      </G>
    );
  }
  if (grown === 2) {
    return (
      <G>
        <Path d="M62 204 C 64 180 63 160 66 140 L70 140 C 70 160 70 180 72 204 Z" fill={wood} />
        <Path d="M67 156 C 58 150 52 146 46 140" fill="none" stroke={wood} strokeWidth={2.5} strokeLinecap="round" />
        <Ellipse cx={67} cy={132} rx={26} ry={18} fill={leafDark} />
        <Ellipse cx={52} cy={138} rx={16} ry={11} fill={leaf} />
        <Ellipse cx={80} cy={126} rx={17} ry={12} fill={leaf} />
        <Ellipse cx={64} cy={120} rx={14} ry={10} fill={leaf} />
      </G>
    );
  }
  const blooms: [number, number][] = [[40, 96], [58, 74], [88, 80], [104, 104], [72, 98], [30, 116], [92, 122], [50, 118], [80, 60], [112, 88]];
  const perches: [number, number][] = [[54, 58], [86, 52], [112, 80], [24, 92], [70, 46]];
  return (
    <G>
      <Path d="M58 206 C 62 176 60 140 64 112 L72 112 C 74 140 72 176 78 206 Z" fill={wood} />
      <Path d="M66 140 C 52 132 40 124 30 114" fill="none" stroke={wood} strokeWidth={3} strokeLinecap="round" />
      <Path d="M70 132 C 84 124 96 116 108 104" fill="none" stroke={wood} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={68} cy={122} rx={48} ry={18} fill={leafDark} />
      <Ellipse cx={36} cy={108} rx={28} ry={21} fill={leafDark} />
      <Ellipse cx={100} cy={104} rx={28} ry={21} fill={leafDark} />
      <Ellipse cx={68} cy={90} rx={44} ry={30} fill={leaf} />
      <Ellipse cx={52} cy={70} rx={26} ry={18} fill={leaf} />
      <Ellipse cx={86} cy={66} rx={26} ry={18} fill={leaf} />
      {blooms.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={1.8} fill={bloom} />)}
      {perches.slice(0, birds).map(([x, y], i) => (
        <Path key={i} d={`M${x - 7} ${y} Q${x - 3.5} ${y - 5.5} ${x} ${y} Q${x + 3.5} ${y - 5.5} ${x + 7} ${y}`} fill="none" stroke={night ? "#C9CFDD" : "#3B352C"} strokeWidth={1.7} strokeLinecap="round" />
      ))}
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

function BramRoad({ keptTotal, night, hideCompanion, far }: SceneProps & { night: boolean; far: string }) {
  const lit = progressIn(keptTotal, CHAPTER_SIZE.bram);
  const reached = chaptersDone(keptTotal, CHAPTER_SIZE.bram);
  return (
    <G>
      <Landmarks reached={reached} night={night} far={far} />
      <Path d="M140 260 C 170 220 188 178 195 140 L205 140 C 216 178 252 220 310 260 Z" fill={night ? "#45557C" : "#E3D1B0"} />
      {[...lamps].map((l, i) => ({ l, i })).reverse().filter(({ i }) => i >= 6).map(({ l, i }) => <Lamp key={i} x={l[0]} y={l[1]} s={l[2]} lit={i < lit} night={night} />)}
      <Ellipse cx={200} cy={146} rx={38} ry={5} fill="#000000" opacity={0.12} />
      {hideCompanion ? null : <G transform="translate(135 34) scale(0.65)"><CompanionArt id="bram" /></G>}
      {[...lamps].map((l, i) => ({ l, i })).reverse().filter(({ i }) => i < 6).map(({ l, i }) => <Lamp key={i} x={l[0]} y={l[1]} s={l[2]} lit={i < lit} night={night} />)}
    </G>
  );
}

// Places along the road, reached one per lit stretch: the well, the olive grove,
// a house on the hill, and the town on a hill. Later stretches light more windows.
function Landmarks({ reached, night, far }: { reached: number; night: boolean; far: string }) {
  if (reached < 1) return null;
  const wood = night ? "#3A3240" : "#6E5643";
  const stone = night ? "#4C5878" : "#A8977C";
  const glass = night ? "#F4CF84" : "#8C7A60";
  const town: [number, number, number, number][] = [[60, 82, 11, 10], [72, 77, 12, 15], [86, 72, 12, 20], [100, 75, 11, 17], [113, 80, 12, 12]];
  const extra: [number, number][] = [[76, 86], [89, 84], [103, 85], [64, 87], [116, 86]];
  return (
    <G>
      {reached >= 4 ? (
        <G>
          <Path d="M28 97 C 58 70 124 66 162 95 Z" fill={far} />
          {town.map(([x, y, w, h], i) => (
            <G key={i}>
              <Rect x={x} y={y} width={w} height={h} fill={night ? "#2F3A5E" : "#BCA77F"} />
              <Rect x={x + w / 2 - 1.5} y={y + 3} width={3} height={3} fill={glass} />
            </G>
          ))}
          {extra.slice(0, Math.min(reached - 4, extra.length)).map(([x, y], i) => <Rect key={i} x={x} y={y} width={2.5} height={2.5} fill={glass} />)}
        </G>
      ) : null}
      {reached >= 2 ? (
        <G>
          {[[34, 138], [58, 134], [82, 136]].map(([x, base], i) => (
            <G key={i}>
              <Line x1={x} y1={base} x2={x} y2={base - 12} stroke={wood} strokeWidth={2.5} strokeLinecap="round" />
              <Ellipse cx={x} cy={base - 18} rx={11} ry={8} fill={night ? "#3E4E5A" : "#8E9A6E"} />
              <Ellipse cx={x + 4} cy={base - 22} rx={7} ry={5} fill={night ? "#4A5B64" : "#A3AD82"} />
            </G>
          ))}
        </G>
      ) : null}
      {reached >= 3 ? (
        <G>
          <Rect x={289} y={126} width={22} height={13} fill={night ? "#3E4A6C" : "#E8DCC4"} />
          <Path d="M286 127 L300 117 L314 127 Z" fill={wood} />
          <Rect x={302} y={129} width={5} height={5} fill={glass} />
          <Rect x={292} y={131} width={5} height={8} fill={wood} />
        </G>
      ) : null}
      <G>
        <Line x1={336} y1={130} x2={336} y2={114} stroke={wood} strokeWidth={2} strokeLinecap="round" />
        <Line x1={352} y1={130} x2={352} y2={114} stroke={wood} strokeWidth={2} strokeLinecap="round" />
        <Path d="M330 116 L344 107 L358 116 Z" fill={wood} />
        <Rect x={333} y={128} width={22} height={13} rx={2} fill={stone} />
        <Ellipse cx={344} cy={128} rx={11} ry={2.6} fill={night ? "#3A4566" : "#8C7C64"} />
      </G>
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

function SmallNest({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path d={`M${x - 15} ${y - 3} Q${x} ${y + 13} ${x + 15} ${y - 4} Z`} fill="#7A5C42" />
      <Line x1={x - 14} y1={y - 3} x2={x + 12} y2={y + 1} stroke="#A3825F" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={x - 10} y1={y + 2} x2={x + 14} y2={y - 3} stroke="#A3825F" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={x - 12} y1={y - 1} x2={x + 8} y2={y + 4} stroke="#A3825F" strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

// Finished nests stay in the tree, each one a little higher.
const finishedNests: [number, number][] = [[326, 94], [106, 128], [338, 52], [40, 64]];

function SolaNest({ keptTotal, night, hideCompanion }: SceneProps & { night: boolean }) {
  const n = progressIn(keptTotal, CHAPTER_SIZE.sola);
  const done = chaptersDone(keptTotal, CHAPTER_SIZE.sola);
  const leafA = night ? "#5C7468" : "#8FA48A";
  const leafB = night ? "#52695E" : "#7E967A";
  return (
    <G>
      {done >= 3 ? (
        <G>
          <Path d="M560 34 L390 44 C 370 46 350 50 316 60" fill="none" stroke="#6B5444" strokeWidth={3.5} strokeLinecap="round" />
          <Ellipse cx={318} cy={54} rx={9} ry={3.8} fill={leafB} transform="rotate(-20 318 54)" />
          <Ellipse cx={372} cy={40} rx={10} ry={4} fill={leafA} transform="rotate(-10 372 40)" />
        </G>
      ) : null}
      {done >= 4 ? (
        <G>
          <Path d="M-170 74 L0 64 C 22 63 46 66 70 74" fill="none" stroke="#6B5444" strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={72} cy={68} rx={9} ry={3.8} fill={leafA} transform="rotate(26 72 68)" />
          <Ellipse cx={14} cy={58} rx={10} ry={4} fill={leafB} transform="rotate(-14 14 58)" />
        </G>
      ) : null}
      <Path d="M-400 170 L0 146 C 90 134 200 124 300 110 C 330 106 360 104 390 100 L560 86 L560 92 L390 108 C 360 112 330 114 300 118 C 200 132 90 144 0 156 L-400 180 Z" fill="#6B5444" />
      <Path d="M300 114 C 316 96 330 88 352 82" fill="none" stroke="#6B5444" strokeWidth={4} strokeLinecap="round" />
      <Path d="M90 140 C 100 126 112 120 126 118" fill="none" stroke="#6B5444" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={350} cy={76} rx={12} ry={5} fill={leafA} transform="rotate(-24 350 76)" />
      <Ellipse cx={364} cy={88} rx={11} ry={4.5} fill={leafA} transform="rotate(14 364 88)" />
      <Ellipse cx={126} cy={112} rx={11} ry={4.5} fill={leafA} transform="rotate(-30 126 112)" />
      <Ellipse cx={40} cy={136} rx={10} ry={4} fill={leafA} transform="rotate(-12 40 136)" />
      <Ellipse cx={336} cy={92} rx={10} ry={4} fill={leafB} transform="rotate(30 336 92)" />
      <Ellipse cx={112} cy={124} rx={9} ry={4} fill={leafB} transform="rotate(20 112 124)" />
      {finishedNests.slice(0, done).map(([x, y], i) => <SmallNest key={i} x={x} y={y} />)}
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

// Three seven-star shapes, used in turn. Points are revealed in order; lines join them.
const patterns: { points: [number, number][]; edges: [number, number][] }[] = [
  { points: [[0, 22], [22, 10], [44, 18], [64, 30], [72, 56], [102, 64], [112, 36]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  { points: [[62, 4], [60, 30], [58, 60], [30, 30], [92, 32], [12, 44], [116, 48]], edges: [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5], [4, 6]] },
  { points: [[0, 30], [24, 62], [46, 28], [68, 60], [92, 26], [114, 58], [124, 22]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
];
// The afternoon sun sits top-left, so the sky's constellations move right then.
const origins = (period?: Period) =>
  period === "afternoon"
    ? { current: [240, 12] as [number, number], past: [112, 4] as [number, number] }
    : { current: [24, 12] as [number, number], past: [206, 6] as [number, number] };

/** The constellation being drawn now (or the one just finished, until the next star). */
function currentConstellation(kept: number, period?: Period) {
  const n = progressIn(kept, 7);
  const done = chaptersDone(kept, 7);
  const index = n === 7 ? done - 1 : done; // 0-based constellation number
  return { index, n, origin: origins(period).current, pattern: index % patterns.length };
}

function Constellation({ pattern, count, x, y, scale, color, r }: { pattern: number; count: number; x: number; y: number; scale: number; color: string; r: number }) {
  const { points, edges } = patterns[pattern];
  const pt = (i: number) => [x + points[i][0] * scale, y + points[i][1] * scale] as const;
  return (
    <G>
      {edges.filter(([a, b]) => a < count && b < count).map(([a, b], i) => {
        const [x1, y1] = pt(a), [x2, y2] = pt(b);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.9 * Math.max(scale, 0.7)} opacity={0.45} />;
      })}
      {points.slice(0, count).map((_, i) => {
        const [cx, cy] = pt(i);
        return <Path key={i} d={sparklePath(cx, cy, r)} fill={color} />;
      })}
    </G>
  );
}

function LumiSky({ kept, period }: { kept: number; period: Period }) {
  if (kept < 1) return null;
  const color = period === "night" ? "#F2DFA8" : "#C9A85B";
  const cur = currentConstellation(kept, period);
  const past = origins(period).past;
  return (
    <G>
      {cur.index >= 1 ? (
        <G opacity={0.75}>
          <Constellation pattern={(cur.index - 1) % patterns.length} count={7} x={past[0]} y={past[1]} scale={0.42} color={color} r={3.4} />
        </G>
      ) : null}
      <Constellation pattern={cur.pattern} count={cur.n} x={cur.origin[0]} y={cur.origin[1]} scale={1} color={color} r={6.5} />
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
