# Handoff: Supply Shop And Task Record Shared Topbar

## Focus
Continue the Supply Dashboard UI Lab work after unifying the `shop` and `task-record` pages into the same visual family.

The immediate user concern was that the two pages should share one top navigation/status bar and the same viewport/stage behavior. The specific issues addressed were:
- Wide screens had side whitespace because the pages behaved like centered 1536px islands.
- Shared elements were not actually shared, especially the status/resource bar.

## Current State
Project root: `/Users/vincent/Projects/share-project`

Current branch: `codex/ui-lab-supply-dashboard`

The worktree is intentionally dirty with broader UI Lab work. Do not revert unrelated changes. Relevant files for this handoff are:
- `/Users/vincent/Projects/share-project/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar.tsx`
- `/Users/vincent/Projects/share-project/components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- `/Users/vincent/Projects/share-project/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- `/Users/vincent/Projects/share-project/components/gamification/ui-lab/supply-task-record/mock-data.ts`
- `/Users/vincent/Projects/share-project/components/gamification/ui-lab/supply-task-record/types.ts`
- `/Users/vincent/Projects/share-project/app/globals.css`

Implementation status:
- `shop` and `task-record` now both render the shared `SupplyUiLabTopBar`.
- The shared topbar handles active tab state, resource/status pills, and avatar menu consistently.
- `shop` passes `activeLabel="补给商店"` from `SupplyShopScene`.
- `task-record` passes `activeLabel="任务记录"` from `SupplyTaskRecordScene`.
- Task-record mock resources now include backpack capacity: `68/120`.
- Task-record resource type now allows `"backpack"`.
- Shared topbar CSS lives under `.supply-ui-lab-*` in `app/globals.css`.
- Both `shop` and `task-record` content stages use `width: 100vw` and `margin: 0`, removing the 1536px centered-island behavior.

## Decisions And Constraints
- Keep these as static UI Lab prototype pages. Do not wire them into production `SupplyStation`, API routes, Prisma, auth, or real business logic.
- Use a code-rendered shared topbar for consistency instead of page-specific cropped topbar panels.
- Keep page body panels as prototype image layers with transparent hotspots.
- Preserve the pixel/brutalist yellow visual language from the prototype screenshots and the draw-pool work.
- Do not revert unrelated UI Lab changes in the dirty worktree.

## Verification
Commands already run successfully:

```bash
npm test -- __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts __tests__/supply-task-record-mock-data.test.ts
npm test -- __tests__/supply-shop-ui-lab-route.test.ts __tests__/supply-shop-mock-data.test.ts __tests__/supply-shop-assets.test.ts __tests__/supply-shop-scene.test.tsx __tests__/supply-shop-scene-css.test.ts __tests__/supply-task-record-ui-lab-route.test.ts __tests__/supply-task-record-mock-data.test.ts __tests__/supply-task-record-assets.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-task-record-scene-css.test.ts
npm run lint
```

Observed results:
- Focused shop/task-record tests passed: 10 files, 22 tests.
- TypeScript lint passed.
- Dev server ran at `http://127.0.0.1:3003`.
- Chrome visual check opened both `/ui-lab/supply-dashboard/shop` and `/ui-lab/supply-dashboard/task-record`.
- Visual check confirmed both pages use the same topbar, active tab switches correctly, and the stage fills the viewport width instead of sitting centered with side whitespace.

## Suggested Skills
- `handoff` if creating another continuation note.
- `frontend-design` for future visual refinements.
- `verification-before-completion` before claiming additional UI fixes are complete.
- `browser` or `computer-use` for visual QA, because local Playwright CLI wrapper required npm network access and was rejected under sandbox risk policy.

## Next Steps
1. If continuing this exact thread, compare `/shop` and `/task-record` against `design/ui-assets/补给商店.png` and `design/ui-assets/任务记录.png` at the intended browser width.
2. Decide whether the shared topbar should also replace or align with the topbar used by other Supply Dashboard UI Lab pages, especially dashboard/team-goal/draw-pool/backpack.
3. Consider cleaning obsolete page-specific topbar CSS/hotspots once no tests or planned pages rely on them.
4. Re-run the focused shop/task-record test command and `npm run lint` after any additional changes.
