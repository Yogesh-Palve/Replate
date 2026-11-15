import React, { useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";
import { colors, getStatusVariant, radii, semantic, spacing, theme, typography } from "../theme";

export function Screen({ children }: React.PropsWithChildren) {
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

export function Title({ children, sub, eyebrow }: { children: React.ReactNode; sub?: string; eyebrow?: string }) {
  return <View style={s.titleWrap}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}<Text style={s.title}>{children}</Text>{sub && <Text style={s.sub}>{sub}</Text>}</View>;
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
  icon?: LucideIconName;
  autoComplete?: "email" | "name" | "password" | "off";
};

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry, error, icon, autoComplete }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={[s.inputFrame, focused && s.inputFocused, error && s.inputError, multiline && s.multilineFrame]}>
      {icon ? <Lucide name={icon} size={19} color={focused ? theme.green : theme.muted} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      <TextInput
        style={[s.input, multiline && s.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        accessibilityHint={error}
      />
    </View>
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
      style={[s.inputFrame, s.dateButton, error && s.inputError]}
    >
      <Lucide name={mode === "date" ? "calendar-days" : "clock-3"} size={19} color={theme.green} accessibilityElementsHidden importantForAccessibility="no" />
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

export function Button({ title, onPress, secondary, disabled, loading, icon, destructive }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean; icon?: LucideIconName; destructive?: boolean }) {
  return <Pressable
    disabled={disabled || loading}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    style={({ pressed }) => [s.button, secondary && s.secondary, destructive && s.destructive, disabled && s.disabled, pressed && !disabled && s.pressed]}
  >
    {loading ? <ActivityIndicator color={secondary ? theme.green : theme.white} /> : <View style={s.buttonContent}>{icon ? <Lucide name={icon} size={18} color={secondary ? theme.green : theme.white} accessibilityElementsHidden importantForAccessibility="no" /> : null}<Text style={[s.buttonText, secondary && { color: theme.green }]}>{title}</Text></View>}
  </Pressable>;
}

export function Card({ children, style }: React.PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[s.card, style]}>{children}</View>; }
export function Message({ text, error }: { text: string; error?: boolean }) { return text ? <Text accessibilityRole={error ? "alert" : "text"} style={{ color: error ? theme.red : theme.green, marginVertical: spacing.sm }}>{text}</Text> : null; }
export function Status({ children, variant }: React.PropsWithChildren<{ variant?: "success" | "error" | "warning" | "info" | "neutral" }>) {
  const label = typeof children === "string" || typeof children === "number" ? String(children) : "";
  const tone = variant ?? getStatusVariant(label);
  const color = tone === "neutral" ? { foreground: theme.muted, background: theme.colors.surfaceSoft, border: theme.border } : semantic[tone];
  return <Text accessibilityRole="text" style={[s.status, { color: color.foreground, backgroundColor: color.background, borderColor: color.border }]}>{children}</Text>;
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <View style={s.sectionHeading}><View style={s.sectionCopy}><Text style={s.sectionTitle}>{title}</Text>{subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}</View>{action}</View>;
}

export function EmptyState({ icon, title, description, action }: { icon: LucideIconName; title: string; description: string; action?: React.ReactNode }) {
  return <View style={s.emptyState}><View style={s.emptyIcon}><Lucide name={icon} size={25} color={theme.green} accessibilityElementsHidden importantForAccessibility="no" /></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDescription}>{description}</Text>{action}</View>;
}

export function LoadingState({ label = "Loading your RePlate activity" }: { label?: string }) {
  return <View style={s.loadingState}><ActivityIndicator color={theme.green} /><Text accessibilityRole="text" style={s.loadingLabel}>{label}</Text></View>;
}

export function IconBadge({ icon, tone = "sage" }: { icon: LucideIconName; tone?: "sage" | "gold" | "green" }) {
  const backgroundColor = tone === "gold" ? "#FFF5E2" : tone === "green" ? "#EAF4EC" : "#EEF3E9";
  const color = tone === "gold" ? "#765416" : theme.green;
  return <View style={[s.iconBadge, { backgroundColor }]}><Lucide name={icon} size={20} color={color} accessibilityElementsHidden importantForAccessibility="no" /></View>;
}

