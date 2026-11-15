# Database Schema

PostgreSQL is the system of record. Prisma models are in `apps/api/prisma/schema.prisma`; the initial migration is committed in `apps/api/prisma/migrations/20261113000000_init/migration.sql`.

The migration creates `User`, `Organization`, `VolunteerProfile`, `Donation`, `Request`, `Assignment`, and `Delivery` tables, plus the enum types declared in the Prisma schema. The local `replate_db` migration status was checked during the final review and is up to date; the workflow test created additional uniquely named diagnostic records and did not delete or reset existing data.

## Relationships

- `User` has one optional `Organization` (NGO) or `VolunteerProfile` (volunteer), and owns donations as a donor.
- `Organization` submits many `Request` records; each request addresses exactly one `Donation`.
- A donation records original `quantity` and live `availableQuantity`. Only approval decrements available quantity; rejection changes no quantity. Cancellation of a still-approved request releases its reservation transactionally.
- A request has at most one `Assignment`; an assignment has one `Delivery`. Assignment status and delivery status are independent from request status.
- Admin verification is represented by organization `verified`, `verifiedAt`, and `verifiedById` fields.

## Constraints and indexes

UUID primary keys, unique email and organization/user relations, nonnegative quantities, enums, and foreign keys. Indexes cover user role, organization verification, donation state/deadline, request state and relations, and volunteer task status. API validation additionally enforces positive request quantity and deadline ordering.

## Concurrency

Approval uses a serializable Prisma transaction and `SELECT ... FOR UPDATE` on the donation row, checks current request state and remaining quantity, then updates reservation/status and creates the assignment/delivery. Concurrent over-allocation fails rather than silently oversubscribing. Transaction retries are limited; callers may retry a serialization conflict.

## Impact calculations

Phase 3 does not add tables or columns. The authenticated `GET /impact/summary` endpoint aggregates existing Donation, Request, Assignment, and Delivery rows. It counts redistribution only after the request is `COMPLETED` and the delivery is `CONFIRMED`, and groups quantity by the original donation unit. Meal estimates accept only meal, meal-packet, portion, and serving units at one estimated meal per unit; other units remain unconverted. Environmental impact is omitted because the schema has no standardized food weight or validated emissions factor.
