import assert from "node:assert/strict";
import test from "node:test";
import { filterTasks } from "./state";

test("volunteer task filters map open, active and delivered server states", () => {
  const tasks = ["OPEN", "ACCEPTED", "COLLECTED", "DELIVERED"].map((status, index) => ({ id: index, status }));
  assert.deepEqual(filterTasks(tasks, "OPEN").map(task => task.status), ["OPEN"]);
  assert.deepEqual(filterTasks(tasks, "ACTIVE").map(task => task.status), ["ACCEPTED", "COLLECTED"]);
  assert.deepEqual(filterTasks(tasks, "COMPLETED").map(task => task.status), ["DELIVERED"]);
  assert.equal(filterTasks(tasks, "ALL").length, tasks.length);
});
