import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../utils/errors.js";
import type { Role } from "@replate/shared";
declare global { namespace Express { interface Request { auth?: { userId: string; role: Role } } } }
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  if (!token) return next(new HttpError(401, "UNAUTHENTICATED", "Sign in to continue"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; role: Role };
    req.auth = { userId: payload.sub, role: payload.role }; next();
  } catch { next(new HttpError(401, "INVALID_TOKEN", "Session expired; sign in again")); }
}
export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => req.auth && roles.includes(req.auth.role) ? next() : next(new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action"));
