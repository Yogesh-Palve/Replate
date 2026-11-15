import test from "node:test";
import assert from "node:assert/strict";
import { getCollectionToken } from "./qr.js";

test("collection QR payload must be versioned and match the active assignment", () => {
  const token = "x".repeat(43);
  const payload = JSON.stringify({ version: 1, assignmentId: "assignment-1", token });
  assert.equal(getCollectionToken(payload, "assignment-1"), token);
  assert.equal(getCollectionToken(payload, "assignment-2"), null);
  assert.equal(getCollectionToken("not-json", "assignment-1"), null);
  assert.equal(getCollectionToken(JSON.stringify({ version: 2, assignmentId: "assignment-1", token }), "assignment-1"), null);
  assert.equal(getCollectionToken(JSON.stringify({ version: 1, assignmentId: "assignment-1", token: "short" }), "assignment-1"), null);
});
