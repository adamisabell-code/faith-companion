// Small shared building blocks so every screen looks like the designs.
import type { ReactNode } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";

/** Page shell: safe area, cream background, phone-width column on big screens. */
export function Screen({ children, scroll = true, bg = colors.ground, footer }: {
  children: ReactNode; scroll?: boolean; bg?: string; footer?: ReactNode;
}) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={s.scrollBody} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  ) : <View style={[s.scrollBody, { flex: 1 }]}>{children}</View>;
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]} edges={["top", "bottom"]}>
      <View style={s.column}>
        <View style={{ flex: 1 }}>{body}</View>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[s.h1, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, style]}>{children}</Text>;
}

export function Label({ children, style, nativeID }: { children: ReactNode; style?: StyleProp<TextStyle>; nativeID?: string }) {
  return <Text nativeID={nativeID} style={[s.label, style]}>{children}</Text>;
}

export function Button({ title, onPress, kind = "primary", disabled, loading, style, accessibilityLabel }: {
  title: string; onPress?: PressableProps["onPress"]; kind?: "primary" | "secondary" | "link";
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        kind === "primary" ? s.btnPrimary : kind === "secondary" ? s.btnSecondary : s.btnLink,
        off && { opacity: 0.5 },
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={kind === "primary" ? colors.white : colors.ink} /> : (
        <Text style={kind === "primary" ? s.btnPrimaryText : kind === "secondary" ? s.btnSecondaryText : s.btnLinkText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Progress({ step, of }: { step: number; of: number }) {
  return (
    <View style={s.progress} accessibilityLabel={`Step ${step} of ${of}`} accessible>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={[s.progressBar, { backgroundColor: i < step ? colors.ink : colors.line }]} />
      ))}
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const id = `field-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <View style={{ gap: 6 }}>
      <Label nativeID={id}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        aria-labelledby={id}
        placeholderTextColor="#7A7F8C"
        style={s.input}
        {...props}
      />
    </View>
  );
}

/** Selectable chip (single or multi select lists). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected ? { backgroundColor: colors.ink, borderColor: colors.ink } : null]}
    >
      <Text style={[s.chipText, selected ? { color: colors.white } : null]}>{label}</Text>
    </Pressable>
  );
}

/** Large selectable row with a title and subtitle. */
export function OptionRow({ title, sub, selected, onPress, tint }: {
  title: string; sub?: string; selected: boolean; onPress: () => void; tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.option, selected && { borderColor: colors.ink, backgroundColor: tint ?? colors.white }]}
    >
      <Text style={s.optionTitle}>{title}</Text>
      {sub ? <Text style={s.optionSub}>{sub}</Text> : null}
    </Pressable>
  );
}

export const s = StyleSheet.create({
  safe: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  scrollBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18, flexGrow: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  btnPrimary: { minHeight: 56, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnPrimaryText: { fontFamily: fonts.bodyHeavy, fontSize: 17, color: colors.white },
  btnSecondary: { minHeight: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnSecondaryText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  btnLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  btnLinkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#3D4250" },
  progress: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 5, borderRadius: 3 },
  input: { minHeight: 48, borderWidth: 2, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  option: { padding: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.lineSoft, backgroundColor: colors.white, gap: 2 },
  optionTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  optionSub: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
});
