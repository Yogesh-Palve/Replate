# Development Log

## 2026-11-15 — Phase 5: Final stability and CPAD preparation

- Final live API/database smoke passed across Donor, NGO, Volunteer, and Admin, including role guards, request approval and allocation, QR rotation/revocation/authorization, concurrent one-time scan protection, delivery, NGO confirmation, and role-scoped impact reconciliation. `/health` returned `ok`; no database reset or deletion was used.
- Passed in the final code review: API tests 12/12; mobile tests 38/38; workspace TypeScript; shared/API build; Prisma schema and migration status; Expo SDK dependency validation; Expo Doctor 20/20; Android production export (1,555 modules; 3.7 MB Hermes).
- `npm audit` reports 6 transitive findings (3 moderate, 3 high) under `minimatch` via Expo fingerprint and `deepmerge-ts` via Prisma config. The suggested `--force` path changes major framework versions; no such upgrade was applied. Targeted overrides did not produce a validated lockfile resolution. Track compatible upstream patches; details are in `TESTING.md`.
- Added `ARCHITECTURE.md` with system/trust-boundary and donation lifecycle diagrams, and `CPAD_DEMO.md` with setup, an eight-minute role sequence, and a screenshot list that avoids capturing live QR tokens or credentials.
- User confirmed the core QR handover on a physical Android phone. This workstation has no Android device/emulator or `adb`, so actual screenshot images and the remaining expiry/permission-negative checks are still manual. The capture checklist is ready; no images were fabricated.
- Phase 5 remains limited to polish, verification, and CPAD preparation; no new major feature or Smart Expiring-Soon system was added.
- Phase 5 documentation/CPAD commit: `cccdb0c` (`Prepare RePlate for CPAD evaluation`).

## 2026-11-15 — Physical QR confirmation and NGO listing badge fix

- User confirmed the donor-to-assigned-volunteer QR handover succeeded on a physical Android phone. The QR display, scan, and collection checklist items are marked accordingly; expiry/reissue, negative scans, camera permission recovery, and downstream receipt checks remain pending.
- Fixed the NGO Browse card layout for `PARTIALLY_RESERVED`: the badge now reads “Partially reserved” and moves below the header so it cannot squeeze the listing title. Shared status labels for other long states are title-cased, with a max-width and wrapping safeguard on the common badge.
- Added regression coverage for donation-card status labels and other long workflow labels. Mobile tests, TypeScript, and Android production export passed (38 mobile tests; 1,555 modules; 3.7 MB Hermes bundle).
- Commit: `66372d6` (`Fix long donation status badge layout`).

## 2026-11-15 — Phase 4: One-time QR collection verification

- Added an additive Prisma `CollectionToken` table with unique assignment/token-hash constraints, expected volunteer binding, expiry, one-time use, and revocation. Applied migration `20261115120000_collection_qr_tokens` to the existing PostgreSQL database; Prisma reports the database is up to date. No existing rows were reset or deleted.
- Added donor-only QR issue/rotation for accepted assignments. The API returns plaintext only in the explicit donor QR response; PostgreSQL stores a keyed HMAC-SHA-256 hash and task/dashboard responses never include the token. Volunteer collection atomically verifies and consumes the QR with the existing Assignment/Delivery/Request transition. Declining an assignment revokes its current token.
- Added SDK 58-compatible Expo Camera scanning and QR rendering. The Volunteer Tasks action opens an assignment-bound scanner; the donor Requests screen displays a ten-minute QR. Camera access requests only the camera permission.
- Extended live workflow smoke and unit tests for role/ownership, pre-acceptance, QR rotation/revocation, other-volunteer access, invalid/replayed/concurrent use, expiry helper rules, and existing delivery/NGO confirmation behavior.
- Passed: API tests 12/12; mobile tests 37/37; workspace TypeScript; shared/API build; Prisma validation and migration status; Expo SDK dependency check; live PostgreSQL workflow smoke; Android production export (1,555 modules; 3.7 MB Hermes bundle); `git diff --check`.
- Commit: `5b581dd` (`Add one-time QR collection verification`).
- Pending: physical Android camera permission, QR display/readability, scan, and full journey verification. No Android device/emulator is connected here; `TESTING.md` leaves these checks unchecked.

## 2026-11-15 — Phase 3: Role-scoped impact and sustainability summary

