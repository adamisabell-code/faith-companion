import { Redirect, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Character } from "@/components/Character";
import { RichText } from "@/components/RichText";
import { openChat, sendMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, companions, fonts } from "@/lib/theme";

type Msg = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

export default function Chat() {
  const { session, profile, profileLoading } = useSession();
  // prefill: put text in the box; send: send it right away (quick replies on Home).
  const params = useLocalSearchParams<{ prefill?: string; send?: string }>();
  const autoSend = useRef<string | null>(typeof params.send === "string" && params.send.trim() ? params.send.trim() : null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState(typeof params.prefill === "string" ? params.prefill : "");
  const [error, setError] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const companionId = profile?.companion_id ?? "pip";
  const c = companions[companionId];

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from("messages").select("id, role, content")
      .order("created_at", { ascending: false }).limit(80);
    setMessages(((data ?? []) as Msg[]).reverse());
  }, []);

  // On open: show history, then let the server add a check-in or first greeting if one is due.
  useEffect(() => {
    if (!session || !profile?.onboarded_at || !profile.ai_consent_at) return;
    let alive = true;
    (async () => {
      await loadMessages();
      if (alive) setLoading(false);
      try {
        setThinking(true);
        const r = await openChat();
        if (alive && r.reply) await loadMessages();
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setThinking(false);
      }
      const queued = autoSend.current;
      autoSend.current = null;
      if (alive && queued) await send(queued);
    })();
    return () => { alive = false; };
  }, [session, profile?.onboarded_at, profile?.ai_consent_at, loadMessages]);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, thinking]);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || (thinking && !override)) return;
    if (!override) setInput("");
    setError(null);
    const temp: Msg = { id: `temp-${Date.now()}`, role: "user", content: text, pending: true };
    setMessages((m) => [...m, temp]);
    setThinking(true);
    try {
      const r = await sendMessage(text);
      setMessages((m) => [
        ...m.map((x) => (x.id === temp.id ? { ...x, pending: false } : x)),
        ...(r.reply ? [{ id: r.message_id ?? `reply-${Date.now()}`, role: "assistant" as const, content: r.reply }] : []),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      if (!override) setInput(text);
    } finally {
      setThinking(false);
    }
  }

  async function report(m: Msg) {
    const { error: err } = await supabase.from("message_reports").insert({
      user_id: session!.user.id,
      message_id: m.id.startsWith("reply-") ? null : m.id,
      content: m.content,
    });
    if (err) setError("Couldn't send the report. Try again.");
    else setReported((r) => new Set(r).add(m.id));
  }

  if (!session) return <Redirect href="/welcome" />;
  if (profileLoading) return null;
  if (!profile?.onboarded_at) return <Redirect href="/onboarding/about" />;
  if (!profile.ai_consent_at) return <Redirect href="/consent" />;

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: c.tint }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={st.column} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[st.header, { backgroundColor: c.tile }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={st.iconBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 18l-6-6 6-6" /></Svg>
          </Pressable>
          <View style={st.avatar}><Character id={companionId} size={40} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.name} accessibilityRole="header">{c.name}</Text>
            <Text style={st.sub}>{thinking ? "typing…" : c.species}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={st.iconBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled">
          {loading ? <ActivityIndicator color={colors.ink} style={{ marginTop: 40 }} /> : null}
          {messages.map((m) => (
            <View key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "84%", gap: 4 }}>
              <Pressable
                onLongPress={m.role === "assistant" ? () => setActionFor(actionFor === m.id ? null : m.id) : undefined}
                accessibilityHint={m.role === "assistant" ? "Long press for options" : undefined}
                style={[st.bubble, m.role === "user" ? [st.userBubble, { backgroundColor: c.bubble }] : st.botBubble, m.pending && { opacity: 0.7 }]}
              >
                <RichText text={m.content} style={[st.msgText, m.role === "user" && { color: colors.white }]} />
              </Pressable>
              {actionFor === m.id ? (
                <View style={st.actions}>
                  {reported.has(m.id) ? <Text style={st.actionDone}>Reported. Thank you.</Text> : (
                    <Pressable accessibilityRole="button" onPress={() => report(m)} style={st.actionBtn}>
                      <Text style={st.actionText}>Report this reply</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          ))}
          {thinking && !loading ? (
            <View style={[st.bubble, st.botBubble, { alignSelf: "flex-start" }]}>
              <Text style={[st.msgText, { color: colors.inkSoft }]}>{c.name} is typing…</Text>
            </View>
          ) : null}
          {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
        </ScrollView>

        <View style={st.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${c.name}`}
            placeholderTextColor="#7A7F8C"
            accessibilityLabel={`Message ${c.name}`}
            style={st.input}
            multiline
            maxLength={2000}
            onSubmitEditing={Platform.OS === "web" ? () => send() : undefined}
            blurOnSubmit={Platform.OS === "web"}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !input.trim() || thinking }}
            onPress={() => send()}
            style={[st.send, (!input.trim() || thinking) && { opacity: 0.4 }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12h14" /><Path d="M13 6l6 6-6 6" />
            </Svg>
          </Pressable>
        </View>
        <Text style={st.disclaimer}>{c.name} is an AI companion, not a pastor or counselor. In a crisis, call or text 988.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 12, paddingVertical: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#3D4250" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  botBubble: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  userBubble: { borderBottomRightRadius: 4 },
  msgText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, justifyContent: "center" },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  actionDone: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.danger, textAlign: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: "#DCD8E6" },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderWidth: 1, borderColor: "#C9C4D8", borderRadius: 22, backgroundColor: "#F7F6FA", paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  disclaimer: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: "#5A5F6E", textAlign: "center", paddingHorizontal: 16, paddingBottom: 6, backgroundColor: colors.white },
});