export function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: LucideIconName }) {
  return <View style={s.metricCard}><IconBadge icon={icon} /><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}

export function FilterChip({ label, selected, onPress, count }: { label: string; selected: boolean; onPress: () => void; count?: number }) {
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }} style={({ pressed }) => [s.filterChip, selected && s.filterChipSelected, pressed && s.pressed]}>
    <Text style={[s.filterChipLabel, selected && s.filterChipLabelSelected]}>{label}</Text>
    {count !== undefined ? <Text style={[s.filterChipCount, selected && s.filterChipCountSelected]}>{count}</Text> : null}
  </Pressable>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  titleWrap: { marginBottom: spacing.xl },
  eyebrow: { color: theme.green, fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { color: theme.dark, fontWeight: typography.weight.heavy, fontSize: typography.size.title, lineHeight: typography.line.title, letterSpacing: -0.7 },
  sub: { color: theme.muted, marginTop: spacing.xs, lineHeight: typography.line.body, fontSize: typography.size.small },
  field: { marginBottom: spacing.md },
  label: { color: theme.dark, fontWeight: typography.weight.semibold, marginBottom: spacing.xs, fontSize: typography.size.small },
  inputFrame: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  input: { flex: 1, minWidth: 0, padding: 0, minHeight: 38, fontSize: typography.size.body, color: theme.text },
  inputFocused: { borderColor: theme.green, shadowColor: theme.green, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  multilineFrame: { alignItems: "flex-start", paddingVertical: spacing.sm },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  inputError: { borderColor: theme.red },
  errorText: { color: theme.red, fontSize: typography.size.caption, marginTop: spacing.xxs },
  dateButton: { minHeight: 54, justifyContent: "flex-start" },
  button: { backgroundColor: theme.green, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: "center", marginTop: spacing.sm, minHeight: 54, justifyContent: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  secondary: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border },
  destructive: { backgroundColor: theme.red },
  disabled: { opacity: .55 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  buttonText: { color: theme.white, fontWeight: typography.weight.bold, fontSize: typography.size.body },
  card: { backgroundColor: theme.white, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md, ...theme.shadows.card },
  status: { overflow: "hidden", alignSelf: "flex-start", borderWidth: 1, borderRadius: radii.pill, paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, marginVertical: spacing.xs },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
  sectionCopy: { flex: 1, gap: spacing.xxs },
  sectionTitle: { color: theme.dark, fontSize: typography.size.heading, lineHeight: typography.line.heading, fontWeight: typography.weight.bold, letterSpacing: -0.35 },
  sectionSubtitle: { color: theme.muted, fontSize: typography.size.small, lineHeight: typography.line.small },
  emptyState: { alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyIcon: { width: 54, height: 54, borderRadius: radii.lg, backgroundColor: theme.pale, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { color: theme.dark, fontSize: typography.size.subtitle, fontWeight: typography.weight.bold, textAlign: "center" },
  emptyDescription: { color: theme.muted, fontSize: typography.size.small, lineHeight: typography.line.small, textAlign: "center", marginTop: spacing.xs },
  loadingState: { minHeight: 140, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  loadingLabel: { color: theme.muted, fontSize: typography.size.small },
  iconBadge: { width: 44, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  metricCard: { flex: 1, minWidth: 100, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs, ...theme.shadows.card },
  metricValue: { color: theme.dark, fontSize: typography.size.title, lineHeight: typography.line.title, fontWeight: typography.weight.heavy, marginTop: spacing.xs },
  metricLabel: { color: theme.muted, fontSize: typography.size.caption, lineHeight: typography.line.caption, fontWeight: typography.weight.medium },
  filterChip: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white },
  filterChipSelected: { borderColor: theme.green, backgroundColor: theme.green },
  filterChipLabel: { color: theme.muted, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },
  filterChipLabelSelected: { color: theme.white },
  filterChipCount: { color: theme.muted, fontSize: typography.size.caption, fontWeight: typography.weight.bold },
  filterChipCountSelected: { color: theme.white },
});
