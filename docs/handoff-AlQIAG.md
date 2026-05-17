# Handoff: Supply Dashboard UI Lab Static Scenes

## Focus

Continue the `codex/ui-lab-supply-dashboard` branch. The immediate user-visible focus is previewing and refining the 牛马补给站 UI lab pages, especially the static task-record page at:

```text
http://localhost:3001/ui-lab/supply-dashboard/task-record
```

The in-app browser was currently on:

```text
http://localhost:3001/ui-lab/supply-dashboard
```

## Current State

- Project root: `/Users/vincent/Projects/share-project`
- Current branch: `codex/ui-lab-supply-dashboard`
- A dev server is running on `127.0.0.1:3001` under PID `89288`.
- Current route for the implemented task-record scene:
  - `app/ui-lab/supply-dashboard/task-record/page.tsx`
  - `components/gamification/ui-lab/supply-task-record/`
- The task-record tab was wired in:
  - `components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx`
- Task-record tests were added:
  - `__tests__/supply-task-record-ui-lab-route.test.ts`
  - `__tests__/supply-task-record-mock-data.test.ts`
  - `__tests__/supply-task-record-assets.test.ts`
  - `__tests__/supply-task-record-scene.test.tsx`
  - `__tests__/supply-task-record-scene-css.test.ts`
- Task-record spec and plan:
  - `docs/superpowers/specs/2026-05-13-supply-dashboard-task-record-static-scene-design.md`
  - `docs/superpowers/plans/2026-05-13-supply-dashboard-task-record-static-scene-implementation.md`

The worktree also contains other uncommitted UI-lab work that predates or is adjacent to this task, including Dashboard, Shop, Team Goal, Backpack, and Draw Pool files/assets/tests. Do not assume all dirty files were created in the task-record session.

## Decisions And Constraints

- Keep all static scene work isolated under `/ui-lab/supply-dashboard/*`.
- Do not replace or modify the production `components/gamification/SupplyStation.tsx` flow for these static pages.
- Do not modify production nav, `AppTab`, Prisma schema, API routes, auth, or real business actions.
- Static pages use centralized mock data, reused assets, and CSS under page-specific `supply-*` class prefixes.
- The task-record page intentionally reuses Dashboard scene assets and existing reward/avatar assets instead of generating required new bitmaps.
- The target prototype for task-record is `design/ui-assets/任务记录.png`.

## Verification

For the task-record implementation, these commands passed:

```bash
npm test -- __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
npm run lint
npm run build
npm test
```

Results observed:

- Focused task-record tests: 5 files, 12 tests passed.
- Full test suite: 127 files, 565 tests passed.
- TypeScript lint: passed.
- Production build: passed.
- Production visual QA was performed for task-record at desktop `1536x1024` and mobile `390x844`; the page rendered cleanly and production browser console had 0 errors.

One caveat: during repeated Playwright resize/reload against `next dev`, Next dev/HMR intermittently produced `Unexpected end of JSON input` for the task-record RSC request. It did not reproduce in `next build` or production `next start` visual QA, so treat it as a dev/HMR instability unless it reappears under normal browsing.

## Suggested Skills

- `browser-use:browser` or `playwright` for visual QA and screenshots.
- `frontend-design` for UI refinements.
- `systematic-debugging` if the Next dev/HMR JSON error becomes reproducible.
- `verification-before-completion` before claiming any further scene or route work is complete.

## Next Steps

1. Open `http://localhost:3001/ui-lab/supply-dashboard/task-record` and review the task-record page visually with the user.
2. If the user requests pixel refinements, adjust only task-record scene files and `supply-task-record-*` CSS where possible.
3. Be careful with the dirty worktree: isolate task-record changes from existing Dashboard/Shop/Team Goal/Backpack/Draw Pool changes before staging or committing.
4. If preparing a commit, decide whether to commit only task-record docs/code/tests or include the broader UI-lab page family.
5. Re-run focused tests, `npm run lint`, and preferably `npm test` before final handoff or commit.
