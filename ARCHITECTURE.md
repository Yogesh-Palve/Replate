# RePlate Architecture

RePlate is a TypeScript monorepo with an Expo Router mobile client, an Express API, shared domain types, and PostgreSQL persistence through Prisma.

```mermaid
flowchart LR
  subgraph Client[Android / Expo Go]
    Screens["Expo Router screens<br/>Donor · NGO · Volunteer · Admin"]
    Auth["SecureStore session<br/>Bearer access token"]
    Query["TanStack Query<br/>role-scoped cache"]
    Screens --> Query
    Auth --> Query
  end

  subgraph Service[Express API]
    Routes["REST routes<br/>/auth · /donations · /requests<br/>/volunteer · /admin · /impact"]
    Guards["JWT authentication<br/>role and ownership guards"]
    Rules["Validation and workflow rules<br/>quantity allocation · assignment states"]
    Routes --> Guards --> Rules
    QR["Collection QR issue and scan<br/>short-lived, single-use token"]
    Rules --> QR
  end

  subgraph Storage[PostgreSQL]
    Prisma[Prisma ORM]
    Tables[(User · Organization · VolunteerProfile<br/>Donation · Request · Assignment · Delivery<br/>CollectionToken)]
    Prisma --> Tables
  end

  Query <-->|JSON REST / HTTPS or local LAN| Routes
  Rules <--> Prisma
  AdminCLI[Admin bootstrap CLI] --> Prisma
```

## Main data and trust boundaries

- The mobile app displays role-aware screens and sends authenticated API requests. SecureStore holds the access token; role and ownership authorization remain server-side.
- The Express API validates inputs and performs status/quantity changes. Reservation, QR consumption, and collection transitions use database transactions; the client does not decide authoritative quantities or workflow states.
- PostgreSQL is the system of record. Prisma migrations evolve the schema; QR tokens are stored as keyed hashes with assignment/volunteer binding, expiry, and one-use/revocation timestamps.
- Dashboard impact metrics aggregate real confirmed workflow rows and preserve each donation's original unit. Meal estimates use only documented meal/portion units; no unsupported environmental estimate is produced.
- The admin bootstrap is a local backend CLI action. Public registration cannot assign the Admin role.

## Donation lifecycle

```mermaid
stateDiagram-v2
  [*] --> AVAILABLE: Donor publishes
  AVAILABLE --> PARTIALLY_RESERVED: NGO request approved / some quantity remains
  AVAILABLE --> FULLY_RESERVED: NGO request approved / quantity exhausted
  PARTIALLY_RESERVED --> FULLY_RESERVED: remaining quantity reserved
  AVAILABLE --> CANCELLED: Donor cancels eligible listing
  PARTIALLY_RESERVED --> CANCELLED: Donor cancels when business rules allow
  FULLY_RESERVED --> EXPIRED: deadline passes
  PARTIALLY_RESERVED --> EXPIRED: deadline passes
```

An approved request follows `APPROVED → VOLUNTEER_ASSIGNED → COLLECTED → DELIVERED → COMPLETED`. At the collection transition, the assigned Volunteer scans the Donor's current QR. The server consumes the matching, unexpired token atomically; delivery and NGO confirmation then use the existing workflow.
