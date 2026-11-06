// Avatar + speech bubble, used where the chosen companion "speaks" during onboarding.
import { StyleSheet, Text, View } from "react-native";
import { Character } from "./Character";
import { colors, companions, fonts, type CompanionId } from "@/lib/theme";

export function CompanionSays({ id, children }: { id: CompanionId; children: string }) {
  return (
    <View style={st.row}>
      <View style={[st.avatar, { backgroundColor: companions[id].tile }]}>
        <Character id={id} size={46} />
      </View>
      <Text style={st.bubble}>{children}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bubble: {
    flex: 1, backgroundColor: colors.white, borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.ink,
  },
});
