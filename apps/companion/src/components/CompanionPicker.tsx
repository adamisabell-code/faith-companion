// The 2x2 grid of companions plus the "Who is ...?" story panel.
// Used in onboarding and in Settings.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Character } from "./Character";
import { colors, companionOrder, companions, fonts, type CompanionId } from "@/lib/theme";

export function CompanionPicker({ value, onChange }: { value: CompanionId; onChange: (id: CompanionId) => void }) {
  const c = companions[value];
  return (
    <View style={{ gap: 14 }}>
      <View style={st.grid}>
        {companionOrder.map((id) => {
          const on = id === value;
          const info = companions[id];
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${info.name}, ${info.species}. ${info.tagline}`}
              onPress={() => onChange(id)}
              style={[st.card, { backgroundColor: info.tile, borderColor: on ? colors.ink : "transparent" }, on && st.cardOn]}
            >
              <Character id={id} size={72} />
              <Text style={st.name}>{info.name}</Text>
              <Text style={st.species}>{info.species}</Text>
              <Text style={[st.tag, { color: info.accent }]}>{info.tagline}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={st.panel} accessibilityLiveRegion="polite">
        <Text style={st.panelLabel}>WHO IS {c.name.toUpperCase()}?</Text>
        <Text style={st.story}>{c.story}</Text>
        <Text style={st.greeting}>“{c.greeting}”</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", flexGrow: 1, borderRadius: 22, borderWidth: 3, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 2 },
  cardOn: { shadowColor: "#1F2430", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginTop: 2 },
  species: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  tag: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  panel: { backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 6 },
  panelLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1.2, color: "#5A5F6E" },
  story: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  greeting: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21, color: colors.ink },
});
