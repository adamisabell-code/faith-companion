// Explicit permission before any personal data goes to the AI providers
// (App Store guideline 5.1.2(i)). Nothing is sent to Anthropic until this is accepted.
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Body, Button, H1, Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import { clearDraft, useOnboarding } from "@/lib/onboarding";
import { traditionIdFor } from "@/lib/profileDefaults";
import { claimPushToken } from "@/lib/pushToken";
import { deviceTimezone, useSession } from "@/lib/session";
import { colors, companions, fonts } from "@/lib/theme";

export default function Consent() {
  const { draft } = useOnboarding();
  const { session, profile, profileLoading, saveProfile } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  // Existing users (set up before this step existed) only need to give consent.
  const alreadySetUp = !!profile?.onboarded_at;
  const c = companions[alreadySetUp ? profile!.companion_id ?? "pip" : draft.companion];

  if (!session) return <Redirect href="/welcome" />;
  if (profileLoading) return null;

  async function agree() {
    setBusy(true); setError(null);
    const now = new Date().toISOString();
    const res = alreadySetUp ? await saveProfile({ ai_consent_at: now }) : await saveProfile({
      first_name: draft.firstName.trim(),
      tradition_choice: draft.tradition,
      tradition_id: traditionIdFor(draft.tradition),
      translation_id: draft.translation,
      faith_stage: draft.faithStage,
      companion_id: draft.companion,
      focus_areas: draft.focus,
      morning_time: `${draft.morning}:00`,
      evening_time: `${draft.evening}:00`,
      timezone: deviceTimezone(),
      ai_consent_at: now,
      onboarded_at: now,
    });
    if (!res.error && draft.pushToken) await claimPushToken(draft.pushToken);
    setBusy(false);
    if (res.error) return setError(res.error);
    if (!alreadySetUp) { track("onboarding_completed", { buddy: draft.companion }); clearDraft(); }
    router.replace("/chat");
  }

  return (
    <Screen
      footer={
        <>
          <Button title="I agree" loading={busy} onPress={agree} />
          <Button kind="link" title="Not now" onPress={() => setDeclined(true)} disabled={busy} />
        </>
      }
    >
      <H1>One last thing</H1>
      <Body>{c.name} is powered by AI. Before you start, here's exactly what happens with what you share.</Body>

      <View style={st.card}>
        <Point title="Your messages go to Anthropic" body={`To write ${c.name}'s replies, your messages, your first name, the details you picked in setup, and what ${c.name} remembers (commitments, prayer requests) are sent to Anthropic, the company that makes the Claude AI model. Anthropic doesn't use this data to train its models by default.`} />
        <Point title="Verse searches go to Voyage AI" body="To find Bible passages for what you're going through, a short search phrase is sent to Voyage AI." />
        <Point title="Stored privately for you" body="Your conversations are saved in our database so your companion can remember and follow up. No one else can see them. No ads, and we never sell your data." />
        <Point title="You're in control" body="Delete your account and everything in it anytime in Settings." />
      </View>

      <Text style={st.link} onPress={() => router.push("/privacy")}>Read the full Privacy Policy</Text>

      {declined ? (
        <Text accessibilityRole="alert" style={st.notice}>
          No problem. {c.name} can't reply without sending your messages to the AI, so chat stays off until you agree. You can come back to this screen anytime.
        </Text>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
    </Screen>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={st.title}>{title}</Text>
      <Text style={st.body}>{body}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 14 },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: "#3D4250" },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: "underline" },
  notice: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: "#2F5778" },
  error: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger },
});
