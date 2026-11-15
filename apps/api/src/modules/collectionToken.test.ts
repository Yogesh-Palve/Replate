import test from "node:test";
import assert from "node:assert/strict";
import { COLLECTION_TOKEN_TTL_MS, createCollectionToken, hashCollectionToken, isCollectionTokenUsable } from "./collectionToken.js";

test("collection token is random, keyed-hashed, and short-lived", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const created = createCollectionToken("test-secret", now);
  assert.equal(created.token.length, 43);
  assert.equal(created.tokenHash, hashCollectionToken(created.token, "test-secret"));
  assert.notEqual(created.tokenHash, created.token);
  assert.equal(created.expiresAt.getTime(), now.getTime() + COLLECTION_TOKEN_TTL_MS);
});

test("collection token rejects wrong, expired, consumed, revoked, or other volunteer", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  const secret = "test-secret";
  const { token, tokenHash, expiresAt } = createCollectionToken(secret, now);
  const record = { tokenHash, volunteerId: "volunteer-a", expiresAt, usedAt: null as Date | null, revokedAt: null as Date | null };
  assert.equal(isCollectionTokenUsable(record, token, secret, "volunteer-a", now), true);
  assert.equal(isCollectionTokenUsable(record, "wrong-token", secret, "volunteer-a", now), false);
  assert.equal(isCollectionTokenUsable(record, token, secret, "volunteer-b", now), false);
  assert.equal(isCollectionTokenUsable(record, token, secret, "volunteer-a", expiresAt), false);
  assert.equal(isCollectionTokenUsable({ ...record, usedAt: now }, token, secret, "volunteer-a", now), false);
  assert.equal(isCollectionTokenUsable({ ...record, revokedAt: now }, token, secret, "volunteer-a", now), false);
});
