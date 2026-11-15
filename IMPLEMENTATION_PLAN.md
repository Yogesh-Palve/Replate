# RePlate Premium Redesign and Feature Plan

## Objective and guardrails

Elevate the existing RePlate monorepo into a polished food redistribution product while preserving the working Expo, Express, PostgreSQL, and Prisma architecture. Phases 1 and 2 are complete. The user has authorized Phases 3, 4, and 5 to proceed autonomously; the only planned pause is for physical-device QR/camera verification after Phase 4 automated work is complete.

- Keep role authorization, validation, transactional reservations, notification behavior, native pickers, and existing navigation working.
- Keep PostgreSQL data and migrations non-destructive. Any future schema changes are additive, reviewed, and tested against existing records.
- Prefer shared components and design tokens over screen-specific duplication. Avoid new dependencies unless an existing package cannot satisfy the requirement.
- Use real API/database data for product metrics and workflow decisions. Do not expose credentials, OTPs, or other secrets in logs or normal responses.
- Treat food safety separately from deadline urgency. Do not label food as safe based on an urgency score.
- At the end of each phase, update this plan, development log, testing/documentation, run relevant checks, and record the commit. Do not claim device checks that were not observed.

## Repository and architecture review

### Current structure

```text
apps/
  api/src/{config,middleware,modules,utils}/   Express API, auth, role guards, domain routes
  api/prisma/{schema.prisma,migrations}/       PostgreSQL model and committed SQL migrations
  mobile/app/(auth)/                           Expo Router welcome, login, registration, recovery
  mobile/app/(tabs)/                           Home, donations, requests, volunteer tasks, admin, profile
  mobile/src/api/                              Axios API client
  mobile/src/components/ui.tsx                 Shared screen, title, field, button, card, status, picker
  mobile/src/context/                          Auth session backed by SecureStore
  mobile/src/notifications/                    Global toast provider and timer model
  mobile/src/navigation/                       Role tab visibility and Lucide glyph selection
  mobile/src/theme/index.ts                    Existing small color palette
packages/shared/src/                           Shared role and workflow types
```

The mobile app uses Expo SDK 58, React Native 0.88, React 19, Expo Router, TanStack Query, SecureStore, native Android date/time pickers, and Lucide font icons. The API owns business rules and persistence; Prisma uses PostgreSQL. Donation approval serializes on the donation record and reserves quantity transactionally. The current schema has `User`, `Organization`, `VolunteerProfile`, `Donation`, `Request`, `Assignment`, and `Delivery` models.

### UI and brand foundation (Phase 1 complete; Phase 2 now applied across screens)

- Shared UI primitives in `apps/mobile/src/components/ui.tsx` now cover screens, titles, fields, native date/time pickers, buttons, cards, statuses, empty/loading states, metrics, section headings, and filters.
- `apps/mobile/src/theme/index.ts` provides the RePlate palette plus spacing, typography, radii, elevation, and semantic status tokens while retaining aliases for existing screens.
- Original logo, app icon, and splash assets are under `apps/mobile/assets/branding` and wired to Expo configuration.
- Phase 2 applies the shared system across auth and all four role experiences; a few data-specific layouts still use component styles for information hierarchy.
- `app.json` has Expo Router, SecureStore, Status Bar, and date picker plugins. Branding assets need native app-config wiring. Expo Go cannot demonstrate the final native splash/app icon; a release/development build is needed to validate those native assets. [Expo SDK 58 splash-screen guidance](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/)

### Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Broad UI changes can hide regressions in role workflows | Redesign in role milestones, retain API contracts and role guards, add state tests, then verify the full workflow and device checklist. |
| A logo that looks good in a large view may fail at launcher size | Design a simple high-contrast mark; create 1024px PNG icon variants and inspect at small sizes before configuration. |
| Native splash/icon config will not appear in Expo Go | Verify Expo config and Android export now; reserve device/release-build inspection for a build that includes native assets. |
| Adding analytics can double count partial reservations or deliveries | In Phase 3, derive redistributed quantities from completed requests/delivery confirmation, not approved reservations; test calculations against API/database fixtures. |
| QR tokens add sensitive state and concurrency/security requirements | In Phase 4, store only keyed hashes, enforce expiry and atomic one-time consumption, and never log token values. |
| Existing operational data must survive future schema work | Use additive migrations, inspect migration status, and never reset/drop user data. |

