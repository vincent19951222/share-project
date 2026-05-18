# Supply UI Lab Task 10 Verification Design

> Phase 2 task-level spec for final verification and browser QA. This task corresponds to Task 10 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Verify that Phase 2 static mock business closure works across all six UI Lab pages, tests, TypeScript, build, and browser QA.

## User-Visible Changes

This task should not introduce new product behavior. It confirms that the previous nine tasks work together.

Users should be able to:

- open all six UI Lab pages;
- navigate between pages;
- click local filters, tabs, buttons, and mock actions;
- see consistent vocabulary and item data;
- use the pages on desktop and mobile widths without obvious overlap or overflow.

## Verification Scope

Run focused tests for:

- routes;
- mock data;
- assets;
- scene rendering;
- CSS contracts;
- shared primitives;
- shared catalog;
- global Phase 2 guardrails.

Run:

- `npm run lint`
- `npm run build`
- local dev server browser QA

Browser QA routes:

- `/ui-lab/supply-dashboard`
- `/ui-lab/supply-dashboard/team-goal`
- `/ui-lab/supply-dashboard/shop`
- `/ui-lab/supply-dashboard/task-record`
- `/ui-lab/supply-dashboard/draw-pool`
- `/ui-lab/supply-dashboard/backpack`

## Non-Goals

- Do not add new Phase 2 features during verification.
- Do not change production `SupplyStation`.
- Do not accept test snapshots or brittle visual checks as substitutes for browser QA.
- Do not fold unrelated dirty worktree changes into verification commits.

## Acceptance Criteria

- All focused Supply UI Lab tests pass.
- `npm run lint` passes.
- `npm run build` passes.
- Browser QA at `1536 x 1024` and around `390 x 844` passes.
- No rendered banned terms remain: `补给券`, `生命票`, `体力`, `扩容`, `帮助中心`, `意见反馈`, `设置`.
- No dead main-flow `href="#"` links remain.
- Console has no errors on the six routes.
- Any verification fixes are committed separately with exact file staging.

## Plan Link

Implementation details live in Task 10 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
