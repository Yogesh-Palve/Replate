# Requirements

## Functional

1. Register and log in as donor, NGO, or volunteer; admin provisioning is controlled by the API environment.
2. Store passwords as bcrypt hashes and authenticate protected routes with expiring JWTs.
3. Donors create, inspect, cancel, and manage donations, including food, category, quantity/unit, preparation time, collection deadline, and pickup address.
4. NGOs browse/search/filter available donations, request a quantity, and track requests/history.
5. Donors approve or reject pending requests. Approval must atomically reserve available quantity and update donation status.
6. Available volunteers accept assignments, mark food collected, and mark delivery complete; the NGO confirms receipt.
7. Admins verify NGOs, inspect users/donations/requests/deliveries, and see aggregate metrics.
8. Enforce role permissions and legal status transitions at the API boundary.
9. Present role-aware mobile navigation, forms, loading/error/empty states, and secure token storage.

## Non-functional

- Strict TypeScript, modular API routes/controllers/services, Zod validation, Prisma relations and indexes.
- Keep secrets on the server. Use parameterized ORM queries and transaction-safe quantity allocation.
- Android-compatible Expo app and responsive, accessible mobile UI.
- Document setup, schema, API, testing, limitations, and milestone status.

## Acceptance criteria

- End-to-end donor → NGO → donor approval → volunteer → NGO confirmation can be demonstrated.
- Two competing requests cannot reserve more than the donated quantity.
- Unauthorized role actions and illegal workflow skips return a client error.
- Prisma schema generates; TypeScript checks and API tests pass when dependencies and PostgreSQL are available.