## Phase 1 — Branding and design system (complete)

### Scope

1. Create an original plate/leaf/circular-redistribution logo and reusable brand lockup.
2. Create app icon and splash assets, configure the Expo app, and add in-app branding to welcome/login/registration without redesigning those screens.
3. Centralize the supplied palette plus spacing, typography, radii, elevation, and semantic status colors. Preserve compatibility aliases used by current screens while migrating shared UI and toast colors to tokens.
4. Refine shared `Screen`, `Title`, `Field`, `Button`, `Card`, and `Status` primitives so current screens inherit consistent spacing, typography, borders, and status treatments.
5. Keep the existing Lucide icons, role navigation, global toast behavior, native pickers, API integration, and screen layouts intact.
6. Add focused tests for design tokens and semantic status variants; run workspace TypeScript, mobile/API tests, Expo dependency checks/Doctor, and Android export.

### Acceptance criteria

- RePlate logo is original, legible at launcher size, and available as a reusable in-app mark, launcher icon, and splash image.
- Palette matches the requested values; semantic success/error/warning colors have readable contrast and are used consistently by shared controls and toasts.
- Shared primitives use centralized tokens without breaking existing props, role flows, forms, or navigation.
- App config resolves all asset paths; Android production JavaScript export and relevant checks pass.
- Expo Go limitations for native splash/icon are documented; no claim of native splash verification without a build/device that can show it.
- README, TESTING, DEVELOPMENT_LOG, and this plan accurately reflect Phase 1 results.

### Out of scope

No full screen/dashboard redesign, no analytics endpoints, no OTP workflows, no urgency filters, no backend/database changes, and no new role actions. Those belong to later phases.

## Phase 2 — Complete mobile UI redesign (approved and implemented)

Redesign all existing mobile screens consistently using the Phase 1 system: Welcome/auth/role selection; Donor home, donation form/list/detail, requests/history/profile; NGO home, discovery/detail/request/tracking/received donations/profile; Volunteer home, task lists, pickup/delivery/completed tasks/profile; Admin dashboard, statistics, verification, user/donation/request/delivery monitoring.

Preserve endpoint contracts, role visibility, form validation, loading/error/toast behavior, cancellation/quantity rules, date/time controls, and navigation. First map actual implemented routes and API capabilities; do not invent unavailable backend actions. Add screen-level tests where practical, run all existing tests and export, then leave manual Android visual checks unchecked until observed.

**Completed:** The six internal milestones are implemented in sequence. Shared UI and navigation are consistent; live API data backs dashboards and monitoring; NGO detail/request uses existing routes and validation; volunteer assignment state filters and current workflow actions are retained. TypeScript, API/mobile automated tests, shared/API build, and Android production export passed. Expo dependency check used its local bundled map; network lookup was unavailable. Expo Doctor could not run because the CLI was absent locally and npm registry access was unavailable. Physical-device layout, native picker, and end-to-end role navigation checks remain unchecked in `TESTING.md`.

**Exit gate:** Code and automated/export checks are complete. Device-only checks remain for the user's phone; do not claim those until observed. No Phase 3 work has begun.

## Phase 3 — Impact dashboard (complete)

### Data definitions and delivered scope

- Platform and donor redistributed quantity: sum `Request.quantity` only for completed requests, grouped by the donation's donor where needed.
- NGO received quantity: completed request quantities for the NGO's organization.
- Volunteer contribution: quantities for completed requests assigned to that volunteer, with delivery confirmation.
- Completed delivery count: confirmed/completed deliveries, counted once per assignment/request.
- Donation-created counts are scoped to the authenticated donor; NGO, volunteer, and admin views use their own permitted summaries.

Delivered a role-scoped API and dashboard backed by completed requests with confirmed deliveries. Quantities are grouped by their original unit to avoid adding unlike units. A meal estimate is shown only for recognized meal/portion/serving units at one meal per unit, with the assumption disclosed. Environmental estimates are omitted because the current schema has no defensible standardized weights or emissions factors. No migration was required.

API and mobile tests, TypeScript/build checks, the live four-role workflow smoke, and Android production export passed. Phase 3 is committed after final plan reconciliation.

