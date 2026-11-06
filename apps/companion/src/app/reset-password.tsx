// Opened from the password-reset email (web). Supabase signs the user in from the
// link; this screen lets them choose a new password.
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Body, Button, Field, H1, Screen } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

export default function ResetPassword() {
  const { session } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
  }

  if (!session) {
    return (
      <Screen footer={<Button title="Back to sign in" onPress={() => router.replace("/sign-in?mode=signin")} />}>
        <H1>Reset link expired</H1>
        <Body>This reset link has expired or was already used. Go back and tap "Forgot password?" again to get a new one.</Body>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen footer={<Button title="Continue" onPress={() => router.replace("/")} />}>
        <H1>Password updated</H1>
        <Body>You're all set. If you use the iPhone app, sign in there with your new password.</Body>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Save new password" loading={busy} onPress={save} />}>
      <H1>Choose a new password</H1>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" onSubmitEditing={save} />
      {error ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger }}>{error}</Text> : null}
    </Screen>
  );
}
