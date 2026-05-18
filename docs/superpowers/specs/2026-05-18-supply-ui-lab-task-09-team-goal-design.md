# Supply UI Lab Task 09 Team Goal Design

> Phase 2 task-level spec for the Team Goal page. This task corresponds to Task 9 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Make Team Goal explain season rewards, milestone rewards, and today's team task metrics using Phase 2 vocabulary and local mock state.

## User-Visible Changes

- Season completion reward is visible.
- Milestone reward list is visible.
- Today team tasks explain what each metric counts.
- `补给券` becomes `抽奖券`.
- Help center, feedback, and settings links are removed.
- Reward claim button shows local feedback.

## Reward Rules

Season completion reward:

- Each member mock receives `银子 x100`.
- Each member mock receives `抽奖券 x3`.
- Team receives `团队称号 30天`.
- Weekly report receives `赛季达成高光`.

Milestone rewards:

- 20%: team announcement highlight.
- 40%: each member receives `抽奖券 x1`.
- 65%: team title preview.
- 85%: each member receives `银子 x50`.
- 100%: season completion reward.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-team-goal/types.ts`
- `components/gamification/ui-lab/supply-team-goal/mock-data.ts`
- `components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene.tsx`
- `__tests__/supply-team-goal-mock-data.test.ts`
- `__tests__/supply-team-goal-scene.test.tsx`

Add task metric source labels:

- `今日有效健身打卡人数`
- `今日四维任务完成份数`
- `今日弱社交已回应次数`
- `今日全队抽卡次数`

## Non-Goals

- Do not grant real season rewards.
- Do not connect to real season service.
- Do not write team dynamics.
- Do not add settings or helper links.

## Acceptance Criteria

- Team Goal mock data includes completion rewards and milestone rewards.
- Rendered page shows `赛季达成奖励`, `银子 x100`, and `抽奖券 x3`.
- Rendered page explains today's team task metric sources.
- No `补给券`, `帮助中心`, `意见反馈`, or `设置` remains.

## Plan Link

Implementation details live in Task 9 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