- Added authenticated `GET /impact/summary`, scoped to donor-owned listings, the signed-in NGO, assigned volunteer work, or platform totals for Admin. It queries only NGO-confirmed completed requests and confirmed deliveries. Each original unit remains a separate quantity group.
- Home now shows role-appropriate donation/request/delivery counts, unit-grouped redistributed food, and a clearly labeled meal estimate. Meal units are limited to meal, meal packet, portion, and serving; each is estimated as one meal and unrecognized units are excluded from that estimate but retained in the breakdown. No environmental figure is shown because the database has neither standardized weight data nor a validated emissions factor. No schema migration or dependency was needed.
- Added calculation, role-display, role-cache invalidation, and unit-preservation tests; extended the database workflow smoke to assert all four roles and an exact completed fixture.
- Passed: API tests 10/10; mobile tests 36/36; workspace TypeScript; shared/API build; Android production export (1,234 modules; 2.9 MB Hermes); full live database workflow smoke including authorization, quantity allocation, delivery confirmation and impact scoping.
- Commit: `5570118` (`Add role-scoped impact dashboard`).
- Impact view still needs manual appearance review on the four physical-device role sessions; the existing Android phone is needed for the QR camera workflow in Phase 4.

## 2026-11-15 — Phase 2 follow-up: button contrast, donor dashboard refresh, logout race

