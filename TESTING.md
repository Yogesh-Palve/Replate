# Testing and Verification

## Automated checks

Run `npm ci`, `npm run typecheck`, `npm run build`, and `npm test`. API unit tests cover quantity reservation arithmetic, oversubscription rejection, and recognition of PostgreSQL serialization conflicts. The final review run passed all five API tests.

Run `npm run test:mobile` for client-side login, registration, donation scheduling, request quantity, API error formatting, and duplicate-submission guard tests. Run `npm exec -w @replate/mobile -- expo install --check` and `npm exec -w @replate/mobile -- expo-doctor` to validate Expo SDK dependencies.

Phase 1 branding checks: mobile tests assert the supplied brand colors, shared spacing/type/radius/elevation tokens, semantic workflow badges, and status-to-badge mapping. Check app config and asset references with `npx expo config --type public` and export Android with `npm exec -w @replate/mobile -- expo export --platform android --output-dir dist`. Expo Go does not display the final native splash/app icon; verify those in an Android build.

Registration checks should cover all public roles (Donor, NGO, Volunteer), NGO organization/address requirements, invalid email/password field messages, API duplicate-email responses, and retry after network or secure-storage errors. Direct API role registration has been verified against the local database; it creates `.invalid` diagnostic users. The physical Expo Go build needs a fresh Metro bundle after local code or `EXPO_PUBLIC_API_URL` changes.

With the API and configured PostgreSQL running, `npm run smoke:workflow -w @replate/api` exercises admin login/dashboard; Donor, NGO, and Volunteer registration, login, and role dashboards; public admin-role rejection; cross-role access restrictions; unverified NGO request rejection and admin verification; donation search; request approval/rejection; insufficient-quantity handling; volunteer availability enforcement and collection/delivery; NGO confirmation; and final state consistency. It also checks that a pending request does not reserve quantity, approval reserves exactly once, rejection does not consume quantity, an NGO cannot approve its own request, a volunteer cannot accept one assignment twice, and two simultaneous approvals cannot over-allocate stock. It creates unique synthetic `.invalid` accounts and food records and deliberately retains them; it never resets or deletes data. The final review run passed.

Database checks require PostgreSQL and `apps/api/.env`: run `npm run db:generate` and `npm run db:migrate`. `npm run db:deploy` applies committed migrations to a configured deployment database.

## End-to-end demonstration

1. Register a donor, a volunteer, and an NGO; set volunteer availability.
2. Set the NGO as verified through an admin account created with the server-side bootstrap command.
3. Donor creates 50 meal packets. NGO requests 30; donor approves. Assert available amount is 20.
4. A second NGO requests 25; donor approval must fail with insufficient quantity.
5. Volunteer accepts the first task, marks collected, then delivered. NGO confirms receipt; request becomes COMPLETED.
6. Verify other roles cannot perform donor, volunteer, or admin actions and illegal transitions are rejected.

## Concurrency case

Submit competing approvals against one donation concurrently. Exactly those requests whose combined quantity does not exceed the available quantity may be approved. Verify the final available amount is never negative and rejected/failed requests do not consume quantity.

## Device smoke check

Run Expo on an Android emulator or device with `EXPO_PUBLIC_API_URL` pointing to an API host reachable from that device. Check auth persistence, role tabs, empty/loading/error states, and the core lifecycle. Android production JavaScript export succeeds, but this environment has no Android SDK, `adb`, or emulator for visual/device testing. Expo Doctor passed 20/20 checks during the final review. The Expo install check reported dependencies up to date using its bundled SDK map; it could not reach Expo's online versions endpoint, so that particular check used the local compatibility data.

For the current Android form and picker changes, also check that empty/invalid login and registration fields show validation errors without a spinner; NGO registration requires organization name and address; donation date and time controls open the Android calendar and clock dialogs; a donation with a deadline before preparation or in the past is rejected; request quantities must be positive whole numbers within availability; and pending/error states appear for donor, NGO, volunteer, and admin actions. A physical-device run is still required to verify the native picker dialogs and updated screens.

## Manual Android device verification

Use the existing local test accounts for Donor, NGO, Volunteer, and Admin. Keep passwords local; do not add credentials to this checklist. Check an item only after observing it on the phone. Do not unverify or alter real accounts. Use a clearly labeled test donation and small quantities.

Device/date: __________  Android model/version: __________  Tester: __________

### Brand foundation

- [ ] In Welcome, Login, and Create Account, confirm the RePlate plate/leaf/reuse logo and “Good Food. Shared Better.” lockup render crisply and do not crowd the form on a small Android screen.
- [ ] On a native Android build, confirm the launcher icon is centered and recognizable at small size and the splash image/tagline are centered on the ivory background. Expo Go is not a valid splash-screen check.
- [ ] Confirm primary buttons, inputs, cards, status badges, and toasts use the same forest/sage/gold visual system; verify text contrast and button/status readability.

### Notifications and navigation icons

- [ ] Trigger success feedback from login and a successful action; confirm the toast slides in below the status bar, uses the success style, and dismisses after about 4.5 seconds.
- [ ] Trigger an API/network failure (for example, temporarily make the API unreachable); confirm the error toast shows useful detail, remains until dismissed, and does not leave a spinner running. Restore the API and retry without restarting the app.
- [ ] Tap the close button on a toast; confirm it dismisses. Trigger the same message twice and confirm the existing toast updates instead of stacking another banner.
- [ ] Confirm warning and informational toast styles are legible when those states are triggered.
- [ ] Inspect the bottom navigation icons on Donor, NGO, Volunteer, and Admin accounts. Confirm the icons render as Lucide glyphs (not empty boxes), match each tab, and only the expected role tabs are visible.

### Open app and role navigation

