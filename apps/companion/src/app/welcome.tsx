import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Character } from "@/components/Character";
import { Body, Button, H1, Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import { colors, companionOrder, companions, fonts } from "@/lib/theme";

export default function Welcome() {
  useEffect(() => { track("welcome_viewed"); }, []);
  return (
    <Screen
      footer={
        <>
          <Button title="Meet your buddy" onPress={() => router.push("/onboarding/companion")} />
          <Button kind="link" title="I already have an account" onPress={() => router.push("/sign-in?mode=signin")} />
        </>
      }
    >
      <View style={st.grid}>
        {companionOrder.map((id) => (
          <View key={id} style={[st.tile, { backgroundColor: companions[id].tile }]}>
            <Character id={id} size={84} />
            <Text style={st.tileName}>
              {companions[id].name} <Text style={st.tileKind}>· {companions[id].species.replace(/^An? (little |lost |talking )?/, "")}</Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <H1 style={{ fontSize: 34, lineHeight: 38 }}>A friend for your walk with God.</H1>
        <Body>Pray, read, and stay accountable with a companion who remembers what matters and checks in on you.</Body>
      </View>
      <View style={st.note}>
        <Text style={st.noteText}>Your companion points you to God. It isn't God, a pastor or a counselor, and it always quotes real Scripture.</Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  tile: { width: "47%", flexGrow: 1, height: 140, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 4 },
  tileName: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  tileKind: { fontFamily: fonts.bodySemi, color: "#3D4250" },
  note: { backgroundColor: colors.white, borderRadius: 16, padding: 14 },
  noteText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: "#3D4250" },
});
