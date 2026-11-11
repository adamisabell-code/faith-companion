// A shareable picture of today's words of Jesus, set in the user's own buddy's world.
// Privacy: the card carries only Scripture (from the Bible database, in the user's
// translation), its reference, the buddy's world, and the app name. Nothing the user
// typed, prayed, or committed to ever appears on it.
import { forwardRef } from "react";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { SceneArt } from "./Scene";
import { APP_NAME } from "@/lib/config";
import type { Words } from "@/lib/jesus";
import { fonts, type CompanionId } from "@/lib/theme";
import type { Period } from "@/lib/timeOfDay";

export const CARD_W = 360;
export const CARD_H = 450;       // 4:5, exported at 3x = 1080×1350
const SCENE_SCALE = CARD_W / 390;
const SCENE_TOP = CARD_H - 260 * SCENE_SCALE;

export type CardLine = { text: string; x: number; y: number; size: number; font: string; color: string; spacing?: number };

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Every piece of text on the card, positioned. Shared by the on-screen card and the image export. */
export function cardLines(words: Words, period: Period): CardLine[] {
  const night = period === "night";
  const ink = night ? "#F1ECE2" : "#2A2630";
  const soft = night ? "#C9CFDD" : "#5A5560";
  const quote = `“${words.text}”`;
  const size = quote.length <= 70 ? 27 : quote.length <= 120 ? 23 : quote.length <= 190 ? 19.5 : quote.length <= 280 ? 16.5 : 14;
  const lines = wrap(quote, Math.floor(304 / (size * 0.47)));
  const lh = size * 1.3;
  const blockH = lines.length * lh + 26;
  // Centre the verse in the open sky above the world.
  const top = Math.max(34, 34 + (SCENE_TOP + 6 - 34 - blockH) / 2);
  const out: CardLine[] = lines.map((text, i) => ({ text, x: CARD_W / 2, y: top + size + i * lh, size, font: fonts.serif, color: ink }));
  out.push({ text: `JESUS  ·  ${words.reference.toUpperCase()}  ·  ${words.translation}`, x: CARD_W / 2, y: top + lines.length * lh + 22, size: 9.5, font: fonts.bodyBold, color: soft, spacing: 1.2 });
  out.push({ text: APP_NAME, x: CARD_W / 2, y: CARD_H - 13, size: 10.5, font: fonts.bodyBold, color: night ? "#C9CFDD" : "#2A2630", spacing: 0.6 });
  return out;
}

export const ShareCard = forwardRef<Svg, { id: CompanionId; period: Period; words: Words; keptTotal: number; stage: 0 | 1 | 2 | 3; width: number }>(
  function ShareCard({ id, period, words, keptTotal, stage, width }, ref) {
    const lines = cardLines(words, period);
    return (
      <Svg ref={ref} width={width} height={(width * CARD_H) / CARD_W} viewBox={`0 0 ${CARD_W} ${CARD_H}`} accessibilityRole="image"
        accessibilityLabel={`Jesus said: ${words.text} ${words.reference}`}>
        <G transform={`translate(0 ${SCENE_TOP}) scale(${SCENE_SCALE})`}>
          <SceneArt id={id} period={period} stage={stage} keptTotal={keptTotal} />
        </G>
        {/* A soft band so the app name reads on any ground colour. */}
        <Rect x={0} y={CARD_H - 30} width={CARD_W} height={30} fill={period === "night" ? "#10152A" : "#FFFFFF"} opacity={period === "night" ? 0.35 : 0.3} />
        {lines.map((l, i) => (
          <SvgText key={i} x={l.x} y={l.y} textAnchor="middle" fontFamily={l.font} fontSize={l.size} fill={l.color} letterSpacing={l.spacing}>{l.text}</SvgText>
        ))}
      </Svg>
    );
  },
);
