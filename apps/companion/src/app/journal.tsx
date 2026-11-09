// The Journal: a quiet record of what God has done and the milestones of the user's world.
// No counts or totals on purpose: prayer isn't a scoreboard. The intro nods to the stone
// Samuel set up so Israel would remember (1 Samuel 7:12). Referenced, never quoted.
import { Redirect, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Character } from "@/components/Character";
import { CHAPTER_SIZE, chapterInfo, chaptersDone } from "@/lib/chapters";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { companions, fonts, type CompanionId } from "@/lib/theme";
import { darkPage, lightPage, periodNow } from "@/lib/timeOfDay";

type Answered = { id: string; text: string; updated_at: string };

const worldName: Record<CompanionId, string> = { pip: "Pip's garden", bram: "Bram's road", sola: "Sola's tree", lumi: "Lumi's sky" };

function longDate(s: string) {
  const d = s.length === 10 ? new Date(`${s}T12:00:00`) : new Date(s);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Journal() {
  const { session, profile } = useSession();
  const insets = useSafeAreaInsets();
  const page = periodNow() === "night" ? darkPage : lightPage;
  const [keptDates, setKeptDates] = useState<string[]>([]);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, a, n] = await Promise.all([
      supabase.from("commitments").select("for_date").in("status", ["done", "partial"]).order("for_date", { ascending: true }).limit(5000),
      supabase.from("prayer_requests").select("id, text, updated_at").eq("status", "answered").order("updated_at", { ascending: true }).limit(2000),
      supabase.from("constellation_names").select("number, name"),
    ]);
    setKeptDates(((k.data ?? []) as { for_date: string }[]).map((r) => r.for_date));
    setAnswered((a.data ?? []) as Answered[]);
    setNames(Object.fromEntries(((n.data ?? []) as { number: number; name: string }[]).map((r) => [r.number, r.name])));
    setLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { if (session) load(); }, [session, load]));

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href="/" />;

  const id = (profile.companion_id ?? "pip") as CompanionId;
  const c = companions[id];
  const size = CHAPTER_SIZE[id];
  const done = chaptersDone(keptDates.length, size);
  // The date each chapter was finished: the date of its last kept day.
  const finishedOn = (n: number) => keptDates[n * size - 1] ?? null;
  const tint = page.dark ? "#C8D5E8" : "#4A3F5E";

  async function saveName(number: number) {
    const v = draft.trim();
    if (!v) return;
    setError(null);
    const { error } = await supabase.from("constellation_names").upsert({ user_id: session!.user.id, number, name: v });
    if (error) return setError("Couldn't save that. Try again in a moment.");
    setNames((m) => ({ ...m, [number]: v }));
    setEditing(null); setDraft("");
  }

  const chapters = Array.from({ length: done }, (_, i) => done - i); // newest first

  return (
    <View style={[st.root, { backgroundColor: page.bg }]}>
      <StatusBar style={page.dark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={[st.column, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 40 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={st.back} hitSlop={8}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={page.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 6l-6 6 6 6" /></Svg>
        </Pressable>

        <Text style={[st.title, { color: page.text }]} accessibilityRole="header">Journal</Text>
        <Text style={[st.intro, { color: page.muted }]}>
          When God helped Israel, Samuel set up a stone so they would never forget it. This is a place to remember too: what God has done, and the road you've walked with {c.name}.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/chat", params: { send: "Can we read 1 Samuel 7:12 together?" } })} hitSlop={6}>
          <Text style={[st.ref, { color: tint }]}>Read 1 Samuel 7:12 with {c.name}</Text>
        </Pressable>

        {/* What God has done */}
        <View style={st.section}>
          <Text style={[st.label, { color: page.label }]}>WHAT GOD HAS DONE</Text>
          {loaded && answered.length === 0 ? (
            <Text style={[st.empty, { color: page.muted }]}>Nothing here yet. When a prayer is answered, tap "Answered" on Home and it's written here.</Text>
          ) : null}
          {[...answered].reverse().map((p) => (
            <View key={p.id} style={[st.row, { borderBottomColor: page.lineSoft }]}>
              <Text style={[st.prayer, { color: page.text }]}>{p.text}</Text>
              <Text style={[st.small, { color: page.muted }]}>Answered {longDate(p.updated_at)}</Text>
            </View>
          ))}
        </View>

        {/* The companion's world, chapter by chapter */}
        <View style={st.section}>
          <View style={st.sectionHead}>
            <Character id={id} size={36} />
            <Text style={[st.label, { color: page.label }]}>{worldName[id].toUpperCase()}</Text>
          </View>

          {chapters.map((n) => {
            const info = chapterInfo(id, n);
            const when = finishedOn(n);
            if (id === "lumi") {
              const name = names[n];
              return (
                <View key={n} style={[st.row, { borderBottomColor: page.lineSoft }]}>
                  <Text style={[st.kicker, { color: page.label }]}>CONSTELLATION {n}</Text>
                  {editing === n ? (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        maxLength={40}
                        autoFocus
                        placeholder="Give it a name"
                        placeholderTextColor={page.muted}
                        onSubmitEditing={() => saveName(n)}
                        accessibilityLabel={`Name for constellation ${n}`}
                        style={[st.input, { color: page.text, borderColor: page.pill, backgroundColor: page.composerBg }]}
                      />
                      {error ? <Text style={[st.small, { color: "#B5523B" }]}>{error}</Text> : null}
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <Pressable accessibilityRole="button" onPress={() => saveName(n)} hitSlop={6}><Text style={[st.link, { color: tint }]}>Save</Text></Pressable>
                        <Pressable accessibilityRole="button" onPress={() => { setEditing(null); setError(null); }} hitSlop={6}><Text style={[st.link, { color: page.muted }]}>Cancel</Text></Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={[st.rowTitle, { color: name ? page.text : page.muted }]}>{name ? `“${name}”` : "Not named yet"}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        {when ? <Text style={[st.small, { color: page.muted }]}>{longDate(when)}</Text> : null}
                        <Pressable accessibilityRole="button" accessibilityLabel={name ? `Rename constellation ${n}` : `Name constellation ${n}`} onPress={() => { setEditing(n); setDraft(name ?? ""); setError(null); }} hitSlop={8}>
                          <Text style={[st.link, { color: tint }]}>{name ? "Rename" : "Name it"}</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            }
            return (
              <View key={n} style={[st.row, { borderBottomColor: page.lineSoft }]}>
                <Text style={[st.kicker, { color: page.label }]}>CHAPTER {n}</Text>
                <Text style={[st.rowTitle, { color: page.text }]}>{info.title}</Text>
                {when ? <Text style={[st.small, { color: page.muted }]}>Finished {longDate(when)}</Text> : null}
              </View>
            );
          })}
          {loaded && done === 0 ? (
            <Text style={[st.empty, { color: page.muted }]}>
              {id === "lumi"
                ? "Every seven kept days become a constellation, and each one is written here."
                : "As your world grows, each chapter is written here."}
            </Text>
          ) : null}
        </View>

        {keptDates.length ? (
          <Text style={[st.footer, { color: page.muted }]}>Your first kept day: {longDate(keptDates[0])}.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  column: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, marginTop: 8 },
  intro: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, marginTop: 12 },
  ref: { fontFamily: fonts.bodySemi, fontSize: 14, textDecorationLine: "underline", marginTop: 10 },
  section: { marginTop: 32, gap: 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.3 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.2 },
  row: { paddingVertical: 14, borderBottomWidth: 1, gap: 4 },
  rowTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26 },
  prayer: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 25 },
  small: { fontFamily: fonts.body, fontSize: 13 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: "underline" },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 8 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16 },
  footer: { fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: 32 },
});
