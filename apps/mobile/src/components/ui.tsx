import React, { useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getStatusVariant, radii, semantic, spacing, theme, typography } from "../theme";

export function Screen({ children }: React.PropsWithChildren) {
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return <View style={{ marginBottom: 20 }}><Text style={s.title}>{children}</Text>{sub && <Text style={s.sub}>{sub}</Text>}</View>;
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "decimal-pad" | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
  error?: string;
};

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry, error }: FieldProps) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, multiline && s.multiline, error && s.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor={theme.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      accessibilityLabel={label}
      accessibilityHint={error}
    />
    {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}
  </View>;
}

type DateTimeFieldProps = {
  label: string;
  value: Date | null;
  mode: "date" | "time";
  onChange: (value: Date) => void;
  error?: string;
};

export function DateTimeField({ label, value, mode, onChange, error }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type !== "set" || !selected) return;
    const next = new Date(value ?? selected);
    if (mode === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };
  const displayValue = value
    ? mode === "date"
      ? value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : mode === "date" ? "Choose a date" : "Choose a time";

  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <Pressable
      onPress={() => setOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${displayValue}`}
      style={[s.input, s.dateButton, error && s.inputError]}
    >
      <Text style={{ color: value ? theme.text : theme.muted, fontSize: typography.size.body }}>{displayValue}</Text>
      <Text style={{ color: theme.green, fontWeight: typography.weight.semibold }}>{mode === "date" ? "Calendar" : "Clock"}</Text>
    </Pressable>
    {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}
    {open ? <DateTimePicker
      value={value ?? new Date()}
      mode={mode}
      display={mode === "date" ? "calendar" : "clock"}
      onChange={onPickerChange}
    /> : null}
  </View>;
}

export function Button({ title, onPress, secondary, disabled, loading }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean }) {
  return <Pressable
    disabled={disabled || loading}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    style={[s.button, secondary && s.secondary, disabled && s.disabled]}
  >
    {loading ? <ActivityIndicator color={secondary ? theme.green : theme.white} /> : <Text style={[s.buttonText, secondary && { color: theme.green }]}>{title}</Text>}
  </Pressable>;
}

export function Card({ children }: React.PropsWithChildren) { return <View style={s.card}>{children}</View>; }
export function Message({ text, error }: { text: string; error?: boolean }) { return text ? <Text accessibilityRole={error ? "alert" : "text"} style={{ color: error ? theme.red : theme.green, marginVertical: spacing.sm }}>{text}</Text> : null; }
export function Status({ children, variant }: React.PropsWithChildren<{ variant?: "success" | "error" | "warning" | "info" | "neutral" }>) {
  const label = typeof children === "string" || typeof children === "number" ? String(children) : "";
  const tone = variant ?? getStatusVariant(label);
  const color = tone === "neutral" ? { foreground: theme.muted, background: theme.colors.surfaceSoft, border: theme.border } : semantic[tone];
  return <Text accessibilityRole="text" style={[s.status, { color: color.foreground, backgroundColor: color.background, borderColor: color.border }]}>{children}</Text>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { color: theme.dark, fontWeight: typography.weight.heavy, fontSize: typography.size.title, lineHeight: typography.line.title, letterSpacing: -0.5 },
  sub: { color: theme.muted, marginTop: spacing.xs, lineHeight: typography.line.body },
  field: { marginBottom: spacing.md },
  label: { color: theme.dark, fontWeight: typography.weight.semibold, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.size.body, color: theme.text },
  multiline: { height: 92, textAlignVertical: "top" },
  inputError: { borderColor: theme.red },
  errorText: { color: theme.red, fontSize: typography.size.caption, marginTop: spacing.xxs },
  dateButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  button: { backgroundColor: theme.green, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: "center", marginTop: spacing.xs, minHeight: 50, justifyContent: "center" },
  secondary: { backgroundColor: theme.pale, borderWidth: 1, borderColor: theme.border },
  disabled: { opacity: .55 },
  buttonText: { color: theme.white, fontWeight: typography.weight.bold, fontSize: typography.size.body },
  card: { backgroundColor: theme.white, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md, ...theme.shadows.card },
  status: { overflow: "hidden", alignSelf: "flex-start", borderWidth: 1, borderRadius: radii.pill, paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, marginVertical: spacing.xs },
});
