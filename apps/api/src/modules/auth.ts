import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { asyncRoute, HttpError } from "../utils/errors.js";
import { authenticate } from "../middleware/auth.js";
const router = Router();
const registerSchema = z.object({ name: z.string().min(2).max(100), email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(8).max(100), role: z.enum(["DONOR", "NGO", "VOLUNTEER"]), organizationName: z.string().min(2).max(120).optional(), address: z.string().min(5).max(250).optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
function issueToken(user: { id: string; role: string }) { return jwt.sign({ role: user.role }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: (process.env.JWT_EXPIRES_IN || "12h") as jwt.SignOptions["expiresIn"] }); }
router.post("/register", asyncRoute(async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (data.role === "NGO" && (!data.organizationName || !data.address)) throw new HttpError(400, "PROFILE_REQUIRED", "NGO registration requires organizationName and address");
  // Public self-registration is restricted to non-privileged roles. Admins are bootstrapped server-side.
  const role = data.role;
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, role, ...(role === "NGO" ? { organization: { create: { name: data.organizationName!, address: data.address! } } } : {}), ...(role === "VOLUNTEER" ? { volunteerProfile: { create: {} } } : {}) }, include: { organization: true, volunteerProfile: true } });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, organization: user.organization, volunteerProfile: user.volunteerProfile }, accessToken: issueToken(user) });
}));
router.post("/login", asyncRoute(async (req, res) => {
  const data = loginSchema.parse(req.body); const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() }, include: { organization: true, volunteerProfile: true } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, organization: user.organization, volunteerProfile: user.volunteerProfile }, accessToken: issueToken(user) });
}));
router.get("/me", authenticate, asyncRoute(async (req, res) => { const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, include: { organization: true, volunteerProfile: true } }); if (!user) throw new HttpError(404, "NOT_FOUND", "User not found"); const { passwordHash: _hash, ...safe } = user; res.json({ user: safe }); }));
export default router;
