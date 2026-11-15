# RePlate CPAD Demo Guide

## Before the presentation

1. Install Node.js 22.13+ and npm; start PostgreSQL and confirm the configured local database is available.
2. From the project root, run `npm ci`, then `npm run db:generate` and `npm run db:deploy`. `db:deploy` applies committed migrations without resetting the database.
3. Configure the ignored `apps/api/.env` locally: database URL, a strong JWT secret, and the admin bootstrap email/password. Never copy these credentials into slides, screenshots, or chat.
4. Configure `apps/mobile/.env` with `EXPO_PUBLIC_API_URL` pointing to the backend reachable from the phone. For a phone on the same Wi-Fi, use the computer's LAN IPv4 address and port `4000`; `localhost` refers to the phone itself.
5. In separate terminals run `npm run dev:api` and `npm run dev:mobile -- --lan`. Check `http://<computer-LAN-IP>:4000/health`, then scan the Expo Go QR.
6. Verify the NGO test account is approved. Use the existing role test accounts, or register separate Donor, NGO, and Volunteer accounts. Bootstrap Admin once only if no admin account exists.

## Eight-minute live demonstration

1. **Admin:** log in, show the real platform overview, and verify the test NGO if it is still pending.
2. **Donor:** create a clearly labeled test donation with a realistic quantity, unit, pickup address, and future collection deadline.
3. **NGO:** browse Available Listings, point out the `Partially reserved` label if another request already reserved part of a listing, inspect the donation, and request a quantity within the available amount.
4. **Donor:** open Requests, approve the NGO request, and show that the donation's available quantity updates.
5. **Volunteer:** accept the new assignment.
6. **Donor:** show the QR for that accepted assignment. Do not capture or publish an active QR: it is a short-lived bearer token.
7. **Volunteer:** open the accepted task, scan the current donor QR, and show the COLLECTED state. Then mark the task delivered.
8. **NGO:** confirm receipt. Show the completed request and return to role Home screens to discuss the role-scoped impact summary.
9. **Admin:** finish by showing the real monitoring/verification screens and reiterating that API authorization, not hidden UI controls, protects role actions.

Use a labeled demonstration donation and retain it as normal test data. Do not reset or clear the database before the presentation. Do not use fabricated screenshots or describe a metric as live if it is not backed by the API.

## Screenshot capture checklist

Capture directly from the actual app on the Android phone or a real Android emulator. Use a clean test account, hide notification previews, and avoid showing email/password fields, access tokens, personal addresses, or an active collection QR.

- [ ] Welcome/Login branding
- [ ] Donor Home with real dashboard and impact values
- [ ] Donor My Donations listing and status/quantity presentation
- [ ] NGO Browse Available Listings showing `Partially reserved` without title wrapping problems
- [ ] NGO donation details and quantity request
- [ ] Donor Requests after approval (do not include an active QR code in the image)
- [ ] Volunteer accepted task and collected state
- [ ] Volunteer delivered task and NGO completed receipt state
- [ ] Admin overview and NGO verification/monitoring

Suggested filenames: `01-welcome.png`, `02-donor-home.png`, `03-donor-listings.png`, `04-ngo-browse.png`, `05-ngo-request.png`, `06-donor-request.png`, `07-volunteer-collected.png`, `08-ngo-confirmed.png`, `09-admin-overview.png`.

The repository contains no captured device screenshots. This workstation has no connected Android device or emulator (`adb` is unavailable), so capture these on the presentation phone; do not substitute mock UI images.

## Final test commands

```powershell
npm run typecheck
npm run build
npm test
npm run test:mobile
npm exec -w @replate/mobile -- expo install --check
npm exec --yes --package=expo-doctor -- expo-doctor
npm exec -w @replate/mobile -- expo export --platform android --output-dir dist
npm run smoke:workflow -w @replate/api
```

The workflow smoke uses uniquely named `.invalid` test accounts and retains its rows. It does not reset or delete data. See `TESTING.md` for the physical Android checklist and `API_DOCUMENTATION.md` for endpoint behavior.