- Root cause 1: shared `Button` applied green foreground whenever `secondary` was set, even when `destructive` had changed the surface to red. Added a centralized danger-action palette (`#B42318` with white foreground) and made destructive styling take precedence for label, icon, and spinner. This fixes Cancel Listing, Logout, Decline Request, and Cancel Request consistently.
- Root cause 2: Home caches by `['home', role]`, while listing mutations only invalidated donation/request/admin caches. The Donor metric data itself comes from the authenticated donor-scoped `/donations` and `/requests` endpoints, but its separate dashboard cache stayed fresh/stale independently. Create/cancel/request mutations now invalidate the relevant role dashboard. Home also refreshes only when its query is invalidated or older than the shared 15-second stale window on navigation focus. No full reload or repeated timer polling.
- Root cause 3: logout deleted SecureStore token before changing auth state; mounted tabs could query during the transition (and Home's null-role fallback could select the Donor key). Logout now marks the transition, cancels all in-flight queries, aborts signal-aware protected requests, removes the token, then clears user state and private query cache. Protected queries are disabled while signed out/signing out. Error notifications remain enabled for genuine API/auth errors while a user is signed in.
- Added tests for danger palette contrast, role-targeted dashboard invalidation/focus freshness, and logout sequencing/failure behavior for all four roles. Existing donor summary tests verify role-specific counts.
- Passed: mobile tests 34/34, API tests 8/8, workspace TypeScript, shared/API build, Android production export (1,233 modules; 2.9 MB Hermes), and `git diff --check`. No backend/API contracts or database schema changed.
- Physical Android checks for visual contrast, dashboard freshness, and logout from all four roles are listed unchecked in `TESTING.md`; automated tests do not prove those on-device behaviors.

## 2026-11-15 — Android auth input focus investigation

- Traced Login, Registration, `Field`, shared `Screen`, auth Stack, and auth context. No `autoFocus`, focus refs, imperative `.focus()`/`.blur()`, focus effects, or navigation lifecycle loop exists.
- Found two focus-sensitive Phase 2 changes in the shared field path: focus/blur caused React state updates solely to change the field border/icon (an avoidable render during native focus), and auth used `autoComplete="password"`, which is not the documented React Native Android password hint. Corrected Login to `current-password`, Registration to `new-password`, removed focus-driven component state, retained the branded caret color, and disabled capitalization/correction for secure password entry.
- Added regression checks that assert the shared Field does not programmatically/statefully manage native focus and that auth uses supported password autofill values. Other screens share this Field and receive the same focus-state stabilization.
- Passed: mobile tests 29/29, workspace TypeScript, Android production export (1,232 modules; 2.9 MB Hermes), and `git diff --check`. No backend/API/schema changes.
- The user-reported cycling could not be reproduced on this workstation because `adb` and an Android emulator are unavailable. These source-level fixes are not considered physically verified; the Login/Registration and shared-field phone checklist in `TESTING.md` remains pending. Confirm native focus behavior on the physical Android device before marking this resolved.

## 2026-11-15 — Phase 2: Complete role-based mobile UI redesign

- Completed the approved sequence: Welcome/Login/Registration; Donor home, donation create/list/history, requests and profile; NGO home, discovery/details/request/received tracking and profile; Volunteer home, assignment filters/actions and profile; Admin overview, verification, user filters, and donation/request monitoring.
- Expanded shared screen, title, field, date/time, button, card, status, empty/loading, metric, section, and filter components with consistent spacing, icon treatment, Android accessibility labels, and pressed states. Refined bottom navigation and kept all four role visibility rules.
- Added data-backed role summaries and NGO Donation Details. NGO request submission validates whole-number quantity against current available stock, calls the existing request API, preserves guarded loading/error/success feedback, and invalidates donation/request/detail queries. Existing backend, schema, quantities, and workflow rules were not changed.
- Added tests for volunteer task-state filters; extended donation state tests. Latest checks passed: workspace TypeScript, API tests (8/8), mobile tests (27/27), shared/API build, Android Expo export (1,232 modules; 2.9 MB Hermes bundle), and `git diff --check`.
- Expo dependency validation reports packages up to date against the bundled SDK compatibility map; the online versions endpoint was unreachable. Expo Doctor could not run because it is not installed locally and network access to npm registry is unavailable. No Android emulator/SDK or physical device was available for this run, so visual/responsiveness/navigation checks and native date/time picker checks remain pending in `TESTING.md`.
- No Phase 3 work or new impact/QR/urgency features were started.

## 2026-11-15 — Phase 1: RePlate branding and design system

- Inspected the actual Expo Router auth/tab routes, shared controls, theme, icon package, app config, API/database boundaries, and package/test setup. The prior app had a small color-only theme, shared controls with inline style values, no original logo, and no launcher/splash assets.
- Created an original plate, leaf, and circular-return mark with vector SVG source, reusable transparent PNG, iOS/general app icon, Android adaptive foreground, and branded splash art. Added a small Pillow-based asset regeneration script and configured SDK 58 splash/icon settings.
- Expanded centralized tokens to include the requested brand palette, semantic states, spacing, typography, radii, and elevation while retaining compatibility aliases. Updated shared primitives, global toast colors, Android status bar, and auth screens to consume the shared foundation. Existing screen layouts and role/business flows were not redesigned.
- Added tests for palette/aliases, design-token availability, and semantic workflow badge variants. Passed: mobile tests (22/22), API tests (8/8), workspace TypeScript checks, Expo dependency validation using the local SDK map (online versions endpoint unavailable), Expo Doctor (20/20), resolved Expo config asset/plugin paths, PNG asset regeneration, and Android production export (1,229 modules; 2.9 MB Hermes bundle). No physical-device or native splash visual claim is made; those require a native Android build/device.
- Phase 1 code/config/export acceptance is complete. Phase 2 redesign is now complete for code, automated checks, and Android bundle export; physical-device visual verification is still pending. Phase 3 and other new product features remain outside this approval.

## 2026-11-15 — Donation cancellation state and eligibility

- Fixed donor donation cards to show **Cancel listing** only for `AVAILABLE` and `PARTIALLY_RESERVED` donations. On successful cancellation, the API response updates matching React Query donation-list caches immediately, then donation, request, and admin queries are invalidated. The success toast now reads “Donation listing cancelled successfully.”
- The cancellation endpoint now permits only available/partially reserved listings and returns `409 INVALID_TRANSITION` for cancelled, expired, or fully reserved listings. Its existing row lock and open-request guard remain in place, so pending or otherwise active requests prevent cancellation. Cancellation changes status only; it does not alter quantities or resolved request records.
- Added regression tests for allowed status, pending/active request rejection, repeat cancellation rejection, visible-action eligibility, and immediate cached status updates. A database-backed smoke command was added in the follow-up investigation below.

## 2026-11-15 — Cancellation persistence and stale-query investigation

- Reproduced the API/database portion with a new donor donation: the endpoint returned `donation.status = CANCELLED`, PostgreSQL stored `CANCELLED`, and a fresh donor donation-list request returned `CANCELLED`. Repeating cancellation returned `409 INVALID_TRANSITION`.
- A verified test NGO created a pending request against a second test donation. Cancellation returned `409 ACTIVE_REQUESTS`; PostgreSQL status stayed `AVAILABLE` and `availableQuantity` stayed unchanged. After the test NGO cancelled its pending request, donor cancellation succeeded. An approved request reserved two units, blocked donation cancellation, and kept stock unchanged until NGO cancellation restored the reservation; only then could the donor cancel. Test accounts/records use `.invalid` addresses and remain in the local database; no existing records were changed or removed.
- Source review found the earlier mobile handler accepted the response through an unchecked type cast and fired query invalidations without first cancelling a donation-list fetch already in progress. Such a stale `AVAILABLE` response could replace the status patch. The client now validates the response donation ID and `CANCELLED` status, cancels in-flight `donations` queries before patching all list caches, then awaits donation/request/admin invalidation. Donation cards render their status and cancellation action from one tested presentation function.
- The React Query regression test reproduces the UI bug when an older in-flight `AVAILABLE` list response overwrites the cancellation cache patch; the fixed sequence cancels that request before patching and keeps `CANCELLED` rendered.
- Passed after the follow-up: API tests 8/8, mobile tests 19/19 (including both the reproduced stale-fetch failure sequence and its fixed sequence), workspace TypeScript checks, shared/API build, database-backed cancellation smoke, and Android export (1,227 modules; 2.9 MB Hermes bundle).
- The workstation has no `adb` or emulator, so the physical screen itself was not reproduced or verified here. Refresh Expo Go from the running RePlate Metro project and confirm the visible card says `CANCELLED` with no **Cancel listing** action; see the final response for the exact check.

## 2026-11-15 — Shared mobile notifications and role tab icons

- Added a global, safe-area-aware notification banner with slide animation, success/error/warning/info styles, close action, 4.5-second default dismissal, persistent API errors, replacement/deduplication, and timer/animation cleanup. Authentication and Donor, NGO, Volunteer, and Admin actions now use consistent feedback; field validation remains inline.
- Replaced missing role tab glyphs and the welcome-screen food emoji with Lucide font icons from the Expo Go-compatible `@react-native-vector-icons/lucide` package. Donor, NGO, Volunteer, and Admin tab visibility and icon selection have unit coverage.
- Added notification-model timer/deduplication tests and expanded mobile validation coverage. Verified: mobile tests 14/14, API tests 5/5, workspace TypeScript checks, Expo dependency check (local bundled map; online endpoint unavailable), Expo Doctor 20/20, and Android production export (1,226 modules; 2.9 MB Hermes bundle, including the 815 KB Lucide font asset).
- Physical-device presentation, native font rendering, and notification accessibility still need confirmation in Expo Go; the manual checklist is in `TESTING.md`. No backend or database changes were made.

## 2026-11-14 — Final MVP stability review

- Expanded the live workflow smoke test to cover Donor, NGO, and Volunteer login in addition to registration; role-specific endpoint restrictions; unverified NGO request rejection and admin verification; volunteer availability enforcement; pending-request quantity invariance; exact quantity reservation on approval; no quantity change on rejection; duplicate volunteer acceptance rejection; and competing approval requests.
- The concurrency test exposed a real response bug: PostgreSQL serializable transactions reported a raw-query serialization failure as Prisma `P2010`, and the API returned HTTP 500. The database lock and serializable isolation already prevented over-allocation. The API now recognizes PostgreSQL serialization/deadlock codes (`40001`, `40P01`) and Prisma `P2034`, returning a retryable HTTP 409 instead. Added unit coverage for the conflict classification.
- Re-ran the live workflow against the configured PostgreSQL database and API. Admin login/dashboard, role-specific registration/login/dashboard access, public admin-role rejection, cross-role restrictions, NGO verification, donation browse/request/approve/reject, over-allocation prevention, volunteer availability and task transitions, NGO delivery confirmation, final quantity consistency, and simultaneous competing approvals all passed. Exactly one competing reservation succeeded; stock remained nonnegative and the losing request could be rejected. Synthetic `.invalid` data is retained; no database reset or deletion was performed.
- Improved donation, request, volunteer-task, admin, and home query failure displays so API/server error details are visible with fallback text, rather than generic connection messages.
- Final checks passed: API tests 5/5, mobile validation/submission tests 7/7, workspace TypeScript checks, shared/API build, Prisma schema validation, migration status (up to date), API health over local and LAN addresses, Expo Doctor (20/20), local Expo dependency compatibility check, and Android production export (1,211 modules; 2.8 MB Hermes bundle).
- Expo Doctor passed 20/20 checks. The Expo install compatibility check also passed against its local SDK bundled package map, although the online versions endpoint was unavailable.
- `npm audit` reported 3 moderate findings in Expo fingerprint/minimatch and 3 high findings through Prisma CLI/config/deepmerge-ts; 0 critical. Suggested fixes require major version changes (including Expo downgrade or Prisma 7 migration), so no blind upgrades were applied. Reassess with a dedicated compatible-version/security review before release.
- `.env` files are ignored and are not tracked. No Android SDK, emulator, or adb is available. The user previously confirmed physical-phone Donor registration/login, but final review did not exercise all role screens or native date/time pickers on device.
- Security review: public admin self-registration is rejected; role middleware is enforced; passwords use bcrypt and API responses omit password hashes; no local environment file is tracked. Production hardening remains: the example CORS policy is wildcard and auth endpoints do not implement rate limiting. The repository has no existing Git commit to review for historical secret exposure.

## 2026-11-14 — Registration incident investigation

- Root cause identified: the phone displayed the legacy fallback text `Registration failed. Please try again.`, which is absent from the current registration source and freshly exported Android bundle. Metro was not running on port 8081, so the phone had no current bundle to load and was showing stale Expo Go code (and could retain an old embedded API URL).
- Verified the current `apps/mobile/.env` points to `http://192.168.1.147:4000/api/v1`; Metro and `GET /health` both return HTTP 200 over the LAN after restart.
- Direct registration requests to the configured API returned HTTP 201 for Donor, NGO, and Volunteer. NGO organization and volunteer profile records were included. A deliberately invalid email returned HTTP 400 with `VALIDATION_ERROR` and the `email` path. These created three synthetic `.invalid` diagnostic accounts, retained in the local database; no existing records were deleted.
- Matched client email validation to the backend Zod email format; backend field details now map to registration field errors. API failures include their code/status or network URL/cause. If registration succeeds but SecureStore fails afterward, the app explicitly says the account was created and directs the user to log in instead of retrying and creating a duplicate.
- Final checks passed: Expo install compatibility, Expo Doctor 20/20, workspace TypeScript, API tests 3/3, mobile tests 7/7, and Android production export (1,211 modules, 2.8 MB). The export does not contain the legacy screenshot text and embeds the current API URL.
- Restarted Expo in LAN mode at `exp://192.168.1.147:8081`. Physical-phone refresh and registration confirmation remain manual; the current QR is in the active Expo terminal.

## 2026-11-14 — Mobile validation, submission, and date/time controls

- Root cause: the shared `Button` showed a spinner whenever it was disabled, including for empty form fields. Login and registration set their busy state before validating, and the donation form tried to parse free-text timestamps with `toISOString()` before confirming they were valid.
- Split button disabled and loading states; added guarded, single-flight submissions, field-level login/registration/donation/request validation, inline API error messages, and proper pending/error feedback for donation, request, volunteer task, admin verification, availability, and sign-out actions. Admin donation/request views are read-only; role-specific operations remain available to donor, NGO, and volunteer accounts.
- Replaced manually typed donation timestamps with Expo SDK 58-compatible `@react-native-community/datetimepicker` (9.2.1), opening Android calendar and clock dialogs. Date/time are combined as local device time and serialized to ISO for the existing API. Client validation preserves the API rule that the collection deadline must be after preparation and in the future.
- Added mobile unit tests for login, registration, donation dates/quantities, NGO requests, API errors, and duplicate submission guarding.
- Validation passed: Expo install compatibility; Expo Doctor 20/20; `npm run typecheck`; mobile tests 6/6; API tests 3/3; Android production export (1,210 modules, 2.8 MB Hermes bundle).
- Reviewed the Donor, NGO, Volunteer, and Admin screens. The Profile screen has no profile-edit form or update endpoint; its existing sign-out action now has pending and failure states.
- Refreshed the ignored mobile `.env` to this computer's current Wi-Fi IPv4, `192.168.1.147`; the old configured IP had changed. The API and Metro both returned HTTP 200 from the current LAN address; Expo is running at `exp://192.168.1.147:8081`.
- Physical Android rendering of the native calendar/clock and updated forms still needs confirmation on the phone.

## 2026-11-14 — Expo SDK 58 upgrade

- Upgraded the mobile workspace from Expo SDK 54 to SDK 58 using Expo's SDK installation and compatibility workflow. Expo Router, Secure Store, Status Bar, Constants, Linking, React Native, safe-area context, screens, TypeScript, and React typings now use SDK 58 compatible versions (React Native 0.88.1 / React 19.3.0).
- Added the Expo Router peer packages `expo-constants` and `expo-linking`; aligned the workspace React/React DOM peer versions to the SDK's React 19.3.0 target and deduplicated the native React runtime.
- Updated the mobile TypeScript alias configuration for TypeScript 6 by removing deprecated `baseUrl` and retaining the `@/*` to `./src/*` mapping.
- Expo dependency validation (`expo install --check`) passed; Expo Doctor passed all 20 checks; `npm run typecheck -w @replate/mobile` passed.
- Production Android export passed: Metro bundled 1,193 modules and emitted a 2.8 MB Hermes bundle.
- Confirmed `apps/mobile/.env` still targets the phone-accessible API at `http://192.168.0.105:4000/api/v1`.
- Restarted Metro with `npm run start --workspace=@replate/mobile -- --lan`; Expo reports `exp://192.168.0.105:8081`. Metro returns HTTP 200 over loopback and the LAN address, and the backend health endpoint remains healthy.
- Expo Go/device interaction has not been verified on the physical phone; scan the fresh QR code and complete a login on the phone to verify the device runtime end to end.

## 2026-11-13 — Expo and live workflow verification

- `npm run dev:mobile` started Metro on port 8081; Metro status reported `packager-status:running`.
- Android export completed successfully: 1,036 modules bundled into a 2.89 MB Hermes bundle. No Android SDK, `adb`, or emulator process is installed, so visual UI/login testing on a device could not be performed.
- `GET /health` returned `{ "status": "ok", "service": "replate-api" }` on port 4000.
- `npm run smoke:workflow -w @replate/api` passed live admin login/dashboard, all four role data routes and permissions, public admin-role rejection, food browse/request/approval, over-allocation rejection, sequential volunteer states, NGO confirmation, and final quantity/status consistency.
- The first smoke attempt stopped at a test assertion that tried delivery before assignment acceptance. The assertion order was corrected and subsequent full runs passed. Its already-created synthetic data was retained; this includes one valid approved request with an open, unclaimed assignment and a rejected oversized request. No existing data was modified or deleted.
- `npm run typecheck`, `npm run build`, `npm test` (3/3), `prisma validate`, and `prisma migrate status` passed.

## 2026-11-13 — Admin bootstrap and API health

- Generated and stored a new JWT secret locally; credential values were not printed. `apps/api/.env` remains ignored and untracked by Git.
- Bootstrapped the configured admin account after confirming there were no existing admins. A follow-up database query confirmed the configured account has the `ADMIN` role.
- Started the API on port 4000 and verified `GET /health` returned `{ "status": "ok", "service": "replate-api" }`.

## 2026-11-13 — Local PostgreSQL setup

- Added `apps/api/.env.example` and configured the ignored `apps/api/.env` for local PostgreSQL at `localhost:5432`, database `replate_db`; credentials are not committed or logged.
- Prisma authenticated successfully and applied `20261113000000_init` using `prisma migrate deploy` (no reset/drop operation).
- Read-only introspection confirmed `User`, `Organization`, `VolunteerProfile`, `Donation`, `Request`, `Assignment`, and `Delivery`; `prisma migrate status` reports the database is up to date.
- `prisma validate` passes with the API environment loaded.

## 2026-11-13 — Initial implementation

- Workspace inspected; repository was empty and contained no existing user files.
- Established npm workspaces for Expo mobile, Express API, and shared TypeScript domain types.
- Added architecture, requirements, schema, API, setup, and testing documentation.
- Implemented the Prisma relational model and initial PostgreSQL migration.
- Implemented API authentication, donations, requests, safe quantity reservation, volunteer tasks, delivery confirmation, and admin monitoring/verification.
- Implemented Expo role-aware authentication/navigation, dashboard, donation/request/task/admin screens, typed API client, SecureStore token handling, and query setup.
- Validation: `npm ci --ignore-scripts` completed; Prisma Client generated; `prisma validate`, `npm run typecheck`, `npm run build`, and all 3 API allocation unit tests passed. `npm run dev:api` started. The HTTP health probe was blocked by the sandbox's local socket permissions. No app `.env` files exist and PostgreSQL is not listening on local port 5432, so DB-backed migration/concurrency and emulator flows remain unverified.
- Manual setup: configure `apps/api/.env`, provision PostgreSQL, run the documented migration, create the admin account with the bootstrap command, and set the mobile API URL for the chosen Android device.

## Known limitations

- Password reset UI explains that email recovery is not configured; no email provider or reset-token flow is included.
- No live GPS tracking, push notifications, map/geocoding, or automated volunteer dispatch.
- NGO must be verified by an admin before requesting donations.
- Admin creation uses a one-time server-side bootstrap command; public registration cannot claim an admin role.
