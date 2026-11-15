export type TaskFilter = "ALL" | "OPEN" | "ACTIVE" | "COMPLETED";
export type TaskSummary = { status: string };

export function filterTasks<T extends TaskSummary>(tasks: T[], filter: TaskFilter): T[] {
  if (filter === "OPEN") return tasks.filter(task => task.status === "OPEN");
  if (filter === "ACTIVE") return tasks.filter(task => task.status === "ACCEPTED" || task.status === "COLLECTED");
  if (filter === "COMPLETED") return tasks.filter(task => task.status === "DELIVERED");
  return tasks;
}
