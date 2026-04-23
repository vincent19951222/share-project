# Notes: MVP Blocker Fixes

## Confirmed Issues
- `npm run build` fails on `app/api/board-notes/route.ts` because Prisma result typing is lost and callback parameter is inferred as `any`.
- Session cookies currently store raw user ids and are trusted by route handlers.
- Season slot contribution is decided before the punch transaction and can over-increment under concurrent users.
- Board snapshots match punch records by `dayIndex` only, so records from a previous month can appear in the current month.

## Verification Targets
- Production build should pass.
- Full test suite should pass.
- Add regression coverage for signed cookies, concurrent season cap, and current-month board filtering.

## Verification Results
- Targeted API/state/auth tests passed: 7 files, 47 tests.
- Full suite passed: 28 files, 112 tests.
- `npm run build` passed.
- `npm run lint` now runs `tsc --noEmit` and passed.
