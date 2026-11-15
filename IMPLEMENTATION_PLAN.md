# RePlate Premium Redesign and Feature Plan

## Objective and guardrails

Elevate the existing RePlate monorepo into a polished food redistribution product while preserving the working Expo, Express, PostgreSQL, and Prisma architecture. Work proceeds in six explicit phases. Phase 1 is in progress; no later phase or new product feature begins without the user's explicit approval.

- Keep role authorization, validation, transactional reservations, notification behavior, native pickers, and existing navigation working.
- Keep PostgreSQL data and migrations non-destructive. Any future schema changes are additive, reviewed, and tested against existing records.
- Prefer shared components and design tokens over screen-specific duplication. Avoid new dependencies unless an existing package cannot satisfy the requirement.
- Use real API/database data for product metrics and workflow decisions. Do not expose credentials, OTPs, or other secrets in logs or normal responses.
- Treat food safety separately from deadline urgency. Do not label food as safe based on an urgency score.
- At the end of each phase, update this plan, development log, testing/documentation, run relevant checks, report device-test limits, and wait for approval.

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

### Existing UI and brand foundation

- Shared UI primitives already exist in `apps/mobile/src/components/ui.tsx`; most screens use them, with some screen-specific inline styles remaining.
- `apps/mobile/src/theme/index.ts` only defines a compact color object. It does not yet define the requested spacing, typography, radius, elevation, or semantic status tokens.
- The current app uses the product name and a Lucide food icon, but no original RePlate logo, app icon, or splash configuration/assets exist in the mobile project.
- Toast colors and a few auth text colors are still hard-coded instead of consuming semantic design tokens.
- `app.json` has Expo Router, SecureStore, Status Bar, and date picker plugins. Branding assets need native app-config wiring. Expo Go cannot demonstrate the final native splash/app icon; a release/development build is needed to validate those native assets. [Expo SDK 58 splash-screen guidance](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/)

### Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Broad UI changes can hide regressions in role workflows | Keep Phase 1 limited to shared tokens, primitives, and branding; defer complete screen layout changes to Phase 2 and verify each role flow. |
| A logo that looks good in a large view may fail at launcher size | Design a simple high-contrast mark; create 1024px PNG icon variants and inspect at small sizes before configuration. |
| Native splash/icon config will not appear in Expo Go | Verify Expo config and Android export now; reserve device/release-build inspection for a build that includes native assets. |
| Adding analytics can double count partial reservations or deliveries | In Phase 3, derive redistributed quantities from completed requests/delivery confirmation, not approved reservations; test calculations against API/database fixtures. |
| OTPs add sensitive state and concurrency/security requirements | In Phase 4, store only keyed hashes, enforce expiry/attempt limits and atomic one-time consumption, and audit transitions without logging code values. |
| Urgency could be confused with food safety | Compute urgency from server time and collection deadline; state explicitly that urgency is logistical and says nothing about food safety. |
| Existing operational data must survive future schema work | Use additive migrations, inspect migration status, and never reset/drop user data. |

## Phase 1 — Branding and design system (active)

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

## Phase 2 — Complete mobile UI redesign (approval required)

Redesign all existing mobile screens consistently using the Phase 1 system: Welcome/auth/role selection; Donor home, donation form/list/detail, requests/history/profile; NGO home, discovery/detail/request/tracking/received donations/profile; Volunteer home, task lists, pickup/delivery/completed tasks/profile; Admin dashboard, statistics, verification, user/donation/request/delivery monitoring.

Preserve endpoint contracts, role visibility, form validation, loading/error/toast behavior, cancellation/quantity rules, date/time controls, and navigation. First map actual implemented routes and API capabilities; do not invent unavailable backend actions. Add screen-level tests where practical, run all existing tests and export, then leave manual Android visual checks unchecked until observed.

**Exit gate:** all existing workflows remain connected to real APIs; every implemented route follows the shared visual system; TypeScript/tests/export pass; documentation and screenshots/checklist are updated. Stop for user review.

