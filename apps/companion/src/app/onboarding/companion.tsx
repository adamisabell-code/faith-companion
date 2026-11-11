import { router } from "expo-router";
import { CompanionPicker } from "@/components/CompanionPicker";
import { Body, Button, H1, Progress, Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import { useOnboarding } from "@/lib/onboarding";
import { companions } from "@/lib/theme";

export default function PickCompanion() {
  const { draft, update } = useOnboarding();
  return (
    <Screen footer={<Button title={`Continue with ${companions[draft.companion].name}`} onPress={() => { track("onboarding_buddy_picked", { buddy: draft.companion }); router.push("/onboarding/focus"); }} />}>
      <Progress step={1} of={4} />
      <H1>Who do you want to walk with?</H1>
      <Body style={{ marginTop: -8 }}>Four friends, four ways of walking with you. Pick one. You can switch anytime.</Body>
      <CompanionPicker value={draft.companion} onChange={(id) => update({ companion: id })} />
    </Screen>
  );
}
