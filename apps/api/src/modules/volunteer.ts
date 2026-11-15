import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncRoute, HttpError, uuidParam } from "../utils/errors.js";
const router = Router(); router.use(authenticate);
router.patch("/availability", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => { const { available } = z.object({ available: z.boolean() }).parse(req.body); const profile = await prisma.volunteerProfile.update({ where: { userId: req.auth!.userId }, data: { available } }); res.json({ profile }); }));
router.get("/tasks", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => { const tasks = await prisma.assignment.findMany({ where: { OR: [{ status: "OPEN" }, { volunteerId: req.auth!.userId }] }, include: { request: { include: { donation: true, organization: true } }, delivery: true }, orderBy: { createdAt: "asc" } }); res.json({ tasks }); }));
router.patch("/assignments/:id/accept", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => {
  const assignmentId = uuidParam(req);
  const assignment = await prisma.$transaction(async tx => {
    const profile = await tx.volunteerProfile.findUnique({ where: { userId: req.auth!.userId } }); if (!profile?.available) throw new HttpError(409, "NOT_AVAILABLE", "Set your availability before accepting a task");
    const a = await tx.assignment.findUnique({ where: { id: assignmentId } }); if (!a || a.status !== "OPEN") throw new HttpError(409, "TASK_TAKEN", "This task is no longer available");
    const claimed = await tx.assignment.updateMany({ where: { id: a.id, status: "OPEN", volunteerId: null }, data: { volunteerId: req.auth!.userId, status: "ACCEPTED", acceptedAt: new Date() } }); if (!claimed.count) throw new HttpError(409, "TASK_TAKEN", "Another volunteer accepted this task");
    await tx.request.update({ where: { id: a.requestId }, data: { status: "VOLUNTEER_ASSIGNED" } }); return tx.assignment.findUnique({ where: { id: a.id }, include: { request: true, delivery: true } });
  }, { isolationLevel: "Serializable" }); res.json({ assignment });
}));
router.patch("/assignments/:id/decline", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => {
  const assignmentId = uuidParam(req);
  const result = await prisma.$transaction(async tx => {
    const a = await tx.assignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.volunteerId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Assigned task not found");
    if (a.status !== "ACCEPTED") throw new HttpError(409, "INVALID_TRANSITION", "Only an accepted, uncollected task can be declined");
    await tx.assignment.update({ where: { id: a.id }, data: { volunteerId: null, status: "OPEN", acceptedAt: null } });
    const request = await tx.request.update({ where: { id: a.requestId }, data: { status: "APPROVED" } });
    return { request };
  }, { isolationLevel: "Serializable" }); res.json(result);
}));
async function updateTask(id: string, userId: string, action: "collect" | "deliver") {
  return prisma.$transaction(async tx => {
    const a = await tx.assignment.findUnique({ where: { id }, include: { request: true, delivery: true } }); if (!a || a.volunteerId !== userId) throw new HttpError(404, "NOT_FOUND", "Assigned task not found");
    const now = new Date();
    if (action === "collect") { if (a.status !== "ACCEPTED") throw new HttpError(409, "INVALID_TRANSITION", "Accept the task before marking collection"); await tx.assignment.update({ where: { id }, data: { status: "COLLECTED", collectedAt: now } }); await tx.delivery.update({ where: { assignmentId: id }, data: { status: "COLLECTED", collectedAt: now } }); return tx.request.update({ where: { id: a.requestId }, data: { status: "COLLECTED" } }); }
    if (a.status !== "COLLECTED") throw new HttpError(409, "INVALID_TRANSITION", "Collect the food before marking delivery"); await tx.assignment.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: now } }); await tx.delivery.update({ where: { assignmentId: id }, data: { status: "DELIVERED", deliveredAt: now } }); return tx.request.update({ where: { id: a.requestId }, data: { status: "DELIVERED" } });
  });
}
router.patch("/assignments/:id/collect", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => res.json({ request: await updateTask(uuidParam(req), req.auth!.userId, "collect") })));
router.patch("/assignments/:id/deliver", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => res.json({ request: await updateTask(uuidParam(req), req.auth!.userId, "deliver") })));
export default router;
