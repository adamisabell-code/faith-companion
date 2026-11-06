import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CompanionSays } from "@/components/CompanionSays";
import { TimeCard } from "@/components/TimeCard";
import { Button, H1, Progress, Screen } from "@/components/ui";
import { useOnboarding } from "@/lib/onboarding";
import { pushSupported, registerForPush } from "@/lib/push";
import { timesValid } from "@/lib/times";
import { colors, companions, fonts } from "@/lib/theme";

const asks = {
  pip: "Every morning we'll pick one small thing. Every evening I'll ask how it went. When works?",
  bram: "Here's the deal. Morning, you tell me the plan. Night, I ask how it went. When works?",
  sola: "I'll check in gently twice a day: a plan in the morning, a look back at night. When suits you?",
  lumi: "I'll check in morning and evening, no pressure. When would be good?",
} as const;

const reminder = {
  pip: "So I can cheer you on at the right time.",
  bram: "So I can bug you. Lovingly. Without these I can't actually keep you accountable.",
  sola: "So I can check on you when you said you'd want me to.",
  lumi: "Just a gentle nudge, at the times you choose.",
} as const;

export default function Times() {
  const { draft, update } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = companions[draft.companion];

  async function next(askForPush: boolean) {
    setError(null);
    if (!timesValid(draft.morning, draft.evening)) return setError("Your morning check-in needs to come before your evening one.");
    setBusy(true);
    const token = askForPush ? await registerForPush() : null;
    update({ pushToken: token });
    setBusy(false);
    router.push("/consent");
  }

  return (
    <Screen
      footer={pushSupported ? (
        <>
          <Button title="Allow notifications" loading={busy} onPress={() => next(true)} />
          <Button kind="link" title="Not now" onPress={() => next(false)} disabled={busy} />
        </>
      ) : (
        <Button title="Continue" loading={busy} onPress={() => next(false)} />
      )}
    >
      <Progress step={4} of={4} />
      <CompanionSays id={draft.companion}>{asks[draft.companion]}</CompanionSays>
      <H1 style={{ fontSize: 28 }}>Your daily check-ins</H1>
      <TimeCard label="Morning" hint="Set today's commitment" value={draft.morning} onChange={(v) => update({ morning: v })} accent="#8A4A26" />
      <TimeCard label="Evening" hint="Check in on how it went" value={draft.evening} onChange={(v) => update({ evening: v })} accent="#2F5778" />
      <View style={[st.note, { backgroundColor: c.tile }]}>
        <Text style={st.noteTitle}>{pushSupported ? "Turn on reminders" : "Your check-ins"}</Text>
        <Text style={st.noteBody}>
          {pushSupported ? reminder[draft.companion] : `${c.name} will have your check-in waiting each time you open the app. Install the iPhone app for reminders.`}
        </Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  note: { borderRadius: 20, padding: 16, gap: 4 },
  noteTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  noteBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: "#3D3A48" },
  error: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger },
});
