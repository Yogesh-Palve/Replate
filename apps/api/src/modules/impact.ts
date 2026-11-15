import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncRoute } from "../utils/errors.js";
import { buildImpactSummary, type RedistributedUnit } from "./impactSummary.js";

const router = Router();
router.use(authenticate);

type UnitAggregate = { unit: string; quantity: bigint; completedRequests: bigint; completedDeliveries: bigint };

router.get("/summary", requireRole("DONOR", "NGO", "VOLUNTEER", "ADMIN"), asyncRoute(async (req, res) => {
  const { role, userId } = req.auth!;
  const scope = role === "DONOR"
    ? Prisma.sql`AND d."donorId" = ${userId}::uuid`
    : role === "NGO"
      ? Prisma.sql`AND r."organizationId" IN (SELECT id FROM "Organization" WHERE "userId" = ${userId}::uuid)`
      : role === "VOLUNTEER"
        ? Prisma.sql`AND a."volunteerId" = ${userId}::uuid`
        : Prisma.empty;

  const [donationsCreated, aggregates] = await Promise.all([
    role === "DONOR" ? prisma.donation.count({ where: { donorId: userId } })
      : role === "ADMIN" ? prisma.donation.count()
        : Promise.resolve(null),
    prisma.$queryRaw<UnitAggregate[]>(Prisma.sql`
      SELECT d."unit" AS unit,
             SUM(r."quantity")::bigint AS quantity,
             COUNT(DISTINCT r.id)::bigint AS "completedRequests",
             COUNT(DISTINCT del.id)::bigint AS "completedDeliveries"
      FROM "Request" AS r
      INNER JOIN "Donation" AS d ON d.id = r."donationId"
      INNER JOIN "Assignment" AS a ON a."requestId" = r.id
      INNER JOIN "Delivery" AS del ON del."assignmentId" = a.id
      WHERE r.status = 'COMPLETED'
        AND del.status = 'CONFIRMED'
        ${scope}
      GROUP BY d."unit"
      ORDER BY d."unit"
    `),
  ]);

  const units: RedistributedUnit[] = aggregates.map(row => ({ unit: row.unit, quantity: Number(row.quantity) }));
  const summary = buildImpactSummary({
    donationsCreated,
    units,
    completedRequests: aggregates.reduce((sum, row) => sum + Number(row.completedRequests), 0),
    completedDeliveries: aggregates.reduce((sum, row) => sum + Number(row.completedDeliveries), 0),
  });
  res.json({ summary });
}));

export default router;
