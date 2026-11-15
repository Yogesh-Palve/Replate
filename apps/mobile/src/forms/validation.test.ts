import assert from "node:assert/strict";
import test from "node:test";
import {
  createSubmissionGuard,
  getApiErrorMessage,
  getApiValidationErrors,
  validateDonation,
  validateLogin,
  validateRegistration,
  validateRequestQuantity,
} from "./validation";
import { endLocalSession, persistAuthToken } from "../context/authSession";

test("login validation reports missing and malformed fields", () => {
  assert.deepEqual(validateLogin({ email: "", password: "" }), {
    email: "Email is required.",
    password: "Password is required.",
  });
  assert.equal(validateLogin({ email: "bad-email", password: "x" }).email, "Enter a valid email address.");
  assert.equal(validateLogin({ email: "user@example.c", password: "x" }).email, "Enter a valid email address.");
  assert.deepEqual(validateLogin({ email: "user.name+tag@example.invalid", password: "x" }), {});
  assert.deepEqual(validateLogin({ email: " donor@example.com ", password: "x" }), {});
});

test("registration validates shared and NGO-specific fields", () => {
  assert.deepEqual(validateRegistration({ name: "D", email: "bad", password: "short", role: "DONOR" }), {
    name: "Name must be between 2 and 100 characters.",
    email: "Enter a valid email address.",
    password: "Password must be between 8 and 100 characters.",
  });
  const validNgo = { name: "Food Bank", email: "ngo@example.com", password: "password123", role: "NGO" as const, organizationName: "Community Meals", address: "123 Main Street" };
  assert.deepEqual(validateRegistration({ name: "Donor Member", email: "donor@example.com", password: "password123", role: "DONOR" }), {});
  assert.deepEqual(validateRegistration(validNgo), {});
  assert.deepEqual(validateRegistration({ name: "Volunteer Member", email: "volunteer@example.com", password: "password123", role: "VOLUNTEER" }), {});
  assert.equal(validateRegistration({ ...validNgo, address: "x" }).address, "Address must be between 5 and 250 characters.");
});

test("donation validates required data and collection deadline business rules", () => {
  const now = new Date("2026-11-14T10:00:00.000Z");
  const base = {
    foodName: "Meals", category: "Prepared meals", quantity: "12", unit: "packets",
    preparedAt: new Date("2026-11-14T11:00:00.000Z"),
    collectionDeadline: new Date("2026-11-14T13:00:00.000Z"),
    pickupAddress: "123 Main Street", description: "",
  };
  assert.deepEqual(validateDonation(base, now), {});
  assert.equal(validateDonation({ ...base, quantity: "1.5" }, now).quantity, "Enter a whole quantity between 1 and 100,000.");
  assert.equal(validateDonation({ ...base, collectionDeadline: new Date("2026-11-14T09:00:00.000Z") }, now).collectionDeadline, "Collection deadline must be in the future.");
  assert.equal(validateDonation({ ...base, preparedAt: null }, now).preparedAt, "Select a valid preparation date and time.");
});

test("request quantity is a positive whole number within availability", () => {
  assert.equal(validateRequestQuantity("", 10), "Quantity is required.");
  assert.equal(validateRequestQuantity("1.5", 10), "Enter a positive whole number.");
  assert.equal(validateRequestQuantity("11", 10), "Only 10 available.");
  assert.equal(validateRequestQuantity("10", 10), undefined);
});

test("API errors preserve server messages and validation details", () => {
  assert.equal(getApiErrorMessage({ response: { status: 401, data: { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } } } }, "Fallback"), "Email or password is incorrect (INVALID_CREDENTIALS) — HTTP 401");
  const validationFailure = { response: { status: 400, data: { error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: [{ path: ["quantity"], message: "Quantity must be positive" }] } } } };
  assert.equal(getApiErrorMessage(validationFailure, "Fallback"), "quantity: Quantity must be positive");
  assert.equal(getApiErrorMessage({ response: { status: 409, data: { error: { code: "INSUFFICIENT_QUANTITY", message: "The raw API detail is not user-friendly" } } } }, "Fallback"), "Requested quantity exceeds the available quantity. Please enter a smaller amount.");
  assert.deepEqual(getApiValidationErrors({ response: { data: { error: { details: [{ path: ["email"], message: "Invalid email address" }, { path: ["password"], message: "Too short" }] } } } }), { email: "Invalid email address", password: "Too short" });
  assert.equal(getApiErrorMessage(new Error("Secure storage unavailable"), "Check your connection."), "Secure storage unavailable");
  assert.match(getApiErrorMessage({ request: {}, code: "ERR_NETWORK", message: "Network Error", config: { baseURL: "http://192.168.1.147:4000/api/v1" } }, "Fallback"), /Could not reach the RePlate API at http:\/\/192\.168\.1\.147:4000\/api\/v1.*ERR_NETWORK/);
});

test("secure storage failures after registration explain that the account already exists", async () => {
  await assert.rejects(
    persistAuthToken("synthetic-token", async () => { throw new Error("native storage unavailable"); }, "registration"),
    /account was created.*do not create the account again/i,
  );
  await assert.rejects(
    persistAuthToken("synthetic-token", async () => { throw new Error("native storage unavailable"); }, "login"),
    /credentials were accepted.*try logging in again/i,
  );
});

test("logout cancels protected requests before deleting the token and clearing user data for every role", async () => {
  for (const role of ["DONOR", "NGO", "VOLUNTEER", "ADMIN"] as const) {
    const steps: string[] = [];
    await endLocalSession({
      cancelPendingQueries: async () => { steps.push("cancel-queries"); },
      removeToken: async () => { steps.push("remove-token"); },
      clearUserData: () => { steps.push("clear-user-and-cache"); },
    });
    assert.deepEqual(steps, ["cancel-queries", "remove-token", "clear-user-and-cache"], `logout order for ${role}`);
  }
});

test("failed token removal keeps the in-memory session data intact", async () => {
  const steps: string[] = [];
  await assert.rejects(endLocalSession({
    cancelPendingQueries: async () => { steps.push("cancel-queries"); },
    removeToken: async () => { steps.push("remove-token"); throw new Error("secure storage unavailable"); },
    clearUserData: () => { steps.push("clear-user-and-cache"); },
  }), /secure storage unavailable/);
  assert.deepEqual(steps, ["cancel-queries", "remove-token"]);
});

test("submission guard ignores overlapping duplicate submissions and unlocks afterward", async () => {
  const guard = createSubmissionGuard();
  let calls = 0;
  let release!: () => void;
  const first = guard(() => new Promise<void>(resolve => { calls++; release = resolve; }));
  const second = await guard(async () => { calls++; });
  assert.equal(second, undefined);
  assert.equal(calls, 1);
  release();
  await first;
  await guard(async () => { calls++; });
  assert.equal(calls, 2);
});
