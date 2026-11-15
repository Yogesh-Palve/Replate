import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fieldSource = readFileSync(new URL("./ui.tsx", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../../app/(auth)/login.tsx", import.meta.url), "utf8");
const registrationSource = readFileSync(new URL("../../app/(auth)/register.tsx", import.meta.url), "utf8");
const fieldImplementation = fieldSource.split("export function Field")[1]?.split("type DateTimeFieldProps")[0] ?? "";

test("shared Field leaves focus ownership to Android and does not rerender to toggle focus styling", () => {
  assert.ok(fieldImplementation.length > 0, "Field implementation is present");
  assert.doesNotMatch(fieldImplementation, /useState|onFocus\s*=|onBlur\s*=|\.focus\(|\.blur\(|autoFocus/);
  assert.match(fieldImplementation, /selectionColor=\{theme\.green\}/);
});

test("auth fields use React Native's supported current/new password autofill hints", () => {
  assert.match(loginSource, /secureTextEntry autoComplete="current-password"/);
  assert.match(registrationSource, /secureTextEntry autoComplete="new-password"/);
  assert.doesNotMatch(`${loginSource}\n${registrationSource}`, /autoComplete="password"/);
});
