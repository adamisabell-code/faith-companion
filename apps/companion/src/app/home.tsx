// Home: words of Jesus over the companion's world, then the latest message,
// today's commitment and the prayer list. Light by day, dark in the evening.
import { Redirect, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { ChapterMoment } from "@/components/ChapterMoment";
import { Character } from "@/components/Character";
import { PrayerPause } from "@/components/PrayerPause";
import { ShareSheet } from "@/components/ShareSheet";
import { skyColor } from "@/components/Scene";
import { SceneStage, type StageHandle } from "@/components/SceneStage";
import { track } from "@/lib/analytics";
import { openChat } from "@/lib/api";
import { finishedChapter } from "@/lib/chapters";
import { loadWords, pickWords, type Words } from "@/lib/jesus";
import { growthStage, localDate, streak as calcStreak, type Commitment } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useReduceMotion } from "@/lib/motion";
import { companions, fonts, type CompanionId } from "@/lib/theme";
import { darkPage, greetingFor, lightPage, periodNow, type Period } from "@/lib/timeOfDay";

type Prayer = { id: string; text: string; status: "open" | "answered"; follow_up_on: string | null; created_at: string };
type LastMessage = { content: string; created_at: string } | null;

// Check button / link color per companion (light page). On the dark page everything uses #C8D5E8.
const accent: Record<CompanionId, string> = { pip: "#3F4A33", bram: "#4A3F5E", sola: "#3E5A5C", lumi: "#2F5778" };
const avatarBg: Record<CompanionId, string> = { pip: "#E9EDE0", bram: "#E8E5EE", sola: "#E7ECEC", lumi: "#E3E8F0" };

