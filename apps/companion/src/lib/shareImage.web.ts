// Web: turn the on-screen share card into a 1080×1350 PNG and hand it to the
// phone's share sheet (or download it on a computer).
import type Svg from "react-native-svg";
import { CARD_H, CARD_W, type CardLine } from "@/components/ShareCard";

const SCALE = 3;
export const CARD_DOM_ID = "ab-share-card";

async function renderPng(lines: CardLine[]): Promise<Blob> {
  const svg = document.getElementById(CARD_DOM_ID)?.querySelector("svg");
  if (!svg) throw new Error("Card not ready.");
  // The picture: everything except the words. (An SVG drawn as an image can't use
  // the page's fonts, so the words are painted onto the canvas afterwards.)
  const art = svg.cloneNode(true) as SVGSVGElement;
  art.querySelectorAll("text").forEach((t) => t.remove());
  art.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  art.setAttribute("width", String(CARD_W * SCALE));
  art.setAttribute("height", String(CARD_H * SCALE));
  art.removeAttribute("style");
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(art));
  const img = new Image();
  await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("Couldn't draw the card.")); img.src = src; });

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * SCALE; canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't draw the card.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  await Promise.all([...new Set(lines.map((l) => l.font))].map((f) => document.fonts.load(`20px "${f}"`).catch(() => [])));
  ctx.textAlign = "center";
  for (const l of lines) {
    ctx.font = `${l.size * SCALE}px "${l.font}"`;
    ctx.fillStyle = l.color;
    try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(l.spacing ?? 0) * SCALE}px`; } catch { /* older browsers */ }
    ctx.fillText(l.text, l.x * SCALE, l.y * SCALE);
  }
  return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Couldn't save the card."))), "image/png"));
}

export type ShareResult = "shared" | "saved" | "cancelled";

/** Share the card. `forceSave` downloads it instead of opening the share sheet. */
export async function shareCard(_ref: Svg | null, lines: CardLine[], text: string, forceSave = false): Promise<ShareResult> {
  const blob = await renderPng(lines);
  const file = new File([blob], "amen-buddy.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!forceSave && nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return "shared"; }
    catch (e) { if ((e as Error)?.name === "AbortError") return "cancelled"; /* otherwise fall back to saving */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "amen-buddy.png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}

export const canSaveImage = true;
