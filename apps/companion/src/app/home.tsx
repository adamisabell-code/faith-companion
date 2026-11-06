// Home: where your companion lives. Today's commitment, streak, prayer list and a verse.
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Character } from "@/components/Character";
import { Button } from "@/components/ui";
import { openChat } from "@/lib/api";
import { growthStage, localDate, nextMilestone, streak as calcStreak, week as calcWeek, type Commitment } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, companions, fonts, type CompanionId } from "@/lib/theme";
import { loadVerse, pickVerse, type Verse } from "@/lib/verses";

type Prayer = { id: string; text: string; status: "open" | "answered" | "archived"; follow_up_on: string | null; updated_at: string };

const doneLines: Record<CompanionId, string> = {
  pip: "That's a new leaf. I'm proud of you.",
  bram: "Look at you, doing what you said. I'm almost speechless. Almost.",
  sola: "I saw that. Well done, truly.",
  lumi: "That was faithful. Rest well tonight.",
};
const pendingLines: Record<CompanionId, string> = {
  pip: "Still on for today? Small is how it starts.",
  bram: "Still on for today? I'll be asking.",
  sola: "No rush. Is today's plan still feeling doable?",
  lumi: "Whenever you're ready. No pressure.",
};
const emptyLines: Record<CompanionId, string> = {
  pip: "Want to pick one small thing for today?",
  bram: "No plan yet today. Let's fix that.",
  sola: "What's on your heart today? Let's find one small step.",
  lumi: "Want to talk? We can pick something small, or just sit a minute.",
};

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

function shortDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function Home() {
  const { session, profile, profileLoading } = useSession();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [newMessage, setNewMessage] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const id = (profile?.companion_id ?? "pip") as CompanionId;
  const c = companions[id];

  const load = useCallback(async () => {
    const [cm, pr] = await Promise.all([
      supabase.from("commitments").select("id, text, for_date, status").order("for_date", { ascending: false }).order("created_at", { ascending: false }).limit(60),
      supabase.from("prayer_requests").select("id, text, status, follow_up_on, updated_at").in("status", ["open", "answered"]).order("created_at", { ascending: false }).limit(40),
    ]);
    setCommitments((cm.data ?? []) as Commitment[]);
    setPrayers((pr.data ?? []) as Prayer[]);
  }, []);

  // Refresh whenever Home comes back into view (e.g. after chatting).
  useFocusEffect(useCallback(() => { if (session && profile?.ai_consent_at) load(); }, [session, profile?.ai_consent_at, load]));

  // Let the server add a due check-in; if it does, point the user to it.
  useEffect(() => {
    if (!session || !profile?.ai_consent_at) return;
    openChat().then((r) => { if (r.reply) setNewMessage(true); }).catch(() => {});
  }, [session, profile?.ai_consent_at]);

  useEffect(() => {
    if (!profile) return;
    loadVerse(pickVerse(profile.focus_areas ?? []), profile.translation_id ?? "BSB").then(setVerse);
  }, [profile?.focus_areas, profile?.translation_id]);

  const today = localDate();
  const todays = commitments.find((x) => x.for_date === today) ?? null;
  const days = useMemo(() => calcStreak(commitments), [commitments]);
  const weekMarks = useMemo(() => calcWeek(commitments), [commitments]);
  const stage = growthStage(days);
  const next = nextMilestone(days);
  const open = prayers.filter((p) => p.status === "open");
  const answered = prayers.filter((p) => p.status === "answered").slice(0, 3);

  async function setStatus(status: Commitment["status"]) {
    if (!todays) return;
    setCommitments((list) => list.map((x) => (x.id === todays.id ? { ...x, status } : x)));
    setJustDone(status === "done");
    const { error } = await supabase.from("commitments").update({ status }).eq("id", todays.id);
    if (error) load();
  }

  async function markAnswered(p: Prayer) {
    setPrayers((list) => list.map((x) => (x.id === p.id ? { ...x, status: "answered", updated_at: new Date().toISOString() } : x)));
    const { error } = await supabase.from("prayer_requests").update({ status: "answered", updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) load();
  }

  if (!session) return <Redirect href="/welcome" />;
  if (profileLoading) return null;
  if (!profile?.onboarded_at) return <Redirect href="/onboarding/about" />;
  if (!profile.ai_consent_at) return <Redirect href="/consent" />;

  const line = newMessage ? `I left you a message. Come say hi.`
    : todays?.status === "done" || todays?.status === "partial" ? (justDone ? doneLines[id] : `Today's done. ${doneLines[id]}`)
    : todays ? pendingLines[id] : emptyLines[id];

  const growthHint = next === null ? "You've kept going a whole month. That's real growth."
    : id === "pip" ? `${next - days} more ${next - days === 1 ? "day" : "days"} until ${c.name} grows`
    : `${next - days} more ${next - days === 1 ? "day" : "days"} to ${next === 30 ? "a crown" : "a new sparkle"}`;

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: c.tint }]} edges={["top", "bottom"]}>
      <View style={st.column}>
        <ScrollView contentContainerStyle={st.body}>
          <View style={st.topRow}>
            <Text style={st.greeting} accessibilityRole="header">{greeting(profile.first_name)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={st.iconBtn}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </Svg>
            </Pressable>
          </View>

          {/* Companion */}
          <Pressable onPress={() => router.push("/chat")} accessibilityRole="button" accessibilityLabel={`Talk to ${c.name}. ${line}`} style={[st.hero, { backgroundColor: c.tile }]}>
            <Character id={id} size={170} stage={stage} />
            <View style={st.bubble}>
              <Text style={st.bubbleText}>{line}</Text>
            </View>
            {newMessage ? <View style={[st.badge, { backgroundColor: c.accent }]}><Text style={st.badgeText}>New message</Text></View> : null}
          </Pressable>

          {/* Streak + week */}
          <View style={st.card}>
            <View style={st.streakRow}>
              <View>
                <Text style={st.streakNum}>{days}</Text>
                <Text style={st.streakLabel}>{days === 1 ? "day in a row" : "days in a row"}</Text>
              </View>
              <Text style={[st.growthHint, { color: c.accent }]}>{growthHint}</Text>
            </View>
            <View style={st.weekRow} accessible accessibilityLabel={`This week: ${weekMarks.filter((d) => d.state === "done" || d.state === "partial").length} of 7 days kept`}>
              {weekMarks.map((d) => (
                <View key={d.date} style={st.dayCol}>
                  <View style={[
                    st.dot,
                    d.state === "done" && { backgroundColor: c.accent, borderColor: c.accent },
                    d.state === "partial" && { backgroundColor: c.tile, borderColor: c.accent },
                    d.state === "today" && { borderColor: colors.ink, borderWidth: 2.5 },
                    d.state === "future" && { borderStyle: "dashed" },
                  ]} />
                  <Text style={[st.dayLetter, d.state === "today" && { color: colors.ink, fontFamily: fonts.bodyHeavy }]}>{d.letter}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Today's commitment */}
          <View style={st.card}>
            <Text style={st.label}>TODAY'S COMMITMENT</Text>
            {todays ? (
              <>
                <Text style={st.commitText}>{todays.text}</Text>
                {todays.status === "done" || todays.status === "partial" ? (
                  <View style={st.keptRow}>
                    <View style={[st.check, { backgroundColor: c.accent }]}>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12l5 5 9-10" /></Svg>
                    </View>
                    <Text style={st.keptText}>{todays.status === "done" ? "Kept" : "Partly kept"}</Text>
                    <Pressable accessibilityRole="button" onPress={() => setStatus("pending")} style={st.undo}><Text style={st.undoText}>Undo</Text></Pressable>
                  </View>
                ) : (
                  <View style={st.actionRow}>
                    <Button title="Done" onPress={() => setStatus("done")} style={{ flex: 1 }} />
                    <Button kind="secondary" title="Partly" onPress={() => setStatus("partial")} style={{ flex: 1, minHeight: 56 }} />
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={st.muted}>Nothing set for today yet.</Text>
                <Button kind="secondary" title={`Pick one with ${c.name}`} onPress={() => router.push({ pathname: "/chat", params: { prefill: "Can you help me pick one small thing for today?" } })} />
              </>
            )}
          </View>

          {/* Prayer list */}
          <View style={st.card}>
            <Text style={st.label}>PRAYING FOR</Text>
            {open.length === 0 ? (
              <Text style={st.muted}>Tell {c.name} what you'd like prayer for, and {c.name} will follow up.</Text>
            ) : open.map((p) => (
              <View key={p.id} style={st.prayerRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.prayerText}>{p.text}</Text>
                  {p.follow_up_on ? <Text style={st.prayerMeta}>{c.name} will ask {shortDate(p.follow_up_on)}</Text> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Mark "${p.text}" answered`} onPress={() => markAnswered(p)} style={st.answerBtn}>
                  <Text style={st.answerText}>Answered</Text>
                </Pressable>
              </View>
            ))}
            {answered.length ? (
              <View style={st.answeredBox}>
                <Text style={[st.label, { color: c.accent }]}>GOD ANSWERED</Text>
                {answered.map((p) => (
                  <View key={p.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 3 }}><Path d="M5 12l5 5 9-10" /></Svg>
                    <Text style={[st.prayerText, { flex: 1, color: colors.inkSoft }]}>{p.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Verse */}
          {verse ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Verse for today, ${verse.reference}. Tap to talk about it.`}
              onPress={() => router.push({ pathname: "/chat", params: { prefill: `Can we talk about ${verse.reference}?` } })}
              style={st.verse}
            >
              <Text style={st.verseLabel}>VERSE FOR TODAY · {verse.reference.toUpperCase()} ({verse.translation})</Text>
              <Text style={st.verseText}>{verse.text}</Text>
              <Text style={st.verseLink}>Talk about this with {c.name} →</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={st.footer}>
          <Button title={`Talk to ${c.name}`} onPress={() => router.push("/chat")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  body: { padding: 16, paddingBottom: 24, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 28, paddingTop: 18, paddingBottom: 18, paddingHorizontal: 16, alignItems: "center", gap: 10 },
  bubble: { backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignSelf: "stretch" },
  bubbleText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: colors.ink, textAlign: "center" },
  badge: { position: "absolute", top: 14, right: 14, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, gap: 12 },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  streakNum: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.ink },
  streakLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  growthHint: { flex: 1, textAlign: "right", fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.line },
  dayLetter: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#5A5F6E" },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1.2, color: "#5A5F6E" },
  commitText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  actionRow: { flexDirection: "row", gap: 10 },
  keptRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  keptText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  undo: { minHeight: 44, paddingHorizontal: 10, justifyContent: "center" },
  undoText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, textDecorationLine: "underline" },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  prayerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  prayerText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: colors.ink },
  prayerMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  answerBtn: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: colors.line, justifyContent: "center" },
  answerText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  answeredBox: { borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 12, gap: 8 },
  verse: { backgroundColor: colors.ink, borderRadius: 22, padding: 18, gap: 10 },
  verseLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, color: "#C9CDD8" },
  verseText: { fontFamily: fonts.display, fontSize: 19, lineHeight: 27, color: colors.white },
  verseLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#E6E8EE" },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
});
