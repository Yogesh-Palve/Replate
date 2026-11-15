import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function isTransactionConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { code?: unknown } };
  return candidate.code === "P2034" || (candidate.code === "P2010" && ["40001", "40P01"].includes(String(candidate.meta?.code ?? "")));
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (isTransactionConflict(error)) return res.status(409).json({ error: { code: "CONCURRENT_UPDATE", message: "The record changed during this action; please retry" } });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json({ error: { code: "ALREADY_EXISTS", message: "A record with these details already exists" } });
    if (error.code === "P2025") return res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested record was not found" } });
    if (error.code === "P2034") return res.status(409).json({ error: { code: "CONCURRENT_UPDATE", message: "The record changed during this action; please retry" } });
  }
  if (error && typeof error === "object" && "issues" in error) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.issues } });
  const errorCode = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
  const metaCode = error && typeof error === "object" && "meta" in error && error.meta && typeof error.meta === "object" && "code" in error.meta && typeof error.meta.code === "string" ? error.meta.code : undefined;
  console.error("Unhandled API error", { name: error instanceof Error ? error.name : typeof error, code: errorCode, databaseCode: metaCode });
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
}
export const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
export const uuidParam = (req: Request) => z.string().uuid().parse(req.params.id);
