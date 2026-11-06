// Email + password sign up / sign in. (Password, not magic links, so App Review
// can sign in with a demo account.)
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Body, Button, Field, H1, Screen } from "@/components/ui";
import { WEB_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(params.mode === "signin" ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null); setNotice(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: e, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then come back and sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw error;
      }
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(/invalid login/i.test(msg) ? "That email and password don't match." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError(null); setNotice(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError("Enter your email first, then tap Forgot password.");
    // The reset link always opens the web app's reset page (works from any phone's browser).
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: `${WEB_URL}/reset-password` });
    if (error) setError(error.message);
    else setNotice("If that email has an account, a reset link is on its way.");
  }

  return (
    <Screen
      footer={
        <>
          <Button title={mode === "signup" ? "Create account" : "Sign in"} onPress={submit} loading={busy} />
          <Button
            kind="link"
            title={mode === "signup" ? "I already have an account" : "New here? Create an account"}
            onPress={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setNotice(null); }}
          />
        </>
      }
    >
      <View style={{ gap: 8, marginTop: 12 }}>
        <H1>{mode === "signup" ? "Create your account" : "Welcome back"}</H1>
        <Body>{mode === "signup" ? "So your companion can remember your prayers and check in on you." : "Sign in to pick up where you left off."}</Body>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" textContentType="emailAddress" placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} textContentType={mode === "signup" ? "newPassword" : "password"} placeholder="At least 8 characters" onSubmitEditing={submit} />
      {mode === "signin" ? <Button kind="link" title="Forgot password?" onPress={forgot} style={{ alignSelf: "flex-start" }} /> : null}
      {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="alert" style={st.notice}>{notice}</Text> : null}
      <Text style={st.legal}>
        By continuing you agree to the{" "}
        <Text style={st.link} onPress={() => router.push("/terms")}>Terms</Text> and{" "}
        <Text style={st.link} onPress={() => router.push("/privacy")}>Privacy Policy</Text>.
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  error: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger },
  notice: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#2F5778" },
  legal: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  link: { fontFamily: fonts.bodyBold, color: colors.ink, textDecorationLine: "underline" },
});
