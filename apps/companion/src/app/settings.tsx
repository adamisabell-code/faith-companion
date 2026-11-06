import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { CompanionPicker } from "@/components/CompanionPicker";
import { TimeCard } from "@/components/TimeCard";
import { Body, Button, Chip, Field, H1, Label, OptionRow, Screen } from "@/components/ui";
import { deleteAccount } from "@/lib/api";
import { SUPPORT_EMAIL } from "@/lib/config";
import { traditionIdFor } from "@/lib/profileDefaults";
import { pushSupported, registerForPush } from "@/lib/push";
import { claimPushToken } from "@/lib/pushToken";
import { timesValid } from "@/lib/times";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, fonts, traditions, translations, type CompanionId } from "@/lib/theme";

const hhmm = (t: string | null | undefined, fallback: string) => (t ? t.slice(0, 5) : fallback);

export default function Settings() {
  const { session, profile, saveProfile, refreshProfile } = useSession();
  const [name, setName] = useState(profile?.first_name ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href="/" />;

  async function save(key: string, patch: Parameters<typeof saveProfile>[0]) {
    setSaving(key); setMessage(null);
    const r = await saveProfile(patch);
    setSaving(null);
    if (r.error) setMessage(r.error);
  }

  async function toggleReminders() {
    setSaving("push"); setMessage(null);
    if (profile!.push_token) {
      await save("push", { push_token: null });
      return;
    }
    const token = await registerForPush();
    if (!token) {
      setSaving(null);
      return setMessage("Notifications are off for this app. You can turn them on in your phone's Settings.");
    }
    const r = await claimPushToken(token);
    if (r.error) setMessage(r.error);
    await refreshProfile();
    setSaving(null);
  }

  function setTime(which: "morning" | "evening", v: string) {
    const morning = which === "morning" ? v : hhmm(profile!.morning_time, "07:00");
    const evening = which === "evening" ? v : hhmm(profile!.evening_time, "20:30");
    if (!timesValid(morning, evening)) return setMessage("Your morning check-in needs to come before your evening one.");
    save(which, which === "morning" ? { morning_time: `${v}:00` } : { evening_time: `${v}:00` });
  }

  async function signOut() {
    // Stop this device from receiving this account's check-ins.
    if (profile?.push_token) await saveProfile({ push_token: null });
    await supabase.auth.signOut();
    router.replace("/welcome");
  }

  async function doDelete() {
    setDeleting(true); setMessage(null);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      router.replace("/welcome");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  return (
    <Screen footer={<Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />}>
      <H1>Settings</H1>
      {message ? <Text accessibilityRole="alert" style={st.msg}>{message}</Text> : null}

      <Section title="Your companion">
        <CompanionPicker value={(profile.companion_id ?? "pip") as CompanionId} onChange={(id) => save("companion", { companion_id: id })} />
      </Section>

      <Section title="About you">
        <Field label="First name" value={name} onChangeText={setName} onEndEditing={() => name.trim() && name !== profile.first_name && save("name", { first_name: name.trim() })} onBlur={() => name.trim() && name !== profile.first_name && save("name", { first_name: name.trim() })} />
        <Label>Church tradition</Label>
        <View style={st.wrap}>
          {traditions.map((t) => (
            <Chip key={t.id} label={t.label} selected={(profile.tradition_choice ?? profile.tradition_id) === t.id}
              onPress={() => save("tradition", { tradition_choice: t.id, tradition_id: traditionIdFor(t.id) })} />
          ))}
        </View>
        <Label>Bible translation</Label>
        {translations.map((t) => (
          <OptionRow key={t.id} title={t.label} sub={t.sub} selected={profile.translation_id === t.id} onPress={() => save("translation", { translation_id: t.id })} />
        ))}
        <Body style={{ fontSize: 13 }}>NIV, ESV and NLT are coming once licensing is in place.</Body>
      </Section>

      <Section title="Check-ins">
        <TimeCard label="Morning" hint="Set today's commitment" value={hhmm(profile.morning_time, "07:00")} onChange={(v) => setTime("morning", v)} accent="#8A4A26" />
        <TimeCard label="Evening" hint="Check in on how it went" value={hhmm(profile.evening_time, "20:30")} onChange={(v) => setTime("evening", v)} accent="#2F5778" />
        {pushSupported ? (
          <Button kind="secondary" loading={saving === "push"} title={profile.push_token ? "Turn off reminders" : "Turn on reminders"} onPress={toggleReminders} />
        ) : (
          <Body style={{ fontSize: 14 }}>On the web, your check-in is waiting when you open the app. Reminders work in the iPhone app.</Body>
        )}
      </Section>

      <Section title="Help & legal">
        <Button kind="secondary" title="Support" onPress={() => router.push("/support")} />
        <Button kind="secondary" title="Privacy Policy" onPress={() => router.push("/privacy")} />
        <Button kind="secondary" title="Terms of Use" onPress={() => router.push("/terms")} />
        <Button kind="link" title={`Email ${SUPPORT_EMAIL}`} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      </Section>

      <Section title="Account">
        <Body style={{ fontSize: 14 }}>Signed in as {session.user.email}</Body>
        <Button kind="secondary" title="Sign out" onPress={signOut} />
        {!confirmDelete ? (
          <Button kind="link" title="Delete my account" onPress={() => setConfirmDelete(true)} />
        ) : (
          <View style={st.danger}>
            <Text style={st.dangerTitle}>Delete your account?</Text>
            <Text style={st.dangerBody}>This permanently deletes your account, conversations, commitments, prayer requests and everything your companion remembers. It can't be undone.</Text>
            <TextInput value={deleteText} onChangeText={setDeleteText} placeholder="Type DELETE to confirm" placeholderTextColor="#8A6A66" autoCapitalize="characters" accessibilityLabel="Type DELETE to confirm" style={st.dangerInput} />
            <Button title="Delete forever" disabled={deleteText.trim().toUpperCase() !== "DELETE"} loading={deleting} onPress={doDelete} style={{ backgroundColor: colors.danger }} />
            <Button kind="link" title="Cancel" onPress={() => { setConfirmDelete(false); setDeleteText(""); }} />
          </View>
        )}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={st.section}>{title}</Text>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  section: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "#5A5F6E", marginTop: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  msg: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.danger },
  danger: { backgroundColor: "#F8E4E1", borderRadius: 18, padding: 16, gap: 10 },
  dangerTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: "#5C1B15" },
  dangerBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: "#5C1B15" },
  dangerInput: { minHeight: 48, borderWidth: 2, borderColor: "#E0B4AE", borderRadius: 14, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
});
