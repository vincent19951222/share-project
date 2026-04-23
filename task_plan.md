# Task Plan: MVP Blocker Fixes

## Goal
Make the local MVP deployable for teammates by fixing build, session integrity, season economy concurrency, and month-scoped board data.

## Phases
- [x] Phase 1: Fix production build type failure for board notes.
- [x] Phase 2: Add signed session cookies and migrate auth/session reads.
- [x] Phase 3: Make season slot contribution atomic under concurrent punches.
- [x] Phase 4: Scope board snapshots to the current Shanghai month.
- [x] Phase 5: Add/update tests and run verification.

## Decisions Made
- Preserve the existing cookie name `userId` but store a signed value so current route structure stays simple.
- Keep existing database schema unless verification proves a schema change is needed.
- Treat board data as month-scoped by `dayKey` prefix derived from Asia/Shanghai time.

## Errors Encountered
- Initial `npm run lint` invoked deprecated `next lint` and entered interactive setup. Resolved by switching the script to `tsc --noEmit` with Prisma generation as `prelint`.

## Status
Completed - targeted tests, full tests, production build, and non-interactive lint/typecheck all pass.
