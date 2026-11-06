import { router } from "expo-router";
import { View } from "react-native";
import { Button, Chip, Field, H1, Label, OptionRow, Progress, Screen } from "@/components/ui";
import { useOnboarding } from "@/lib/onboarding";
import { defaultTranslation } from "@/lib/profileDefaults";
import { faithStages, traditions, translations } from "@/lib/theme";

export default function About() {
  const { draft, update } = useOnboarding();
  return (
    <Screen footer={<Button title="Continue" disabled={!draft.firstName.trim()} onPress={() => router.push("/onboarding/companion")} />}>
      <Progress step={1} of={4} />
      <H1>Tell us a little about you</H1>
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
