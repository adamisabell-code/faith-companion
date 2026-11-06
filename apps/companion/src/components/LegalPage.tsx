import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, H1, Screen } from "./ui";
import type { Doc } from "@/content/legal";
import { colors, fonts } from "@/lib/theme";

export function LegalPage({ doc }: { doc: Doc }) {
  return (
    <Screen footer={<Button kind="secondary" title="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />}>
      <View style={{ gap: 4 }}>
        <H1>{doc.title}</H1>
        <Text style={st.updated}>Last updated {doc.updated}</Text>
      </View>
      {doc.sections.map((sec, i) => (
        <View key={i} style={{ gap: 8 }}>
          {sec.heading ? <Text accessibilityRole="header" style={st.h2}>{sec.heading}</Text> : null}
          {sec.paragraphs?.map((p, j) => <Text key={j} style={st.p}>{p}</Text>)}
          {sec.bullets?.map((b, j) => (
            <View key={j} style={st.bulletRow}>
              <Text style={st.p}>•</Text>
              <Text style={[st.p, { flex: 1 }]}>{b}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  updated: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.inkSoft },
  h2: { fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink },
  p: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: "#30343F" },
  bulletRow: { flexDirection: "row", gap: 8 },
});
