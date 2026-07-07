# Free Sleep Agent Notes

## What This Repo Is
- Free Sleep is a local controller for 8 Sleep Pods. The server runs on the Pod's embedded Linux system and exposes a local REST API. The app is a React/MUI web UI served by the server.
- The Pod hardware is controlled through a Unix socket called `dac.sock`; this repo calls that integration "Franken" or "Franken sock".
- Persistent user data lives under `/persistent/free-sleep-data/` on the Pod. Local development mirrors parts of that under `server/free-sleep-data/`.

## Top-Level Layout
- `app/`: Vite React frontend using MUI, Zustand, React Query, and Axios.
- `server/`: Express TypeScript backend, LowDB JSON settings/schedules, Prisma SQLite metrics, node-schedule jobs, and Franken socket control.
- `biometrics/`: Python stream processing, sleep detection, vitals calculation, and SQLite writes for biometrics.
- `scripts/`: Pod install/update/reset/service helper scripts.
- `docs/`: user-facing screenshots and hardware teardown/install docs.

## Common Commands
- Install dependencies: `bun install`
- App typecheck: `cd app && bunx tsc -b`
- App lint: `bun --filter app lint`
- App dev server: `cd app && VITE_POD_IP=<pod-ip> bun run dev`
- Server typecheck without writing `dist`: `cd server && bunx tsc --noEmit`
- Server lint: `bun --filter server lint`
- Server hot reload on Pod: `fs-dev-server` per `server/README_SERVER.md`
- Server local dev: `bun --filter server dev:local`

## Git Safety
- Treat the user's fork as the working remote. In local clones, `origin` should be `https://github.com/EpicPi/free-sleep.git`; keep the original project only as `upstream`.
- Before creating branches or worktrees, fetch `origin` and base new Codex branches on `origin/main` unless the user explicitly requests another base.
- Never create Codex work from `upstream/main` or from a detached upstream commit. Use `upstream` only for comparison or intentional upstream sync work.
- Do not push directly to `main`. Push feature branches to `origin` and open a PR to get code into the repo.

## Runtime Notes
- `server/src/config.ts` requires `DATA_FOLDER` and `ENV`; Pod runtime gets these through `server/.env.pod` via `bun run start`.
- `server/src/jobs/jobScheduler.ts` schedules jobs at import time and watches the LowDB folder for changes. Writes to settings or schedules trigger full job cancellation and recreation.
- Schedule data is stored in `schedulesDB.json`; settings are stored in `settingsDB.json`; service health is stored in `servicesDB.json`.
- The app imports schemas directly from `server/src/db/*Schema.ts`; schema changes must remain compatible with both app and server TypeScript settings.

## Scheduling Hotspots
- Client schedule state lives in `app/src/pages/SchedulePage/scheduleStore.tsx`.
- Schedule save payloads are assembled in `app/src/pages/SchedulePage/SchedulePage.tsx`.
- Server schedule writes are handled by `server/src/routes/schedules/schedules.ts`.
- Scheduled jobs are created in:
  - `server/src/jobs/powerScheduler.ts`
  - `server/src/jobs/temperatureScheduler.ts`
  - `server/src/jobs/alarmScheduler.ts`
  - `server/src/jobs/primeScheduler.ts`

## Franken Hotspots
- Socket lifecycle: `server/src/8sleep/frankenServer.ts`
- Socket server wrapper: `server/src/8sleep/unixSocketServer.ts`
- Message parsing: `server/src/8sleep/messageStream.ts`
- Hardware command map: `server/src/8sleep/deviceApi.ts`
- Device status parsing: `server/src/8sleep/loadDeviceStatus.ts`
- Startup initializes Franken from `server/src/server.ts`; health is surfaced through `server/src/serverStatus.ts`.

## Review Cautions
- Check timezone behavior with `moment-timezone`; the app sets a default timezone after settings load, and server jobs set `RecurrenceRule.tz`.
- Prefer adding tests or small reproductions around scheduling time math before changing job timing.
- When reviewing install/update scripts, remember they run as root or through sudo on an embedded Yocto-based system.


# Code smells
- Any complicated functions should have concise, short comments explaining what the function does
- Do not write obscure code with abbreviated variable names <= 2 characters
- Scalability is important, don't write one off hacks. Ensure new files and code are placed in appropriate locations.
