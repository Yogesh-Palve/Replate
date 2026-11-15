import test from "node:test";
import assert from "node:assert/strict";
import { colors, designTokens, getButtonPalette, getStatusVariant, radii, spacing, theme, typography } from "./index.js";

test("brand palette and existing screen aliases use the RePlate design colors", () => {
  assert.equal(colors.primary, "#176B45");
  assert.equal(colors.sage, "#8BAF91");
  assert.equal(colors.gold, "#E6AD55");
  assert.equal(colors.canvas, "#F8F9F5");
  assert.equal(colors.surface, "#FFFFFF");
  assert.equal(colors.ink, "#202B25");
  assert.equal(colors.secondaryText, "#6B756E");
  assert.equal(colors.error, "#D9534F");
  assert.equal(colors.success, "#39845C");
  assert.equal(theme.green, colors.primary);
  assert.equal(theme.bg, colors.canvas);
  assert.equal(theme.dark, colors.ink);
});

test("spacing, typography, radii, shadows, and semantic states are centrally available", () => {
  assert.deepEqual(spacing, { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 });
  assert.equal(typography.size.body, 16);
  assert.equal(radii.pill, 999);
  assert.ok(designTokens.shadows.card.elevation > 0);
  assert.equal(designTokens.semantic.warning.foreground, "#765416");
});

test("workflow statuses map to accessible semantic badge variants", () => {
  assert.equal(getStatusVariant("CANCELLED"), "error");
  assert.equal(getStatusVariant("REJECTED"), "error");
  assert.equal(getStatusVariant("PENDING"), "warning");
  assert.equal(getStatusVariant("PARTIALLY_RESERVED"), "warning");
  assert.equal(getStatusVariant("APPROVED"), "success");
  assert.equal(getStatusVariant("VOLUNTEER_ASSIGNED"), "success");
  assert.equal(getStatusVariant("COMPLETED"), "success");
  assert.equal(getStatusVariant("AVAILABLE"), "success");
  assert.equal(getStatusVariant("Account verification is required before requesting food."), "neutral");
});

test("destructive buttons use the centralized danger surface and white foreground", () => {
  assert.deepEqual(getButtonPalette({ secondary: true, destructive: true }), {
    background: colors.dangerAction, foreground: colors.white, border: colors.dangerAction, borderWidth: 0,
  });
  assert.deepEqual(getButtonPalette({ secondary: true }), {
    background: colors.surface, foreground: colors.primary, border: colors.border, borderWidth: 1,
  });
  const luminance = (hex: string) => {
    const rgb = hex.slice(1).match(/.{2}/g)!.map(part => parseInt(part, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const { foreground, background } = getButtonPalette({ destructive: true });
  assert.ok((luminance(foreground) + 0.05) / (luminance(background) + 0.05) >= 4.5, "danger button text meets WCAG AA contrast");
});
