// Renders the companion's replies: *italic* (used for prayers) and **bold**.
import { Text, type StyleProp, type TextStyle } from "react-native";
import { fonts } from "@/lib/theme";

export function RichText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <Text key={i} style={{ fontFamily: fonts.bodyHeavy }}>{p.slice(2, -2)}</Text>;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <Text key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</Text>;
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}