## Phase 4 — QR collection verification (authorized; in progress)

Extend the existing assignment/collection state machine: the donor generates a short-lived QR for an accepted volunteer assignment, and that assigned volunteer scans it to mark collection. The server issues a cryptographically random token, stores only a keyed hash, checks donor ownership and volunteer assignment, expiry and one-time use, and consumes the token atomically with the existing collection transition. QR plaintext is returned only to the donor who generated it and is never logged. Existing delivery and NGO receipt confirmation continue unchanged. Use SDK 58 compatible camera/QR packages and an additive migration only if required.

Test valid, malformed, wrong-assignment, expired, reused, unauthorized, concurrent, and repeated-transition cases and preserve existing records. Complete API/mobile checks, export and documentation before asking the user to test camera permission and QR scanning on the physical Android phone. Wait for the observed result before final polish.

## Phase 5 — Final polish and CPAD preparation (authorized; after QR device check)

Run complete four-role workflow regression, concurrency/security checks, Expo Doctor/dependency validation, dependency audit review, Android production export/build, responsive Android visual/device checks, accessibility/performance review, and a documentation consistency pass. Verify the final journey: Donor → NGO request → Donor approval → Volunteer assignment → pickup verification → collection → delivery verification → NGO confirmation → updated impact metrics. Do not report physical-device verification that was not performed.

Prepare accurate README, TESTING, API_DOCUMENTATION, DATABASE_SCHEMA, DEVELOPMENT_LOG, architecture diagram, demonstration instructions, and a screenshot capture checklist. Do not fabricate physical-device screenshots. Record any remaining device-only limitations and then report the final status.

## Phase 1 progress log

- [x] Inspect project structure, UI primitives, routing, tokens, Expo config, dependencies, and workflow/data risks.
- [x] Write the six-phase plan and explicit approval gates.
- [x] Create original logo, app icon, and splash assets.
- [x] Implement design tokens and apply them to shared primitives, branding, toast, and icons.
- [x] Verify automated checks and document actual results (mobile/API tests, workspace TypeScript, Expo SDK check/Doctor, Expo config, Android export).
- [x] Receive approval for Phase 2 and later autonomous milestones; preserve the physical QR scan as the Phase 4 pause.

**Phase 1 status: complete for code/config/export.** Native launcher/splash visuals still require a native Android build/device and remain unchecked in `TESTING.md`.

## Phase 2 progress log

- [x] Milestone 1: Welcome, Login, Registration redesigned with shared brand and form components.
- [x] Milestone 2: Donor dashboard, listing/create/history, requests, profile and cancellation presentation redesigned.
- [x] Milestone 3: NGO dashboard, discovery, API-backed donation detail, quantity-validated request, received/request history and profile redesigned.
- [x] Milestone 4: Volunteer dashboard/tasks, availability, open/in-progress/completed filters and existing task actions redesigned.
- [x] Milestone 5: Admin dashboard/statistics, organization verification, role-filtered users, donation and request monitoring redesigned.
- [x] Milestone 6: Shared navigation/consistency review and manual Android verification checklist updated.
- [x] Automated checks: TypeScript; API tests 8/8; mobile tests 27/27; shared/API build; Android export (1,232 modules, 2.9 MB Hermes); diff whitespace check.
- [ ] Physical Android visual, native picker, font scale, and complete cross-role navigation/workflow check (manual, pending).

**Phase 2 status: implementation and automated checks complete; physical-device visual validation pending.**

## Phase 3 progress log

- [x] Implement authenticated, role-scoped impact summary API using completed requests and confirmed deliveries.
- [x] Present role-appropriate donation/redistribution metrics and unit-aware quantity breakdowns on Home.
- [x] Restrict meal estimates to recognized food-serving units and disclose the assumption; omit unsupported environmental estimates.
- [x] Invalidate impact data after relevant donation and request mutations.
- [x] Test calculations, role scope, query keys, and live workflow metrics; run TypeScript, API/mobile tests, build, Android export, and live smoke.
- [x] Update README, API_DOCUMENTATION, DATABASE_SCHEMA, TESTING, DEVELOPMENT_LOG, and this plan.

**Phase 3 status: complete; role-scoped data comes from the live API. No database schema change was needed.**
