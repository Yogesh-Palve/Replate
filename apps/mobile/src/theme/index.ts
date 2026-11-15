export const colors = {
  primary: "#176B45",
  sage: "#8BAF91",
  gold: "#E6AD55",
  canvas: "#F8F9F5",
  surface: "#FFFFFF",
  ink: "#202B25",
  secondaryText: "#6B756E",
  error: "#D9534F",
  success: "#39845C",
  warning: "#E6AD55",
  border: "#E2E8E1",
  surfaceSoft: "#EEF3E9",
  info: "#315E48",
  warningText: "#765416",
  errorSoft: "#FCEFED",
  successSoft: "#EAF4EC",
  warningSoft: "#FFF5E2",
  infoSoft: "#EEF3E9",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  size: { caption: 12, small: 14, body: 16, subtitle: 18, heading: 22, title: 28, display: 34 },
  line: { caption: 16, small: 20, body: 24, heading: 28, title: 34, display: 40 },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700", heavy: "800" },
} as const;

export const semantic = {
  success: { foreground: colors.success, background: colors.successSoft, border: colors.success },
  error: { foreground: colors.error, background: colors.errorSoft, border: colors.error },
  warning: { foreground: colors.warningText, background: colors.warningSoft, border: colors.warning },
  info: { foreground: colors.info, background: colors.infoSoft, border: colors.sage },
} as const;

export const shadows = {
  card: { shadowColor: colors.ink, shadowOpacity: 0.055, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  raised: { shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
} as const;

export type StatusVariant = keyof typeof semantic | "neutral";

export function getStatusVariant(status: string): StatusVariant {
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["CANCELLED", "REJECTED", "EXPIRED", "FAILED"].includes(normalized)) return "error";
  if (["PENDING", "PARTIALLY_RESERVED", "AWAITING_VERIFICATION", "WAITING_FOR_ADMIN_VERIFICATION"].includes(normalized)) return "warning";
  if (["AVAILABLE", "VERIFIED", "APPROVED", "ACCEPTED", "VOLUNTEER_ASSIGNED", "COLLECTED", "DELIVERED", "CONFIRMED", "COMPLETED"].includes(normalized)) return "success";
  return "neutral";
}

export const designTokens = { colors, spacing, radii, typography, semantic, shadows } as const;

// Existing screens retain these names while shared components migrate to tokens.
export const theme = {
  ...colors,
  green: colors.primary,
  dark: colors.ink,
  pale: colors.surfaceSoft,
  bg: colors.canvas,
  text: colors.ink,
  muted: colors.secondaryText,
  border: colors.border,
  white: colors.surface,
  red: colors.error,
  amber: colors.warningText,
  colors,
  spacing,
  radii,
  typography,
  semantic,
  shadows,
};
