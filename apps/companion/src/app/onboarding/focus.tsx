import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CompanionSays } from "@/components/CompanionSays";
import { Button, H1, Progress, Screen } from "@/components/ui";
import { useOnboarding } from "@/lib/onboarding";
import { colors, companions, focusAreas, fonts } from "@/lib/theme";

const prompts = {
  pip: "What would you like to grow in? Pick up to three.",
  bram: "Alright. What are we working on? Pick up to three. I'll keep track.",
  sola: "What's on your heart lately? Pick up to three.",
  lumi: "No pressure. What would you like help with? Pick up to three.",
} as const;

export default function Focus() {
  const { draft, update } = useOnboarding();
  const c = companions[draft.companion];

  function toggle(id: string) {
    const has = draft.focus.includes(id);
    if (has) update({ focus: draft.focus.filter((x) => x !== id) });
    else if (draft.focus.length < 3) update({ focus: [...draft.focus, id] });
  }

  return (
    <Screen footer={<Button title="Continue" disabled={!draft.focus.length} onPress={() => router.push("/onboarding/times")} />}>
      <Progress step={3} of={4} />
      <CompanionSays id={draft.companion}>{prompts[draft.companion]}</CompanionSays>
      <H1 style={{ fontSize: 28 }}>I want help with…</H1>
      <View style={st.grid}>
        {focusAreas.map((f) => {
          const on = draft.focus.includes(f.id);
          return (
            <Pressable
              key={f.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(f.id)}
              style={[st.card, on && { backgroundColor: c.tile, borderColor: c.accent }]}
            >
              <Text style={st.title}>{f.title}</Text>
              <Text style={st.sub}>{f.sub}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={st.count}>{draft.focus.length} of 3 picked</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "47%", flexGrow: 1, minHeight: 92, padding: 14, borderRadius: 18, borderWidth: 2, borderColor: colors.lineSoft, backgroundColor: colors.white, gap: 4 },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  count: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
});
