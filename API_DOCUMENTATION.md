# API Documentation

Base URL: `http://localhost:4000/api/v1`. JSON requests; authenticated routes require `Authorization: Bearer <accessToken>`. Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }`.

Validation errors include field paths and messages in `details`; authorization failures return 401 for missing/invalid authentication and 403 for a role without permission. Quantity/state conflicts return 409 with a specific error code. Passwords are stored as bcrypt hashes; the API returns signed access tokens, never password values.

The example development configuration allows all CORS origins, and the API currently does not rate-limit authentication requests. Restrict `CORS_ORIGIN` and add appropriate request throttling before public production deployment.

## Authentication

- `POST /auth/register` `{name,email,password,role,organizationName?}` → user and access token. Roles accepted: DONOR, NGO, VOLUNTEER. Admin registration is not permitted.
- `POST /auth/login` `{email,password}` → user and access token.
- `GET /auth/me` → current user and profile.

Admin provisioning is a server CLI task (`npm run admin:bootstrap -w @replate/api`) using backend-only `ADMIN_EMAIL` and `ADMIN_PASSWORD`; there is no public admin registration endpoint.

## Donations

- `POST /donations` (DONOR) creates foodName, category, quantity, unit, preparedAt, collectionDeadline, pickupAddress, description.
- `GET /donations` (authenticated; NGOs see eligible listings; donors see their own) optional `search`, `category`, `status`.
- `GET /donations/:id` details.
- `PATCH /donations/:id/cancel` (own donor; no active reservations).

## Requests and delivery

- `POST /donations/:id/requests` (verified NGO) `{quantity,note?}`.
- `GET /requests` scoped to current donor/NGO.
- `PATCH /requests/:id/approve` or `/reject` (own donor; pending only). Approval reserves quantity atomically and makes an unclaimed volunteer task.
- `PATCH /requests/:id/cancel` (requesting NGO; pending or approved under guarded release rules).
- `GET /volunteer/tasks` (VOLUNTEER) lists unassigned work and own work.
- `PATCH /volunteer/availability` `{available:boolean}`.
- `PATCH /assignments/:id/accept`, `/decline`, `/deliver` (assigned volunteer; sequential transitions; decline is allowed before collection).
- `POST /assignments/:id/collection-qr` (owning DONOR, after volunteer acceptance) issues or rotates a 10-minute, one-use QR payload and returns `{qrPayload,expiresAt}`. The payload is intended only for display to that assignment's volunteer.
- `PATCH /assignments/:id/collect` (assigned VOLUNTEER) requires `{token}` from the donor QR. Token consumption and the existing assignment/delivery/request collection transition are atomic. Invalid, expired, revoked, or reused tokens return 409; a different volunteer cannot redeem the assignment's token.
- `PATCH /requests/:id/confirm-delivery` (requesting NGO; delivered only).

## Administration

- `GET /admin/stats`, `/admin/users`, `/admin/organizations`, `/admin/donations`, `/admin/requests` (ADMIN).
- `PATCH /admin/organizations/:id/verify` `{verified:boolean}`.

## Impact summary

- `GET /impact/summary` (DONOR, NGO, VOLUNTEER, ADMIN) returns role-scoped `summary` data: `donationsCreated` (DONOR's own or ADMIN platform total; `null` for NGO/VOLUNTEER), `redistributedByUnit`, `completedRequests`, `completedDeliveries`, and `estimatedMeals`.
- Redistribution includes only requests in `COMPLETED` with a `CONFIRMED` delivery. Quantities remain grouped by the donation's original `unit`; unlike units are never added together. Donor scope follows `Donation.donorId`, NGO scope follows its organization, Volunteer scope follows its assignments, and Admin scope is platform-wide.
- Meal estimates include only units normalized to meal, meal packet, portion, or serving (one such unit equals one estimated meal); other unit quantities are not converted. The response includes `mealEstimateAssumption` so clients can label the estimate. No emissions figure is returned because consistent food weights and an approved emissions factor are not stored.

Status values and transition rules are enforced by the API service. All IDs are UUIDs. See route source for exact response properties.

Donation states are `AVAILABLE`, `PARTIALLY_RESERVED`, `FULLY_RESERVED`, `EXPIRED`, and `CANCELLED`. Request states are `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `VOLUNTEER_ASSIGNED`, `COLLECTED`, `DELIVERED`, and `COMPLETED`. Expired listings are hidden from NGO browsing and approvals reject requests after the deadline.
