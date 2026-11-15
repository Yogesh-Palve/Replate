import test from "node:test";
import assert from "node:assert/strict";
import { isTransactionConflict } from "./errors.js";

test("recognizes Prisma serialization conflicts", () => {
  assert.equal(isTransactionConflict({ code: "P2034" }), true);
  assert.equal(isTransactionConflict({ code: "P2010", meta: { code: "40001" } }), true);
  assert.equal(isTransactionConflict({ code: "P2010", meta: { code: "40P01" } }), true);
});

test("does not treat unrelated database errors as retryable conflicts", () => {
  assert.equal(isTransactionConflict({ code: "P2010", meta: { code: "23505" } }), false);
  assert.equal(isTransactionConflict({ code: "P2002" }), false);
  assert.equal(isTransactionConflict(new Error("unrelated failure")), false);
});
