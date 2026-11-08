// Time of day drives the home screen's sky and whether the page is light or dark.
export type Period = "morning" | "afternoon" | "night";

export function periodNow(d = new Date()): Period {
  const h = d.getHours();
  if (h < 5 || h >= 18) return "night";
  return h < 12 ? "morning" : "afternoon";
}

export function greetingFor(period: Period, name?: string | null) {
  const part = period === "morning" ? "Good morning" : period === "afternoon" ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

export type PageTokens = {
  dark: boolean;
  bg: string; text: string; muted: string; label: string; line: string; lineSoft: string;
  pill: string; composerBg: string; composerLine: string; quote: string; greeting: string; attribution: string;
};

export const lightPage: PageTokens = {
  dark: false,
  bg: "#F7F3EC", text: "#23211D", muted: "#6E665A", label: "#6B6458", line: "#E3DCCF", lineSoft: "#EDE7DC",
  pill: "#CFC6B6", composerBg: "#FFFDF9", composerLine: "#D8D0C2", quote: "#2B2620", greeting: "#5E5446", attribution: "#6B5F4E",
};

export const darkPage: PageTokens = {
  dark: true,
  bg: "#151B2B", text: "#F1ECE2", muted: "#A7AEC0", label: "#A7AEC0", line: "#26304A", lineSoft: "#222B42",
  pill: "#3A4566", composerBg: "#1E2638", composerLine: "#33405E", quote: "#F1ECE2", greeting: "#B9BFCE", attribution: "#A7AEC0",
};
