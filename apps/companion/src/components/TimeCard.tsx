// A check-in time with -/+ buttons (30-minute steps). Works the same on every platform.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TimeCard({ label, hint, value, onChange, accent }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; accent: string;
}) {
  return (
    <View style={st.card}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[st.label, { color: accent }]}>{label.toUpperCase()}</Text>
        <Text style={st.time} accessibilityLiveRegion="polite">{formatTime(value)}</Text>
        <Text style={st.hint}>{hint}</Text>
      </View>
      <View style={st.buttons}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 30 minutes earlier`} onPress={() => onChange(shift(value, -30))} style={st.step}>
          <Text style={st.stepText}>−</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 30 minutes later`} onPress={() => onChange(shift(value, 30))} style={st.step}>
          <Text style={st.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 1 },
  time: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  buttons: { flexDirection: "row", gap: 8 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: fonts.bodyHeavy, fontSize: 22, lineHeight: 24, color: colors.ink },
});
