import React, { useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "../theme";

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
      <Text style={{ color: value ? theme.text : theme.muted, fontSize: 16 }}>{displayValue}</Text>
      <Text style={{ color: theme.green, fontWeight: "700" }}>{mode === "date" ? "Calendar" : "Clock"}</Text>
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
export function Message({ text, error }: { text: string; error?: boolean }) { return text ? <Text accessibilityRole={error ? "alert" : "text"} style={{ color: error ? theme.red : theme.green, marginVertical: 10 }}>{text}</Text> : null; }
export function Status({ children }: React.PropsWithChildren) { return <Text style={s.status}>{children}</Text>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: theme.dark, fontWeight: "800", fontSize: 27 },
  sub: { color: theme.muted, marginTop: 5, lineHeight: 21 },
  field: { marginBottom: 13 },
  label: { color: theme.dark, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: theme.text },
  multiline: { height: 92, textAlignVertical: "top" },
  inputError: { borderColor: theme.red },
  errorText: { color: theme.red, fontSize: 13, marginTop: 5 },
  dateButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  button: { backgroundColor: theme.green, padding: 15, borderRadius: 13, alignItems: "center", marginTop: 8, minHeight: 50, justifyContent: "center" },
  secondary: { backgroundColor: theme.pale },
  disabled: { opacity: .55 },
  buttonText: { color: theme.white, fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: theme.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  status: { color: theme.green, backgroundColor: theme.pale, overflow: "hidden", alignSelf: "flex-start", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9, fontSize: 12, fontWeight: "700", marginVertical: 5 },
});
