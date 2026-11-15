import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncRoute, HttpError, uuidParam } from "../utils/errors.js";
import { createCollectionToken, hashCollectionToken } from "./collectionToken.js";
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
router.post("/assignments/:id/collection-qr", requireRole("DONOR"), asyncRoute(async (req, res) => {
  const assignmentId = uuidParam(req);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(500, "SERVER_CONFIG", "Collection verification is not configured");
  const issued = await prisma.$transaction(async tx => {
    await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Assignment" WHERE id = ${assignmentId}::uuid FOR UPDATE`;
    const assignment = await tx.assignment.findUnique({ where: { id: assignmentId }, include: { request: { include: { donation: true } } } });
    if (!assignment || assignment.request.donation.donorId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Assignment not found");
    if (assignment.status !== "ACCEPTED" || !assignment.volunteerId || assignment.request.status !== "VOLUNTEER_ASSIGNED") throw new HttpError(409, "INVALID_TRANSITION", "A QR code is available after a volunteer accepts the assignment");
    const created = createCollectionToken(secret);
    await tx.collectionToken.upsert({
      where: { assignmentId },
      create: { assignmentId, volunteerId: assignment.volunteerId, tokenHash: created.tokenHash, expiresAt: created.expiresAt },
      update: { volunteerId: assignment.volunteerId, tokenHash: created.tokenHash, expiresAt: created.expiresAt, usedAt: null, revokedAt: null },
    });
    return { token: created.token, expiresAt: created.expiresAt };
  }, { isolationLevel: "Serializable" });
  res.json({ qrPayload: JSON.stringify({ version: 1, assignmentId, token: issued.token }), expiresAt: issued.expiresAt });
}));
router.patch("/assignments/:id/decline", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => {
  const assignmentId = uuidParam(req);
  const result = await prisma.$transaction(async tx => {
    const a = await tx.assignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.volunteerId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Assigned task not found");
    if (a.status !== "ACCEPTED") throw new HttpError(409, "INVALID_TRANSITION", "Only an accepted, uncollected task can be declined");
    await tx.collectionToken.updateMany({ where: { assignmentId: a.id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.assignment.update({ where: { id: a.id }, data: { volunteerId: null, status: "OPEN", acceptedAt: null } });
    const request = await tx.request.update({ where: { id: a.requestId }, data: { status: "APPROVED" } });
    return { request };
  }, { isolationLevel: "Serializable" }); res.json(result);
}));
async function updateTask(id: string, userId: string, action: "deliver") {
  return prisma.$transaction(async tx => {
    const a = await tx.assignment.findUnique({ where: { id }, include: { request: true, delivery: true } }); if (!a || a.volunteerId !== userId) throw new HttpError(404, "NOT_FOUND", "Assigned task not found");
    const now = new Date();
    if (a.status !== "COLLECTED") throw new HttpError(409, "INVALID_TRANSITION", "Collect the food before marking delivery"); await tx.assignment.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: now } }); await tx.delivery.update({ where: { assignmentId: id }, data: { status: "DELIVERED", deliveredAt: now } }); return tx.request.update({ where: { id: a.requestId }, data: { status: "DELIVERED" } });
  });
}
router.patch("/assignments/:id/collect", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => {
  const id = uuidParam(req);
  const { token } = z.object({ token: z.string().min(32).max(128) }).parse(req.body);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(500, "SERVER_CONFIG", "Collection verification is not configured");
  const request = await prisma.$transaction(async tx => {
    await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Assignment" WHERE id = ${id}::uuid FOR UPDATE`;
    const assignment = await tx.assignment.findUnique({ where: { id }, include: { request: true, delivery: true } });
    if (!assignment || assignment.volunteerId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Assigned task not found");
    if (assignment.status !== "ACCEPTED" || assignment.request.status !== "VOLUNTEER_ASSIGNED") throw new HttpError(409, "INVALID_TRANSITION", "This assignment is not ready for collection verification");
    const tokenHash = hashCollectionToken(token, secret);
    const consumed = await tx.collectionToken.updateMany({ where: { assignmentId: id, volunteerId: req.auth!.userId, tokenHash, expiresAt: { gt: new Date() }, usedAt: null, revokedAt: null }, data: { usedAt: new Date() } });
    if (!consumed.count) throw new HttpError(409, "INVALID_COLLECTION_QR", "This QR code is invalid, expired, or already used. Ask the donor to generate a new code.");
    const now = new Date();
    await tx.assignment.update({ where: { id }, data: { status: "COLLECTED", collectedAt: now } });
    await tx.delivery.update({ where: { assignmentId: id }, data: { status: "COLLECTED", collectedAt: now } });
    return tx.request.update({ where: { id: assignment.requestId }, data: { status: "COLLECTED" } });
  }, { isolationLevel: "Serializable" });
  res.json({ request });
}));
router.patch("/assignments/:id/deliver", requireRole("VOLUNTEER"), asyncRoute(async (req, res) => res.json({ request: await updateTask(uuidParam(req), req.auth!.userId, "deliver") })));
export default router;
