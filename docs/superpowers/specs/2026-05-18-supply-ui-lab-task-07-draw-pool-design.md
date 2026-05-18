# Supply UI Lab Task 07 Draw Pool Design

> Phase 2 task-level spec for the Draw Pool page. This task corresponds to Task 7 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Make the draw pool explain and simulate the current lottery rules with shared catalog prizes, local ticket balance, and local draw result feedback.

## User-Visible Changes

- Ticket naming is consistently `抽奖券`.
- Long-term pity progress is removed.
- The right-side guarantee panel becomes `十连保底说明`.
- The page explains that single draw has no guarantee.
- The page explains ten-draw batch guarantee: one utility, social, or rare reward if the natural ten draw misses all eligible tiers.
- Single draw and ten draw buttons update local ticket balance and show static results.
- Prize preview and recent drops use shared catalog items and coin reward rows.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-draw-pool/types.ts`
- `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- `__tests__/supply-draw-pool-mock-data.test.ts`
- `__tests__/supply-draw-pool-scene.test.tsx`

Draw Pool uses:

- shared resources;
- shared catalog;
- coin reward rows;
- local result state.

## Non-Goals

- Do not call the real lottery API.
- Do not persist ticket balance.
- Do not implement long-term cumulative pity.
- Do not build animation or reveal sequences.

## Acceptance Criteria

- Pool rates are `coin 45 / utility 27 / social 24 / rare 4`.
- No `保底进度` or `48/70` long-term pity remains.
- Single draw click shows result and decrements local balance by 1.
- Ten draw click shows ten-draw result and decrements local balance by 10.
- Buttons disable or show explanation when ticket balance is insufficient.
- No `补给券` remains.

## Plan Link

Implementation details live in Task 7 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
