# Supply UI Lab Task 05 Backpack Design

> Phase 2 task-level spec for the Backpack page. This task corresponds to Task 5 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Turn Backpack into a static but business-consistent inventory surface backed by the shared catalog, with fixed 60-slot capacity and local item interactions.

## User-Visible Changes

- Top bar shows `银子 / 抽奖券 / 背包 18/60`.
- Backpack capacity is fixed at 60.
- Expansion controls are removed.
- Locked slots are removed and replaced with empty slots.
- Help center link is removed from the bottom hint bar.
- Item selection changes the detail panel locally.
- Pagination changes between static pages locally.
- `今日使用` and `申请兑换` buttons show local feedback.
- Today effects match the Dashboard page.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-backpack/types.ts`
- `components/gamification/ui-lab/supply-backpack/mock-data.ts`
- `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- `__tests__/supply-backpack-mock-data.test.ts`
- `__tests__/supply-backpack-scene.test.tsx`
- `__tests__/supply-backpack-assets.test.ts`

Backpack uses:

- shared catalog quantities and item detail fields;
- shared active effects;
- shared resources.

## Non-Goals

- Do not implement real inventory mutation.
- Do not implement capacity expansion.
- Do not lock slots by level.
- Do not connect redemption to real admin workflows.

## Acceptance Criteria

- Backpack renders 20 visible slots per page.
- Empty slots render as empty inventory cells, not locks.
- Capacity displays as `/60`.
- No `扩容`, `帮助中心`, `体力`, `补给券`, or `生命票` appears.
- Use/redeem/shop actions either update local mock state or route to UI Lab shop.

## Plan Link

Implementation details live in Task 5 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
