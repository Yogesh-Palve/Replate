# Project Context

## RePlate

RePlate coordinates surplus edible food donations from individuals and businesses to verified NGOs. Volunteers can accept delivery assignments and record collection and delivery. Administrators verify NGOs and monitor operations.

## Users and permissions

- **Donor:** creates and manages their donations; decides whether to approve pending NGO requests.
- **NGO:** maintains an organization profile, browses available food, submits requests, and confirms completed deliveries.
- **Volunteer:** manages availability, accepts assigned tasks, and records collection and delivery.
- **Admin:** audits users, verifies NGO organizations, and views operational statistics.

Self-service registration never accepts an admin role. An administrator is created with a one-time server-side bootstrap command and environment credentials.

## Main workflow

Donation → NGO request → donor decision and atomic reservation → volunteer assignment/acceptance → collection → delivery → NGO confirmation → completed request and delivery. Every transition is validated server-side. Approved quantities are reserved in a database transaction; only a pending request can be approved, and the available amount is checked while holding a row lock.

## Stack and boundaries

- `apps/mobile`: Expo, React Native, TypeScript, Expo Router, Axios, TanStack Query, SecureStore.
- `apps/api`: Express, TypeScript, Zod, JWT, bcrypt, Prisma.
- PostgreSQL is the only persistence backend. No client database credentials or signing secrets.

## Scope decisions

Academic MVP; location is a pickup address rather than live tracking. Password reset, push notifications, route optimization, and payments require external services and are not in the core path. Password reset screen gives a clear unavailable state until an email provider is configured.
