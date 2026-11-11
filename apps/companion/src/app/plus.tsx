// Amen Buddy Plus. Honest by design: prayer, Scripture and check-ins are free for
// everyone; Plus pays for the long conversations, which cost real money to run.
// No countdowns, no guilt. While purchases aren't live this screen takes no money.
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Character } from "@/components/Character";
import { Body, Button, H1, Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import { APP_NAME } from "@/lib/config";
import { freeForever, plans, plusAdds, PURCHASES_LIVE, usePlus, type PlanId } from "@/lib/plus";
import { useSession } from "@/lib/session";
import { colors, companions, fonts, type CompanionId } from "@/lib/theme";

export default function Plus() {
  const { session, profile } = useSession();
  const { plus } = usePlus();
  const [plan, setPlan] = useState<PlanId>("annual");
  const [asked, setAsked] = useState(false);

  useEffect(() => { if (session) track("plus_viewed"); }, [session]);
  if (!session) return <Redirect href="/welcome" />;

  const id = (profile?.companion_id ?? "pip") as CompanionId;
  const c = companions[id];
  const back = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  function tellMe() {
    track("plus_interest", { plan });
    setAsked(true);
  }

  return (
    <Screen
      footer={
        plus ? <Button title="Done" onPress={back} /> : (
          <>
            {asked ? (
              <Text accessibilityRole="alert" style={st.thanks}>Thank you. We've noted it, and nothing has been charged.</Text>
            ) : PURCHASES_LIVE ? (
              // TODO(launch): replace with the store purchase call once payments are approved and set up.
              <Button title={plan === "annual" ? "Start 7 days free" : "Continue"} onPress={tellMe} />
            ) : (
              <Button title="I'd want this" onPress={tellMe} />
            )}
            <Button kind="link" title="Not now" onPress={back} />
          </>
        )
      }
    >
      <View style={st.hero}>
        <View style={[st.avatar, { backgroundColor: c.tile }]}><Character id={id} size={76} eyes="happy" /></View>
        <H1 style={{ textAlign: "center" }}>{plus ? "You have Plus" : `${APP_NAME} Plus`}</H1>
        <Body style={{ textAlign: "center" }}>
          {plus
            ? `Thank you. You're helping keep ${APP_NAME} free for everyone who needs it.`
            : `Prayer, Scripture and your check-ins are free, and always will be. Plus is for when you want more time with ${c.name}.`}
        </Body>
      </View>

      <View style={st.card}>
        <Text style={st.label}>PLUS ADDS</Text>
        {plusAdds.map((f) => (
          <View key={f.title} style={{ gap: 2 }}>
            {f.soon ? <Text style={st.soon}>COMING SOON</Text> : null}
            <Text style={st.title}>{f.title}</Text>
            <Text style={st.body}>{f.body}</Text>
          </View>
        ))}
      </View>

      {plus ? null : (
        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          {(Object.keys(plans) as PlanId[]).map((p) => {
            const on = plan === p;
            return (
              <Pressable key={p} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPlan(p)}
                style={[st.plan, on && { borderColor: colors.ink, backgroundColor: colors.white }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.title}>{plans[p].title}</Text>
                  <Text style={st.body}>{plans[p].note}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={st.price}>{plans[p].price}</Text>
                  <Text style={st.per}>{plans[p].per}</Text>
                </View>
              </Pressable>
            );
          })}
          {PURCHASES_LIVE ? null : <Text style={st.fine}>Plus isn't open yet, so you can't be charged. Prices may change before it opens.</Text>}
        </View>
      )}

      <View style={st.card}>
        <Text style={st.label}>FREE FOR EVERYONE, ALWAYS</Text>
        {freeForever.map((f) => <Text key={f} style={st.body}>{"•  "}{f}</Text>)}
      </View>

      <Text style={st.fine}>
        Why charge at all? {c.name} runs on AI that costs real money every time you talk. Plus covers that, so the parts that matter most can stay free.
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: "center", gap: 10, marginTop: 8 },
  avatar: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 12 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1.2, color: "#5A5F6E" },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  soon: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1, color: "#5A5F6E" },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: "#3D4250" },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, borderRadius: 18, borderWidth: 2, borderColor: colors.lineSoft, paddingHorizontal: 16, paddingVertical: 12 },
  price: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  per: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft, textAlign: "center" },
  thanks: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: "#2F5778", textAlign: "center" },
});