- [ ] Connect the phone and development computer to the same Wi-Fi. The current mobile API URL is `http://192.168.1.147:4000/api/v1`; if the computer's LAN IP has changed, update `apps/mobile/.env` and reload Expo. Open the current RePlate project in Expo Go and reload the latest bundle.
- [ ] On the Welcome screen, open **Log in** and **Create an account**; use Android Back to return without a blank or stuck screen.
- [ ] Log in with each existing test account. On **Home** and **Profile**, confirm the displayed name/role and the role-specific tabs below.
- [ ] Donor tabs: **Home**, **Donations** (My donations), **Requests**, **Profile**. NGO tabs: **Home**, **Browse**, **Requests**, **Profile**. Volunteer tabs: **Home**, **Tasks**, **Profile**. Admin tabs: **Home**, **Browse**, **Requests**, **Admin**, **Profile**; Volunteer Tasks should not appear for Admin.
- [ ] Scroll each role screen and use Android Back/keyboard dismissal. Confirm fields, buttons, and tab content remain reachable and are not covered by the keyboard.

### Donor — create and review food

- [ ] On **Donations**, open the donation form and press **Publish donation** with required fields empty. Confirm field-level errors appear and no loading spinner starts.
- [ ] Enter a recognizable test food name, category, small quantity (for example, 3 meal packets), unit, pickup address, and optional notes.
- [ ] Tap **Preparation date** and **Preparation time**. Confirm Android calendar and clock dialogs open; select values and confirm readable values appear in the form.
- [ ] Tap **Collection date** and **Collection time**. Confirm the native dialogs open and selected values display readably.
- [ ] Set a deadline in the past or before preparation and publish. Confirm a deadline error appears without submission/loading; correct it so preparation is earlier than now and collection is in the future, then publish once.
- [ ] Confirm the success message and new listing show the expected total and available quantity. Open **Requests** and confirm the NGO request appears.
- [ ] Approve the primary request. Confirm the request advances and the donation's available quantity decreases by exactly the approved amount.
- [ ] Reject a separate pending test request, if available. Confirm its status changes and donation availability does not change.

### NGO — browse, request, and confirm receipt

- [ ] Log in as the NGO and open **Browse**. Search for the labeled test donation; confirm its available quantity and collection deadline are visible.
- [ ] Request a positive quantity within availability. Confirm a success message and find the request in **Requests**.
- [ ] After Donor approves the primary request, optionally request the remaining unit as a second, separate test request so Donor can verify **Reject** without affecting the first request.
- [ ] Try quantity `0` or a quantity greater than available. Confirm a clear validation/API error appears and no request is created.
- [ ] If using a new, unverified test NGO, confirm the Home verification notice appears and a food request is denied until Admin verifies it. Do not change a real organization's verification.
- [ ] After Volunteer marks the test delivery complete, open **Requests** and tap **Confirm successful delivery**. Confirm the request shows completed/confirmed.

### Volunteer — accept and deliver

- [ ] Log in as the Volunteer and open **Tasks**. Toggle **Available for assignments** off, then on; confirm the control updates and no error appears.
- [ ] With availability off, try accepting the labeled open test task if the action remains available. Confirm the server's “not available” message appears and the task is not accepted; turn availability back on.
- [ ] Tap **Accept task** for the labeled test donation. Confirm the assigned task/status appears and duplicate taps are disabled while the request is in progress.
- [ ] Tap **Mark food collected**, then **Mark delivered**, in order. Confirm the status updates at each step and errors stop the action if a required prior step is missing.

### Admin — review and verify

- [ ] Log in with the existing Admin account and open **Admin**. Confirm statistics and the organization, donation, user, and request sections load.
- [ ] Verify an unverified disposable test NGO using **Verify organization**. Confirm its status changes to verified and the NGO can then request food. Skip this check if it would alter a real account.
- [ ] Confirm Admin has no donor create/cancel, NGO request/confirm, or Volunteer task actions; its donation/request views are monitoring views.

### End-to-end result

- [ ] Confirm the sequence completed: Donor publishes → NGO requests → Donor approves → Volunteer accepts → Volunteer collects → Volunteer delivers → NGO confirms.
- [ ] Confirm the completed request/delivery statuses and remaining donation quantity agree across **Donations**, **Requests**, **Tasks**, and **Admin** where shown.
- [ ] Confirm successful actions show feedback, failed actions show a useful message, loading indicators stop on success/failure, and retry works without restarting the app.

Notes/issues observed (include screen and action; do not include passwords):

____________________________________________________________________________

____________________________________________________________________________

## Final review status — 2026-11-14

- Passed in this review: API tests (5/5), mobile validation/submission tests (7/7), workspace TypeScript checks, shared/API TypeScript build, Prisma schema validation, Prisma migration status (database up to date), local and LAN API health, expanded database-backed workflow smoke including simultaneous approvals, Expo SDK dependency check using the local bundled map, Expo Doctor (20/20), and Android production export (1,211 modules; 2.8 MB Hermes bundle).
- `npm audit` reported six findings: three moderate through Expo's fingerprint/minimatch toolchain and three high through Prisma CLI/config/deepmerge-ts. Workspace audit output still listed these chains with `--omit=dev`, despite Prisma CLI being a development dependency; verify impact against the exact release install mode. Suggested automatic remediations require a major Expo downgrade or Prisma 7 upgrade. Neither was applied because it would risk the SDK 58 app or require a separate Prisma migration review. No critical findings were reported. Re-run `npm audit` before submission because advisories change.
- The workstation has no Android SDK/emulator. The user previously confirmed donor registration and login on a physical phone; this final review did not independently exercise the phone, other roles' screens, or native picker dialogs. Those checks remain manual.
