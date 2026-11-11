import { router } from "expo-router";
import { View } from "react-native";
import { CompanionSays } from "@/components/CompanionSays";
import { Button, Chip, Field, Label, OptionRow, Progress, Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import { useOnboarding } from "@/lib/onboarding";
import { defaultTranslation } from "@/lib/profileDefaults";
import { useSession } from "@/lib/session";
import { faithStages, traditions, translations } from "@/lib/theme";

const asks = {
  pip: "First things first. What should I call you?",
  bram: "Before we go anywhere: what do I call you?",
  sola: "I'd love to know your name, and a little about you.",
  lumi: "What's your name? No rush. The rest is so I read the Bible the way you do.",
} as const;

export default function About() {
  const { draft, update } = useOnboarding();
  const { session } = useSession();

  function next() {
    track("onboarding_about_done", { tradition: draft.tradition, translation: draft.translation });
    // Already signed in (e.g. came back after confirming an email): skip straight on.
    router.push(session ? "/onboarding/times" : "/sign-in?mode=signup");
  }

  return (
    <Screen footer={<Button title="Continue" disabled={!draft.firstName.trim()} onPress={next} />}>
      <Progress step={3} of={4} />
      <CompanionSays id={draft.companion}>{asks[draft.companion]}</CompanionSays>
      <Field label="First name" value={draft.firstName} onChangeText={(t) => update({ firstName: t })} placeholder="Your first name" autoComplete="given-name" textContentType="givenName" />
      <View style={{ gap: 8 }}>
        <Label>Your church tradition</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {traditions.map((t) => (
            <Chip key={t.id} label={t.label} selected={draft.tradition === t.id}
              onPress={() => update({ tradition: t.id, ...(draft.translationTouched ? {} : { translation: defaultTranslation(t.id) }) })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Label>Which Bible do you like to read?</Label>
        {translations.map((t) => (
          <OptionRow key={t.id} title={t.label} sub={t.sub} selected={draft.translation === t.id}
            onPress={() => update({ translation: t.id, translationTouched: true })} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Label>Where are you right now?</Label>
        {faithStages.map((f) => (
          <OptionRow key={f.id} title={f.title} sub={f.sub} selected={draft.faithStage === f.id} onPress={() => update({ faithStage: f.id })} />
        ))}
      </View>
    </Screen>
  );
}
