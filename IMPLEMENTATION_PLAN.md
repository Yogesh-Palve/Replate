# Implementation Plan

## Architecture and folder structure

```text
apps/
  api/src/{config,middleware,modules,utils}/   Express REST API
  api/prisma/{schema.prisma,migrations}/       PostgreSQL model and SQL migrations
  mobile/app/(auth)/                           Expo Router authentication
  mobile/app/(tabs)/                           Role-aware app tabs and workflow screens
  mobile/src/{api,components,context,theme}/    API client and shared mobile UI
packages/shared/src/                           Shared domain constants/types
```

API modules separate routes, validation, controllers, and business services. The API owns all authorization, business invariants, and persistence. The mobile app uses a typed Axios client and TanStack Query; SecureStore persists the access token.

## Database design

`User` is the identity and role root. An optional one-to-one `Organization` belongs to an NGO user; a `VolunteerProfile` belongs to a volunteer. `Donation` belongs to a donor. An NGO `Request` links an organization to one donation. Each approved request may have one `Assignment` linking a volunteer; its one-to-one `Delivery` records delivery lifecycle. Foreign keys use restrictive or cascading deletion according to ownership; operational records are not hard-deleted through API routes. Enums constrain role and workflow states. Indexes support role, status, deadline, and relationship queries. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

Approval locks the donation row in a serializable transaction, verifies request and remaining quantity, reserves quantity once, then creates assignment and delivery records. Any failure rolls back all writes. The approval flow does not auto-assign; an available volunteer claims an unassigned task.

## API architecture

Versioned REST routes under `/api/v1`; `/health` is a readiness-independent liveness check. `auth` issues JWTs, `donations` handles listings and donor actions, `requests` handles NGO requests and donor decisions, `volunteer` handles availability/tasks/status, and `admin` provides monitoring and verification. Zod validates request bodies/query parameters; `authMiddleware` and `requireRole` protect routes. See [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Milestones

- [x] Phase 1: monorepo, architecture and documentation, TypeScript/package configuration, Expo and Express foundations.
- [x] Phase 2: normalized Prisma schema, initial SQL migration, auth, password hashing, JWT, role authorization.
- [x] Phase 3: shared visual system, Expo Router auth and role-aware navigation/dashboard.
- [x] Phase 4: donation create/list/search/detail/cancel APIs and mobile browse/manage screens.
- [x] Phase 5: NGO request APIs and atomic donor approval/rejection.
- [x] Phase 6: volunteer assignment claim, availability, collection/delivery, NGO confirmation.
- [x] Phase 7: NGO verification and admin monitoring/statistics.
- [ ] Phase 8: integrated DB workflow, admin login, role access, quantity guards, delivery transitions, and final database state are verified by live API smoke test; Prisma validation, migration status, TypeScript, build, unit tests, and Android bundle export pass. Physical Android UI/device verification remains unavailable because this environment has no SDK/emulator.

## Decisions and known constraints

- No external geocoding, maps, email, or push provider is required for MVP.
- JWT access token expires after 12 hours; logout clears the device token. Reauthentication is used instead of a refresh-token store for this academic MVP.
- Admins are provisioned through a one-time CLI command using backend-only `ADMIN_EMAIL` and `ADMIN_PASSWORD`; public registration cannot create admins.
- Expo API URL must be routable from the Android device/emulator.
- Migrations are committed as SQL; applying them requires a running PostgreSQL instance and `DATABASE_URL`.
