# Supply UI Lab Task 04 Dashboard Design

> Phase 2 task-level spec for the `我的状态` Dashboard page. This task corresponds to Task 4 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Make the Dashboard page match Phase 2 business vocabulary and become the clean entry point for the UI Lab page family.

## User-Visible Changes

- Top bar shows `银子 / 抽奖券 / 背包`.
- `体力` is removed from the top bar and today effects.
- `补给券` and `生命票` are replaced with `抽奖券`.
- Help center, feedback, and settings links are removed.
- Character status explains `牛马等级`.
- Today's effects show item source, effect summary, status, and end time.
- Quest reroll and reward claim controls provide local mock feedback.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-dashboard/types.ts`
- `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- `__tests__/supply-dashboard-mock-data.test.ts`
- `__tests__/supply-dashboard-scene.test.tsx`

Dashboard uses:

- `supplyUiLabResources.dashboard`
- `supplyUiLabActiveEffects`

The level formula is mock-only:

```text
level = floor(totalExp / 1000) + 1
currentLevelExp = totalExp % 1000
nextLevelExp = 1000
```

## Non-Goals

- Do not persist level or EXP.
- Do not connect quest buttons to real task APIs.
- Do not reintroduce help, feedback, or settings.
- Do not add a production navigation entry.

## Acceptance Criteria

- Dashboard tests confirm top resources are `银子 / 抽奖券 / 背包`.
- Rendered Dashboard contains `牛马等级`.
- Rendered Dashboard contains no banned old terms.
- Inventory preview uses capacity `60`.
- Dashboard and Backpack share the same active effects fixture.

## Plan Link

Implementation details live in Task 4 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
