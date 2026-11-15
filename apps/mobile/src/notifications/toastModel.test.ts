import test from "node:test";
import assert from "node:assert/strict";
import { createToastNotification, createToastTimer, DEFAULT_TOAST_DURATION, isSameToast, type ToastType } from "./toastModel.js";

test("supports each notification type and defaults to a readable timeout", () => {
  const types: ToastType[] = ["success", "error", "warning", "info"];
  for (const [index, type] of types.entries()) {
    const notification = createToastNotification(index + 1, type, ` ${type} message `);
    assert.equal(notification.type, type);
    assert.equal(notification.message, `${type} message`);
    assert.equal(notification.duration, DEFAULT_TOAST_DURATION);
  }
});

test("allows a notification to remain until manually dismissed", () => {
  assert.equal(createToastNotification(1, "error", "Needs attention", { duration: null }).duration, null);
});

test("recognizes repeated notifications so the provider replaces instead of stacking them", () => {
  const active = createToastNotification(1, "error", "Not enough stock");
  assert.equal(isSameToast(active, createToastNotification(2, "error", "Not enough stock")), true);
  assert.equal(isSameToast(active, createToastNotification(3, "warning", "Not enough stock")), false);
  assert.equal(isSameToast(active, createToastNotification(4, "error", "Different message")), false);
});

test("automatically dismisses after the selected timeout and supports manual timer cleanup", () => {
  let nextHandle = 0;
  const callbacks = new Map<number, () => void>();
  const delays: number[] = [];
  const cancelled: number[] = [];
  const timer = createToastTimer(
    (callback, delay) => { const handle = ++nextHandle; delays.push(delay); callbacks.set(handle, callback); return handle; },
    handle => { cancelled.push(handle as number); callbacks.delete(handle as number); },
  );
  let dismissed = 0;

  timer.schedule(DEFAULT_TOAST_DURATION, () => { dismissed++; });
  assert.equal(delays[0], 4500);
  callbacks.get(1)?.();
  assert.equal(dismissed, 1);

  timer.schedule(5000, () => { dismissed++; });
  timer.clear();
  assert.deepEqual(cancelled, [2]);
  assert.equal(callbacks.has(2), false);
});

test("replacing or persisting a notification clears the previous automatic timer", () => {
  let nextHandle = 0;
  const callbacks = new Map<number, () => void>();
  const timer = createToastTimer(
    (callback) => { const handle = ++nextHandle; callbacks.set(handle, callback); return handle; },
    handle => { callbacks.delete(handle as number); },
  );
  timer.schedule(4500, () => {});
  timer.schedule(null, () => {});
  assert.equal(callbacks.size, 0);
});
