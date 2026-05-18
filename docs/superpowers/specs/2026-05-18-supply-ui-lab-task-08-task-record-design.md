# Supply UI Lab Task 08 Task Record Design

> Phase 2 task-level spec for the Task Record page. This task corresponds to Task 8 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Turn Task Record from a static overview into a single-route local state machine with full views for records, draw history, redemptions, teammate radar, and rules.

## User-Visible Changes

- Left sidebar modes switch the main content.
- `今日记录` shows the timeline plus side previews.
- `抽卡记录` shows draw history, reward details, ticket spent, and batch guarantee status.
- `兑换记录` shows full redemption history.
- `队友雷达` shows full invitation status lists.
- `规则说明` shows static rules for records, draw history, radar, and redemption states.
- Date tabs show the last 7 days and switch local records.
- Empty dates show an empty state instead of fake records.
- `生命票` and `补给券` are replaced by `抽奖券` or concrete item names.

## Data And Component Changes

Create:

- `components/gamification/ui-lab/supply-data/records.ts`

Modify:

- `components/gamification/ui-lab/supply-task-record/types.ts`
- `components/gamification/ui-lab/supply-task-record/mock-data.ts`
- `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- `__tests__/supply-task-record-mock-data.test.ts`
- `__tests__/supply-task-record-scene.test.tsx`

The scene becomes a client component with local mode and date state.

## Non-Goals

- Do not add multiple task-record routes.
- Do not query real records.
- Do not respond to real social invitations.
- Do not mutate redemption state outside local mock UI.

## Acceptance Criteria

- Sidebar mode clicks change the main panel title and content.
- Date selection changes visible records.
- Draw history includes single draw, ten draw, ticket spent, rewards, and guarantee status.
- Radar and redemptions can be shown as full main views.
- No `生命票`, `补给券`, or dead main-flow anchors remain.

## Plan Link

Implementation details live in Task 8 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
