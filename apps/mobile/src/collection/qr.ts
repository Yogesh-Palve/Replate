export function getCollectionToken(payload: string, expectedAssignmentId: string): string | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as { version?: unknown; assignmentId?: unknown; token?: unknown };
    if (value.version !== 1 || value.assignmentId !== expectedAssignmentId || typeof value.token !== "string" || value.token.length < 32 || value.token.length > 128) return null;
    return value.token;
  } catch {
    return null;
  }
}
