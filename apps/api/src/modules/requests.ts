import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncRoute, HttpError, uuidParam } from "../utils/errors.js";
import { donationStatusAfterReservation, reserveQuantity } from "./allocation.js";
const router = Router(); router.use(authenticate);
router.get("/", requireRole("DONOR", "NGO", "ADMIN"), asyncRoute(async (req, res) => {
  const where = req.auth!.role === "DONOR" ? { donation: { donorId: req.auth!.userId } } : req.auth!.role === "NGO" ? { organization: { userId: req.auth!.userId } } : {};
  const requests = await prisma.request.findMany({ where, include: { donation: true, organization: true, assignment: { include: { delivery: true, volunteer: { select: { id: true, name: true } } } } }, orderBy: { createdAt: "desc" } }); res.json({ requests });
}));
router.post("/donations/:id/requests", requireRole("NGO"), asyncRoute(async (req, res) => {
  const body = z.object({ quantity: z.number().int().positive().max(100000), note: z.string().max(500).optional() }).parse(req.body);
  const organization = await prisma.organization.findUnique({ where: { userId: req.auth!.userId } }); if (!organization?.verified) throw new HttpError(403, "NGO_NOT_VERIFIED", "Your NGO must be verified before requesting food");
  const donationId = uuidParam(req);
  const request = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Donation" WHERE id = ${donationId}::uuid FOR UPDATE`;
    const donation = rows[0] ? await tx.donation.findUnique({ where: { id: donationId } }) : null;
    if (!donation || !["AVAILABLE", "PARTIALLY_RESERVED"].includes(donation.status) || donation.collectionDeadline <= new Date()) throw new HttpError(404, "UNAVAILABLE", "This donation is no longer available");
    if (donation.donorId === req.auth!.userId) throw new HttpError(400, "OWN_DONATION", "You cannot request your own donation");
    return tx.request.create({ data: { donationId: donation.id, organizationId: organization.id, ...body } });
  }, { isolationLevel: "Serializable" }); res.status(201).json({ request });
}));
router.patch("/:id/approve", requireRole("DONOR"), asyncRoute(async (req, res) => {
  const requestId = uuidParam(req);
  const result = await prisma.$transaction(async tx => {
    const requestStub = await tx.request.findUnique({ where: { id: requestId }, select: { donationId: true } });
    if (!requestStub) throw new HttpError(404, "NOT_FOUND", "Request not found");
    const rows = await tx.$queryRaw<Array<{id:string; donorId:string; availableQuantity:number; quantity:number; status:string; collectionDeadline:Date}>>`SELECT id, "donorId", "availableQuantity", quantity, status, "collectionDeadline" FROM "Donation" WHERE id = ${requestStub.donationId}::uuid FOR UPDATE`;
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request || !rows[0] || rows[0].donorId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Request not found");
    if (request.status !== "PENDING") throw new HttpError(409, "INVALID_TRANSITION", "Only pending requests can be approved");
    if (rows[0].collectionDeadline <= new Date()) throw new HttpError(409, "EXPIRED", "The collection deadline has passed");
    if (!["AVAILABLE", "PARTIALLY_RESERVED"].includes(rows[0].status)) throw new HttpError(409, "INSUFFICIENT_QUANTITY", "This donation is no longer reservable");
    const availableQuantity = reserveQuantity(rows[0].availableQuantity, request.quantity);
    await tx.donation.update({ where: { id: request.donationId }, data: { availableQuantity, status: donationStatusAfterReservation(availableQuantity, rows[0].quantity) } });
    const changed = await tx.request.updateMany({ where: { id: request.id, status: "PENDING" }, data: { status: "APPROVED" } });
    if (!changed.count) throw new HttpError(409, "INVALID_TRANSITION", "This request has already changed state");
    const updated = await tx.request.findUnique({ where: { id: request.id } });
    const assignment = await tx.assignment.create({ data: { requestId: request.id, delivery: { create: {} } } });
    return { request: updated, assignment };
  }, { isolationLevel: "Serializable" }); res.json(result);
}));
router.patch("/:id/reject", requireRole("DONOR"), asyncRoute(async (req, res) => { const id = uuidParam(req); const r = await prisma.request.findUnique({ where: { id } }); const donation = r ? await prisma.donation.findUnique({ where: { id: r.donationId } }) : null; if (!r || !donation || donation.donorId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Request not found"); const changed = await prisma.request.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED" } }); if (!changed.count) throw new HttpError(409, "INVALID_TRANSITION", "Only pending requests can be rejected"); res.json({ request: await prisma.request.findUnique({ where: { id } }) }); }));
router.patch("/:id/cancel", requireRole("NGO"), asyncRoute(async (req, res) => {
  const requestId = uuidParam(req);
  const output = await prisma.$transaction(async tx => {
    const r = await tx.request.findUnique({ where: { id: requestId } });
    const organization = r ? await tx.organization.findUnique({ where: { id: r.organizationId } }) : null;
    if (!r || !organization || organization.userId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Request not found");
    if (r.status === "PENDING") {
      const changed = await tx.request.updateMany({ where: { id: r.id, status: "PENDING" }, data: { status: "CANCELLED" } });
      if (!changed.count) throw new HttpError(409, "INVALID_TRANSITION", "This request is no longer pending");
      return tx.request.findUnique({ where: { id: r.id } });
    }
    if (r.status !== "APPROVED") throw new HttpError(409, "INVALID_TRANSITION", "This request can no longer be cancelled");
    const donationRows = await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Donation" WHERE id = ${r.donationId}::uuid FOR UPDATE`;
    const donation = donationRows[0] ? await tx.donation.findUnique({ where: { id: r.donationId } }) : null;
    if (!donation) throw new HttpError(404, "NOT_FOUND", "Donation not found");
    const assignment = await tx.assignment.findUnique({ where: { requestId: r.id } });
    if (!assignment) throw new HttpError(409, "INVALID_TRANSITION", "This request has no open volunteer assignment");
    const assignmentChanged = await tx.assignment.updateMany({ where: { id: assignment.id, status: "OPEN", volunteerId: null }, data: { status: "CANCELLED" } });
    if (!assignmentChanged.count) throw new HttpError(409, "INVALID_TRANSITION", "A volunteer has already accepted this task");
    const availableQuantity = donation.availableQuantity + r.quantity;
    const status = donation.collectionDeadline <= new Date() ? "EXPIRED" : availableQuantity === donation.quantity ? "AVAILABLE" : "PARTIALLY_RESERVED";
    await tx.donation.update({ where: { id: r.donationId }, data: { availableQuantity, status } });
    await tx.delivery.update({ where: { assignmentId: assignment.id }, data: { status: "CANCELLED" } });
    const changed = await tx.request.updateMany({ where: { id: r.id, status: "APPROVED" }, data: { status: "CANCELLED" } });
    if (!changed.count) throw new HttpError(409, "INVALID_TRANSITION", "This request has already changed state");
    return tx.request.findUnique({ where: { id: r.id } });
  }, { isolationLevel: "Serializable" }); res.json({ request: output });
}));
router.patch("/:id/confirm-delivery", requireRole("NGO"), asyncRoute(async (req, res) => {
  const r = await prisma.request.findUnique({ where: { id: uuidParam(req) } });
  const organization = r ? await prisma.organization.findUnique({ where: { id: r.organizationId } }) : null;
  const assignment = r ? await prisma.assignment.findUnique({ where: { requestId: r.id } }) : null;
  if (!r || !organization || organization.userId !== req.auth!.userId) throw new HttpError(404, "NOT_FOUND", "Request not found");
  if (r.status !== "DELIVERED" || !assignment) throw new HttpError(409, "INVALID_TRANSITION", "Only delivered requests can be confirmed");
  const now = new Date(); const request = await prisma.$transaction(async tx => { await tx.delivery.update({ where: { assignmentId: assignment.id }, data: { status: "CONFIRMED", confirmedAt: now } }); return tx.request.update({ where: { id: r.id }, data: { status: "COMPLETED" } }); }); res.json({ request });
}));
export default router;