## Phase 3 — Impact and sustainability dashboard (approval required)

### Data definitions

- Platform and donor redistributed quantity: sum `Request.quantity` only for completed requests, grouped by the donation's donor where needed.
- NGO received quantity: completed request quantities for the NGO's organization.
- Volunteer contribution: quantities for completed requests assigned to that volunteer, with delivery confirmation.
- Completed delivery count: confirmed/completed deliveries, counted once per assignment/request.
- Monthly trends: group confirmed delivery events using delivery confirmation timestamps and a documented timezone boundary.
- Active NGOs/volunteers: define “active” from existing account/profile data; do not imply recent activity unless an activity window is actually implemented.

Add efficient role-scoped aggregation endpoints, typed responses, loading/empty/error states, and tests for partial requests, cancelled/rejected requests, incomplete deliveries, units, and double-counting. Do not hardcode metrics or infer meals saved without an approved defensible conversion formula.

**Exit gate:** database-backed calculations reconcile with source rows; role access is tested; dashboard values and units are documented. Stop for user review.

## Phase 4 — QR/OTP handover verification (approval required)

Extend the existing assignment/delivery state machine rather than creating a parallel workflow. Define who receives pickup and delivery codes, how a volunteer submits them, and how an authorized donor/NGO verifies them. Use server-generated cryptographically random codes; persist only keyed hashes; include expiry, atomic one-time use, attempt limits/rate limiting, role and assignment checks, timestamps, and auditable transitions. Never return secrets in ordinary task/dashboard responses or logs. Add a manual OTP entry path; add QR scanning only if it fits the SDK 58 device permission/dependency model.

Use additive Prisma migrations and test valid, invalid, expired, reused, over-limit, unauthorized, concurrent, and repeated-transition cases, plus rollback and existing lifecycle compatibility. Stop for user review.

## Phase 5 — Deadline urgency (approval required)

Derive urgency on the server from the actual collection deadline and server clock. Document the urgent/expiring-soon/available thresholds, use UTC instants for comparisons, and include remaining time in a client-friendly representation. Support NGO sort/filter and clear badges; show donor deadlines and countdowns. Continue to block expired requests and approvals server-side, keep quantities transactional, and distinguish urgency from food safety. Avoid background-job infrastructure unless later evidence requires it.

Test threshold boundaries, timezone/DST serialization, expired listings, approved reservations, filters, and deadline transitions. Stop for user review.

## Phase 6 — Final polish and CPAD preparation (approval required)

Run complete four-role workflow regression, concurrency/security checks, Expo Doctor/dependency validation, dependency audit review, Android production export/build, responsive Android visual/device checks, accessibility/performance review, and a documentation consistency pass. Verify the final journey: Donor → NGO request → Donor approval → Volunteer assignment → pickup verification → collection → delivery verification → NGO confirmation → updated impact metrics. Do not report physical-device verification that was not performed.

Prepare accurate README, TESTING, API_DOCUMENTATION, DATABASE_SCHEMA, DEVELOPMENT_LOG, and demonstration instructions. Stop for final user review.

## Phase 1 progress log

- [x] Inspect project structure, UI primitives, routing, tokens, Expo config, dependencies, and workflow/data risks.
- [x] Write the six-phase plan and explicit approval gates.
- [x] Create original logo, app icon, and splash assets.
- [x] Implement design tokens and apply them to shared primitives, branding, toast, and icons.
- [x] Verify automated checks and document actual results (mobile/API tests, workspace TypeScript, Expo SDK check/Doctor, Expo config, Android export).
- [x] Pause for approval before Phase 2; no later phase or new feature is started automatically.

**Phase 1 status: complete for code/config/export.** Native launcher/splash visuals still require a native Android build/device and remain unchecked in `TESTING.md`. Phase 2 and Features A/B/C are not started; proceed only after explicit user approval.
