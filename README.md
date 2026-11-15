# RePlate

RePlate is a cross-platform food surplus donation and redistribution app for donors, NGOs, volunteers, and administrators. This repository is a TypeScript monorepo with an Expo Router mobile client, an Express REST API, and PostgreSQL accessed through Prisma.

## Current milestone

The academic MVP implementation is in place. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for delivered milestones and [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) for current constraints and verification status. The API enforces role permissions and transactional quantity allocation; the mobile app contains role-aware authentication and workflow screens connected to the API.

## Requirements

- Node.js 22.13+ and npm (required by Expo SDK 58)
- PostgreSQL 15+ (local or hosted)
- Expo Go or Android Studio emulator for mobile development

## Setup

1. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, a random `JWT_SECRET` (at least 32 characters), and backend-only admin bootstrap credentials.
2. From the repository root run `npm ci`.
3. Run `npm run db:generate`, then `npm run db:migrate`.
4. Create the administrator once with `npm run admin:bootstrap -w @replate/api`.
5. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to the API URL reachable by the device. For a physical device, use the computer's LAN IP rather than `localhost`.
6. Start the API with `npm run dev:api` and the Expo client with `npm run dev:mobile`.

The example `CORS_ORIGIN="*"` is for local development. Set it to exact trusted web origins before deploying the API publicly. Authentication routes currently have no request rate limiting; add deployment-level protection before exposing a public production service.

The mobile workspace uses Expo SDK 58, React Native 0.88, and React 19.3. It uses Expo-compatible native Android date and time dialogs for donation preparation and collection scheduling, a shared top-of-screen toast for action/API feedback, and Lucide icons for role-aware bottom navigation. After installing dependencies, validate SDK package versions with `npm exec -w @replate/mobile -- expo install --check`.

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) and [TESTING.md](TESTING.md) for endpoints and verification steps. Public registration cannot set admin roles. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the API environment and run `npm run admin:bootstrap -w @replate/api` once to create the administrator.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev:api` | Start API in watch mode |
| `npm run dev:mobile` | Start Expo |
| `npm run typecheck` | Type-check workspace packages |
| `npm run test` | Run API unit tests |
| `npm run test:mobile` | Run mobile form validation and duplicate-submission tests |
| `npm run smoke:workflow -w @replate/api` | Exercise auth and the full workflow against the configured live API/database; creates retained synthetic records |
| `npm run build` | Build the shared package and API TypeScript output |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Apply local Prisma migrations |
| `npm run db:deploy -w @replate/api` | Apply committed migrations without resetting the database |

## License

For an Android JavaScript bundle check, run `npm exec -w @replate/mobile -- expo export --platform android --output-dir dist`. This creates a bundle export; it is not a signed Play Store APK/AAB. See [TESTING.md](TESTING.md) for current verification limits.

Academic project. Add a license before public redistribution.
