import { router } from "expo-router";
import { CompanionPicker } from "@/components/CompanionPicker";
import { Body, Button, H1, Progress, Screen } from "@/components/ui";
import { useOnboarding } from "@/lib/onboarding";
import { companions } from "@/lib/theme";

export default function PickCompanion() {
  const { draft, update } = useOnboarding();
  return (
    <Screen footer={<Button title={`Continue with ${companions[draft.companion].name}`} onPress={() => router.push("/onboarding/focus")} />}>
      <Progress step={2} of={4} />
      <H1>Who do you want to walk with?</H1>
      <Body style={{ marginTop: -8 }}>Pick a companion. You can switch anytime.</Body>
      <CompanionPicker value={draft.companion} onChange={(id) => update({ companion: id })} />
    </Screen>
  );
}
