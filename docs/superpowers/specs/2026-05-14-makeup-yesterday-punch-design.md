# Makeup Yesterday Punch Design

## Context

`main` is treated as the current `0.2.0` baseline. The `0.2.1` hotfix feature adds a narrow self-service makeup punch flow for teammates who completed yesterday's workout but forgot to punch in.

Current punch behavior only supports today's punch and today's undo. A successful punch affects multiple ledgers:

- `PunchRecord`
- user `coins`
- user `currentStreak` and `lastPunchDayKey`
- active season `filledSlots`
- `SeasonMemberStat.seasonIncome`, `slotContribution`, and `firstContributionAt`
- activity stream, board snapshot, and calendar refresh

The makeup flow must therefore behave as a small ledger repair, not only as a UI cell toggle.

## Goals

- Allow the signed-in user to make up exactly yesterday's missed fitness punch.
- Make the makeup punch fully effective for rewards, streaks, and active season progress.
- Keep the `0.2.1` scope narrow: no arbitrary-date makeup, no admin backfill panel, and no cross-month support.
- Return a fresh board snapshot so the existing client sync model remains the source of truth.

## Non-Goals

- Users cannot make up dates earlier than yesterday.
- Users cannot make up today's punch through this endpoint.
- Users cannot make up another member's punch.
- Admin-managed makeup punches are out of scope for this release.
- Cross-month makeup is out of scope. On the first day of a month, yesterday is not shown on the current board and cannot be made up in `0.2.1`.
- Ended-season backfill is out of scope. If the relevant season is no longer active, makeup is rejected.

## Product Rules

The feature is self-service: each user can only make up their own yesterday punch.

The backend computes yesterday from server time using the existing Asia/Shanghai day-key helpers. The frontend does not send a date.

Makeup is allowed only when all of these are true:

1. Yesterday is in the same Shanghai calendar month as today.
2. The user's team has a current active season.
3. Yesterday belongs to the active season's `monthKey`.
4. The user does not already have a `PunchRecord` for yesterday.
5. The request is for the signed-in user.

Makeup is fully effective:

- Create a yesterday `PunchRecord` with `punchType: "makeup-yesterday"`.
- Award the reward that yesterday should have earned based on the previous punch chain.
- Update user streak state.
- Add yesterday's reward to the user's `coins`.
- Add yesterday's reward to the active season income.
- Advance active season slot progress exactly like a normal punch when slots remain.

If today is already punched, the system also repairs today's ledger:

- Recompute today's streak as if yesterday had been punched before today.
- Recompute today's reward.
- Update today's `PunchRecord.streakAfterPunch` and `assetAwarded`.
- Add only the reward difference to user `coins`.
- Add only the reward difference to today's season income.
- Update user `currentStreak` and `lastPunchDayKey` to today's repaired state.

If today is not punched, the user state ends at yesterday's repaired state. A later normal punch today will continue the streak naturally.

If the active season is full, makeup still awards user coins and season income, but does not increment `filledSlots` or `slotContribution`, matching the existing normal punch rule.

## API Design

Add:

```text
POST /api/board/punch/makeup-yesterday
```

Request body is ignored or empty. The endpoint uses the authenticated `userId` cookie and server-side Shanghai time.

Successful response:

```json
{
  "snapshot": {}
}
```

The `snapshot` shape is the existing `BoardSnapshot`.

Expected errors:

- `401 unauthenticated`
- `401 user-not-found`
- `409 makeup-not-allowed`
- `409 duplicate-punch`
- `500 server-error`

The endpoint should keep user-facing messages short and safe to display in the existing popup.

## Transaction Flow

The endpoint should run the ledger mutation in one Prisma transaction.

1. Load the current user with team members and the latest active season.
2. Compute `todayDayKey`, `yesterdayDayKey`, and their board day indexes using Asia/Shanghai.
3. Reject if yesterday crosses into a different month from today.
4. Reject if no active season exists or if active season `monthKey` does not match yesterday's month.
5. Load yesterday and today punch records for the user.
6. Reject if yesterday already has a record.
7. Find the most recent punch before yesterday.
8. Compute yesterday's repaired streak and reward.
9. Try to reserve one season slot if the active season still has room.
10. Create yesterday's `PunchRecord`.
11. Upsert/update `SeasonMemberStat` for yesterday's reward and slot contribution.
12. If today has no punch:
    - increment user coins by yesterday reward
    - set `currentStreak` to yesterday's repaired streak
    - set `lastPunchDayKey` to yesterday
13. If today has a punch:
    - recompute today's repaired streak and reward
    - calculate `todayRewardDelta = repairedTodayReward - existingTodayReward`
    - update today's record with repaired streak and reward
    - adjust user coins by `yesterdayReward + todayRewardDelta`
    - adjust season income by `todayRewardDelta`
    - set `currentStreak` and `lastPunchDayKey` to today's repaired values
14. Create an activity event for the makeup punch.
15. Return `buildBoardSnapshotForUser(user.id, now)`.

Concurrent requests should rely on the existing unique key `@@unique([userId, dayKey])`. A duplicate create must become `409 duplicate-punch` without double-awarding.

Under normal product flow, `todayRewardDelta` should be positive when yesterday repairs a broken streak. If existing data is already inconsistent, the implementation should still keep the ledgers balanced by applying the signed delta instead of silently ignoring it.

## UI Design

The entry point lives on the current user's yesterday cell in the punch heatmap.

When yesterday is missed and yesterday is in the current month, render a small `补` affordance in that cell. The backend remains the final authority; the frontend does not need to precompute every eligibility rule.

Clicking the cell opens a confirmation popup using the existing `PunchPopup` style.

Suggested copy:

- Title: `补昨天打卡`
- Description: `确认补签昨天的健身打卡吗？`
- Helper text: `补签会补发银子，并修正连续打卡和赛季进度。`
- Confirm label: `确认补签`
- Busy label: `补签中...`

On success:

- apply the returned board snapshot through the existing punch sync reducer path
- add a success activity log
- refresh activity events
- dispatch calendar refresh

On failure:

- keep the popup open
- show the backend error message
- end the punch sync epoch

No navbar, calendar page, or admin page entry is added in `0.2.1`.

## Testing

Backend tests should cover:

- yesterday missed and today missed: creates yesterday record and updates coins, streak, and active season progress
- yesterday missed and today punched: creates yesterday record, repairs today's streak and reward, and awards only the reward delta for today
- yesterday already punched: rejects without duplicate rewards
- no active season: rejects
- active season month does not match yesterday: rejects
- first day of month: rejects cross-month makeup
- active season full: awards coins and season income but does not increment slots or slot contribution
- concurrent duplicate makeup requests: only one succeeds

Frontend tests should cover:

- current user's missed yesterday cell shows the `补` entry
- other users' missed yesterday cells do not show the entry
- clicking the entry calls the makeup API and applies the returned snapshot
- rejected makeup displays the error in the popup

## Release Notes

For `0.2.1`, describe this as a small repair feature:

Users who worked out yesterday but forgot to punch in can now make up yesterday's fitness punch once. The makeup punch repairs rewards, streaks, and current season progress when the season is still active.