function plain(text: string, max = 260) {
  const t = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\n]+)\*/g, "$1").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  if (localDate(d) === localDate()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function followUpLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  const days = Math.round((d.getTime() - new Date(`${localDate()}T12:00:00`).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function growthLine(id: CompanionId, keptTotal: number, name: string) {
  if (id === "pip") return "Keep it and a new flower goes in the garden";
  if (id === "bram") return keptTotal === 0 ? "Keep it and the first lamp lights" : "Keep it and the next lamp lights";
  if (id === "sola") return `Keep it and ${name} adds a twig to the nest`;
  return `Keep it and a new star comes out in ${name}'s sky`;
}

export default function Home() {
  const { session, profile, profileLoading } = useSession();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>(periodNow());
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [keptTotal, setKeptTotal] = useState(0);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [lastMessage, setLastMessage] = useState<LastMessage>(null);
  const [words, setWords] = useState<Words | null>(null);
  const [praying, setPraying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [names, setNames] = useState<Record<number, string>>({});
  const [chapter, setChapter] = useState<number | null>(null);
  const reduce = useReduceMotion();
  const stage = useRef<StageHandle>(null);

  const id = (profile?.companion_id ?? "pip") as CompanionId;
  const c = companions[id];
  const page = period === "night" ? darkPage : lightPage;
  const tint = page.dark ? "#C8D5E8" : accent[id];
  const ready = !!session && !!profile?.ai_consent_at;

  const load = useCallback(async () => {
    const [cm, kept, pr, msg, cn] = await Promise.all([
      supabase.from("commitments").select("id, text, for_date, status").order("for_date", { ascending: false }).order("created_at", { ascending: false }).limit(60),
      supabase.from("commitments").select("id", { count: "exact", head: true }).in("status", ["done", "partial"]),
      supabase.from("prayer_requests").select("id, text, status, follow_up_on, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(20),
      supabase.from("messages").select("content, created_at").eq("role", "assistant").order("created_at", { ascending: false }).limit(1),
      supabase.from("constellation_names").select("number, name"),
    ]);
    setCommitments((cm.data ?? []) as Commitment[]);
    setKeptTotal(kept.count ?? 0);
    setPrayers((pr.data ?? []) as Prayer[]);
    setLastMessage(((msg.data ?? [])[0] as LastMessage) ?? null);
    setNames(Object.fromEntries(((cn.data ?? []) as { number: number; name: string }[]).map((r) => [r.number, r.name])));
  }, []);

  // Refresh whenever Home comes back into view (after chatting, after settings).
  useFocusEffect(useCallback(() => {
    setPeriod(periodNow());
    if (ready) load();
  }, [ready, load]));

  // Let the server add a due check-in; if it does, show it.
  useEffect(() => {
    if (!ready) return;
    openChat().then((r) => { if (r.reply) load(); }).catch(() => {});
  }, [ready, load]);

  useEffect(() => {
    if (!profile) return;
    loadWords(pickWords(profile.focus_areas ?? []), profile.translation_id ?? "BSB").then(setWords);
  }, [profile?.focus_areas, profile?.translation_id]);

  const today = localDate();
  const todays = commitments.find((x) => x.for_date === today) ?? null;
  const kept = todays?.status === "done" || todays?.status === "partial";
  const days = useMemo(() => calcStreak(commitments), [commitments]);

  async function setTodayStatus(status: Commitment["status"]) {
    if (!todays) return;
    const wasKept = kept;
    setCommitments((list) => list.map((x) => (x.id === todays.id ? { ...x, status } : x)));
    const nowKept = status === "done" || status === "partial";
    if (nowKept !== wasKept) setKeptTotal((n) => Math.max(0, n + (nowKept ? 1 : -1)));
    if (nowKept && !wasKept) {
      stage.current?.kept(keptTotal + 1);
      track("commitment_kept", { buddy: id });
      showChapter(finishedChapter(id, keptTotal + 1));
    }
    const { error } = await supabase.from("commitments").update({ status }).eq("id", todays.id);
    if (error) load();
  }

  async function markAnswered(p: Prayer) {
    setPrayers((list) => list.filter((x) => x.id !== p.id));
    stage.current?.answered();
    track("prayer_marked_answered");
    const { error } = await supabase.from("prayer_requests").update({ status: "answered", updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) load();
  }

  // Let the world grow first, then the quiet chapter moment.
  function showChapter(n: number | null) {
    if (!n) return;
    track("chapter_finished", { buddy: id, chapter: n });
    setTimeout(() => setChapter(n), reduce ? 300 : 1700);
  }

  async function nameConstellation(number: number, name: string) {
    const { error } = await supabase.from("constellation_names").upsert({ user_id: session!.user.id, number, name });
    if (error) return "Couldn't save that. Try again in a moment.";
    setNames((m) => ({ ...m, [number]: name }));
    return null;
  }

  function talk(send?: string) {
    router.push(send ? { pathname: "/chat", params: { send } } : "/chat");
  }

  // Quick replies under the companion's latest message.
  const replies: { label: string; action: () => void }[] = !todays
    ? [
        { label: "Pray 5 minutes", action: () => talk("Today I'll pray for 5 minutes.") },
        { label: "Read one Psalm", action: () => talk("Today I'll read one Psalm.") },
        { label: "Something else", action: () => talk() },
      ]
    : !kept && period === "night"
    ? [
        { label: "I did it", action: () => { setTodayStatus("done"); talk("I did it."); } },
        { label: "Not yet", action: () => talk("Not yet.") },
        { label: "Pray with me", action: () => talk("Can you pray with me?") },
      ]
    : [
        { label: "Pray with me", action: () => talk("Can you pray with me?") },
        { label: "Reply", action: () => talk() },
      ];

  if (!session) return <Redirect href="/welcome" />;
  if (profileLoading) return null;
  if (!profile?.onboarded_at) return <Redirect href="/" />;
  if (!profile.ai_consent_at) return <Redirect href="/consent" />;

  const long = (words?.text.length ?? 0) > 110;

  return (
    <View style={[st.root, { backgroundColor: page.bg }]}>
      <StatusBar style={page.dark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Sky: greeting, words of Jesus, and the world */}
        <View style={{ backgroundColor: skyColor(id, period), paddingTop: insets.top }}>
          <View style={[st.column, st.skyText]}>
            <View style={st.topRow}>
              <Text style={[st.greeting, { color: page.greeting }]}>{greetingFor(period, profile.first_name)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={st.iconBtn}>
                <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={page.dark ? "#D9DDE6" : "#3B352C"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                </Svg>
              </Pressable>
            </View>
            {words ? (
              <View style={{ gap: 6 }}>
                <View style={{ gap: 10 }} accessible accessibilityLabel={`Jesus said: ${words.text}. ${words.reference}`}>
                  <Text style={[st.quote, { color: page.quote }, long && { fontSize: 22, lineHeight: 28 }]}>“{words.text}”</Text>
                </View>
                <View style={st.attributionRow}>
                  <Text style={[st.attribution, { color: page.attribution, flex: 1 }]}>Jesus · {words.reference} ({words.translation})</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Share today's words" onPress={() => setSharing(true)} hitSlop={8} style={({ pressed }) => [st.shareBtn, pressed && { opacity: 0.6 }]}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={page.attribution} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 15V4M8 7.5 12 3.5l4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
                    </Svg>
                    <Text style={[st.attribution, { color: page.attribution }]}>Share</Text>
                  </Pressable>
                </View>
              </View>
            ) : <View style={{ height: 120 }} />}
          </View>
          <SceneStage ref={stage} id={id} period={period} stage={growthStage(days)} keptTotal={keptTotal} todayOpen={!!todays && !kept} constellationNames={names} dark={page.dark} />
        </View>

        <View style={[st.column, st.content]}>
          {/* Pause and pray: the signature moment */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pause and pray with ${c.name}, about 30 seconds`}
            onPress={() => setPraying(true)}
            style={({ pressed }) => [st.pause, { backgroundColor: page.dark ? "#1E2638" : "#EFE8DC" }, pressed && { opacity: 0.8 }]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={3.2} fill={tint} stroke="none" />
              <Circle cx={12} cy={12} r={7} opacity={0.55} />
              <Circle cx={12} cy={12} r={10.5} opacity={0.25} />
            </Svg>
            <Text style={[st.pauseText, { color: page.text }]}>Pause and pray with {c.name}</Text>
            <Text style={[st.small, { color: page.muted }]}>30 sec</Text>
          </Pressable>

          {/* Latest message */}
          <View style={[st.section, { borderBottomColor: page.line, paddingTop: 0 }]}>
            <Text style={[st.label, { color: page.label }]}>
              {c.name.toUpperCase()}{lastMessage ? ` · ${whenLabel(lastMessage.created_at).toUpperCase()}` : ""}
            </Text>
            <Pressable onPress={() => talk()} accessibilityRole="button" accessibilityHint={`Opens your conversation with ${c.name}`}>
              <Text style={[st.message, { color: page.text }]}>{lastMessage ? plain(lastMessage.content) : c.greeting}</Text>
            </Pressable>
            <View style={st.pills}>
              {replies.map((r) => (
                <Pressable key={r.label} accessibilityRole="button" onPress={r.action} style={({ pressed }) => [st.pill, { borderColor: page.pill }, pressed && { opacity: 0.7 }]}>
                  <Text style={[st.pillText, { color: page.text }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Today */}
          <View style={[st.section, st.todayRow, { borderBottomColor: page.line }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[st.label, { color: page.label }]}>TODAY</Text>
              {todays ? (
                <>
                  <Text style={[st.commit, { color: page.text }]}>{todays.text}</Text>
                  <Text style={[st.sub, { color: page.muted }]}>
                    {kept ? (days > 1 ? `Kept. ${days} days in a row.` : "Kept.") : growthLine(id, keptTotal, c.name)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[st.commit, { color: page.muted }]}>Not set yet</Text>
                  <Text style={[st.sub, { color: page.muted }]}>Pick one with {c.name} above.</Text>
                </>
              )}
            </View>
            {todays ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: kept }}
                accessibilityLabel={kept ? "Kept. Tap to undo" : "Mark today's commitment kept"}
                onPress={() => setTodayStatus(kept ? "pending" : "done")}
                style={[st.check, kept ? { backgroundColor: tint, borderColor: tint } : { borderColor: tint }]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={kept ? page.bg : tint} strokeWidth={kept ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              </Pressable>
            ) : null}
          </View>

          {/* Praying for */}
          <View style={[st.section, { borderBottomWidth: 0, gap: 4 }]}>
            <View style={st.prayHead}>
              <Text style={[st.label, { color: page.label }]}>PRAYING FOR</Text>
            </View>
            {prayers.length === 0 ? (
              <Text style={[st.empty, { color: page.muted }]}>Nothing here yet. When something's on your heart, tell {c.name}. {c.name} will pray with you and follow up.</Text>
            ) : prayers.map((p, i) => (
              <View key={p.id} style={[st.prayRow, i < prayers.length - 1 && { borderBottomWidth: 1, borderBottomColor: page.lineSoft }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.prayText, { color: page.text }]}>{p.text}</Text>
                  <Text style={[st.small, { color: page.muted, marginTop: 2 }]}>
                    {p.follow_up_on ? `${c.name} will ask ${followUpLabel(p.follow_up_on)}` : `Added ${whenLabel(p.created_at)}`}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Mark "${p.text}" answered`} onPress={() => markAnswered(p)} style={st.answerBtn}>
                  <Text style={[st.answerText, { color: tint }]}>Answered</Text>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Journal */}
          <Pressable
            accessibilityRole="button"
            accessibilityHint="What God has done, kept in one place"
            onPress={() => router.push("/journal")}
            style={({ pressed }) => [st.bookRow, { borderTopColor: page.line }, pressed && { opacity: 0.7 }]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z" />
              <Path d="M12 6.5v13" />
            </Svg>
            <View style={{ flex: 1 }}>
              <Text style={[st.pauseText, { color: page.text }]}>Journal</Text>
              <Text style={[st.small, { color: page.muted }]}>What God has done</Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={page.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M9 6l6 6-6 6" /></Svg>
          </Pressable>
        </View>
      </ScrollView>

      <ChapterMoment
        visible={chapter !== null}
        id={id}
        number={chapter ?? 1}
        onClose={() => setChapter(null)}
        onRead={(ref) => { setChapter(null); talk(`Can we read ${ref} together?`); }}
        onOpenBook={() => { setChapter(null); router.push("/journal"); }}
        onName={id === "lumi" ? (name) => nameConstellation(chapter ?? 1, name) : undefined}
      />

      {words ? (
        <ShareSheet visible={sharing} onClose={() => setSharing(false)} id={id} period={period} words={words} keptTotal={keptTotal} stage={growthStage(days)} />
      ) : null}
      <PrayerPause
        visible={praying}
        id={id}
        intentions={prayers.map((p) => p.text)}
        onClose={() => setPraying(false)}
        onAmen={() => { track("prayer_pause_completed", { buddy: id }); setPraying(false); setTimeout(() => stage.current?.celebrate(), 450); }}
      />

      {/* Message bar */}
      <View style={[st.column, { paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12, backgroundColor: page.bg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Message ${c.name}`} onPress={() => talk()} style={[st.composer, { backgroundColor: page.composerBg, borderColor: page.composerLine }]}>
          <View style={[st.avatar, { backgroundColor: page.dark ? "#2A3550" : avatarBg[id] }]}><Character id={id} size={34} /></View>
          <Text style={[st.composerText, { color: page.muted }]}>Message {c.name}…</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  column: { width: "100%", maxWidth: 560, alignSelf: "center" },
  skyText: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontFamily: fonts.bodySemi, fontSize: 15 },
  iconBtn: { width: 44, height: 44, marginRight: -10, alignItems: "center", justifyContent: "center" },
  quote: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32 },
  attribution: { fontFamily: fonts.bodySemi, fontSize: 13 },
  attributionRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, paddingLeft: 8 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pause: { minHeight: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 18 },
  pauseText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15 },
  section: { paddingVertical: 20, borderBottomWidth: 1, gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.3 },
  message: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 26 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  todayRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  commit: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26 },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  check: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  prayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  small: { fontFamily: fonts.body, fontSize: 13 },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 4 },
  prayRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  prayText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
  answerBtn: { minHeight: 44, justifyContent: "center", paddingLeft: 8 },
  answerText: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: "underline" },
  bookRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, borderTopWidth: 1, paddingVertical: 12 },
  composer: { height: 56, borderRadius: 28, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  composerText: { flex: 1, fontFamily: fonts.body, fontSize: 15 },
});
