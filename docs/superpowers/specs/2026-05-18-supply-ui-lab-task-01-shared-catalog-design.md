# Supply UI Lab Task 01 Shared Catalog Design

> Phase 2 task-level spec for the shared mock catalog, shared resource fixtures, and shared today effects. This task corresponds to Task 1 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Create a UI Lab-only shared data layer so Dashboard, Shop, Backpack, Draw Pool, and Task Record stop defining conflicting mock resources, items, rewards, and today effects.

## User-Visible Changes

- Top bars across UI Lab pages can consistently show `银子 / 抽奖券 / 背包`.
- Shop, Backpack, Draw Pool, and Task Record can reference the same item names and descriptions.
- Dashboard and Backpack can show the same `今日效果` list.
- Users no longer see different pages invent different names for the same item.

## Data And Component Changes

Create:

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/catalog.ts`
- `components/gamification/ui-lab/supply-data/effects.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `__tests__/supply-ui-lab-catalog.test.ts`

The catalog contains every active non-coin draw reward:

- `task_reroll_coupon`
- `small_boost_coupon`
- `fitness_leave_coupon`
- `drink_water_ping`
- `walk_ping`
- `team_standup_ping`
- `chat_ping`
- `share_info_ping`
- `team_broadcast_coupon`
- `double_niuma_coupon`
- `season_sprint_coupon`
- `luckin_coffee_coupon`

Coin rewards remain draw rewards only; they do not become shop products or backpack slots.

## Non-Goals

- Do not import Prisma, API Routes, or session state.
- Do not replace production gamification config.
- Do not make the catalog configurable in an admin UI.
- Do not update page UI in this task beyond adding shared fixtures.

## Acceptance Criteria

- Shared catalog test verifies all active non-coin draw rewards are visible, buyable, and inventory-backed.
- Shared resources contain `银子 / 抽奖券 / 背包`, with no `补给券` or `体力`.
- Shared active effects contain only business-explainable today effects.
- All new data lives under `components/gamification/ui-lab/supply-data/`.

## Plan Link

Implementation details live in Task 1 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
