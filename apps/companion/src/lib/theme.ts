export const colors = {
  ground: "#F5F2EC",
  ink: "#1F2430",
  inkSoft: "#4C5262",
  line: "#D8D3CA",
  lineSoft: "#E4E0D8",
  white: "#FFFFFF",
  danger: "#A3322A",
};

export const fonts = {
  display: "Fraunces_700Bold",
  body: "Nunito_500Medium",
  bodySemi: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyHeavy: "Nunito_800ExtraBold",
};

export type CompanionId = "pip" | "bram" | "sola" | "lumi";

// Client-side copy for each companion. The personality prompt lives on the
// server (content/companions/*.md); this is only what the screens show.
export const companions: Record<CompanionId, {
  name: string;
  species: string;
  tagline: string;
  story: string;
  greeting: string;
  tile: string;      // card background
  tint: string;      // lighter background
  accent: string;    // text accent (passes contrast on tile)
  bubble: string;    // user chat bubble
}> = {
  pip: {
    name: "Pip",
    species: "A mustard seed",
    tagline: "Build the habit",
    story: "A tiny mustard seed. Jesus said faith even that small can move mountains (Matthew 17:20). Pip grows as your daily habit grows.",
    greeting: "Let's grow a little every day.",
    tile: "#E2EDD8", tint: "#F3F8EE", accent: "#3C6630", bubble: "#3C6630",
  },
  bram: {
    name: "Bram",
    species: "A talking donkey",
    tagline: "Keep me honest",
    story: "A donkey, inspired by the one in Numbers 22 that God let speak to stop its rider from heading the wrong way. Bram speaks up too, kindly.",
    greeting: "I will ask if you did what you said.",
    tile: "#E4E0EF", tint: "#F3F1F8", accent: "#534A75", bubble: "#534A75",
  },
  sola: {
    name: "Sola",
    species: "A little sparrow",
    tagline: "Calm my worries",
    story: "A sparrow. Jesus said not one falls without God knowing, and that you're worth more than many sparrows (Matthew 10:29-31).",
    greeting: "Nothing you bring me is too small.",
    tile: "#F5DDCD", tint: "#FBF0E8", accent: "#8A4A26", bubble: "#8A4A26",
  },
  lumi: {
    name: "Lumi",
    species: "A lost lamb",
    tagline: "Hold me gently",
    story: "A lamb, from Jesus' story of the shepherd who leaves 99 sheep to find the one that wandered off (Luke 15).",
    greeting: "Wherever you are with God, you're welcome.",
    tile: "#D9E6F1", tint: "#EEF4F9", accent: "#2F5778", bubble: "#2F5778",
  },
};

export const companionOrder: CompanionId[] = ["pip", "bram", "sola", "lumi"];

export const traditions = [
  { id: "nondenominational", label: "Non-denominational" },
  { id: "baptist", label: "Baptist" },
  { id: "catholic", label: "Catholic" },
  { id: "methodist", label: "Methodist" },
  { id: "pentecostal", label: "Pentecostal" },
  { id: "orthodox", label: "Orthodox" },
  { id: "unsure", label: "Not sure" },
] as const;

// Traditions with a written profile on the server. Others are stored as null
// (the companion sticks to beliefs shared by most Christians) until written.
export const traditionsWithProfiles = new Set(["nondenominational", "baptist", "catholic"]);

export const translations = [
  { id: "BSB", label: "Berean Standard (modern)" },
  { id: "KJV", label: "King James" },
  { id: "WEB", label: "World English" },
  { id: "DRA", label: "Douay-Rheims (Catholic)" },
] as const;

export const focusAreas = [
  { id: "prayer", title: "Daily prayer", sub: "Actually doing it, every day" },
  { id: "bible", title: "Reading the Bible", sub: "Understanding what I read" },
  { id: "worry", title: "Worry & stress", sub: "Giving it to God, not carrying it" },
  { id: "relationship", title: "A relationship", sub: "Family, marriage, a friend" },
  { id: "habit", title: "A habit to break", sub: "Something I keep going back to" },
  { id: "grief", title: "Grief or loss", sub: "A hard season I'm walking through" },
] as const;

export const faithStages = [
  { id: "growing", title: "Growing", sub: "I'm in it and want to go deeper" },
  { id: "coming_back", title: "Coming back", sub: "It's been a while" },
  { id: "curious", title: "Just curious", sub: "Still figuring out what I believe" },
] as const;
