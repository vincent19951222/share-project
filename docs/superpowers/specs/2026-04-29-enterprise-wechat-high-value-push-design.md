# Enterprise WeChat High-Value Push Design

> This design defines the first high-value Enterprise WeChat push layer for the product. It keeps Enterprise WeChat focused on low-frequency, high-signal messages instead of real-time activity flow, and extends the existing weekly report webhook path with weak-social reminders and team milestone broadcasts.

## Context

The project already has an Enterprise WeChat webhook path for weekly report publishing, and the roadmap has now converged on a clearer role split:

- in-app activity stream: real-time, fine-grained, easy to ignore
- Team Dynamics: timeline and review surface for important events
- Enterprise WeChat: out-of-app delivery for messages worth bringing back into the team communication space

The current phase should not turn Enterprise WeChat into a full notification bus. The goal is to keep it useful, light, and socially acceptable in a work chat.

## MVP Scope

Enterprise WeChat first-phase pushes include only these categories:

1. Weekly report push
2. Weak-social invitation push
3. Team milestone push

Explicit non-goals for this phase:

- no daily summary push
- no real-time activity flow push
- no per-punch success push
- no undo-punch push
- no coffee flow push
- no docs/changelog push
- no private chat workflow
- no `@user` mentions
- no Enterprise WeChat response loop; response remains in-app

## Product Decisions

### 1. Weekly report

Keep the current weekly report publishing path as-is. Weekly report remains a high-value markdown push triggered by admin publishing.

### 2. Weak-social invitations

Weak-social invitations should push to Enterprise WeChat when the invitation is created.

Supported invitation classes in this phase:

- direct reminder invitations
- team-wide reminder invitations

Enterprise WeChat behavior:

- send text only
- mention names in plain text only
- do not `@` users
- do not send follow-up messages for response, ignore, or expiration

System behavior:

- invitation creation and response state remain in the app
- Enterprise WeChat is only a reminder channel

### 3. Team milestones

Team milestone pushes in this phase are limited to:

- full team completed today punch
- streak milestone reached
- season goal reached

These are broadcast-style messages and should be treated as notable results, not general activity.

## Trigger Model

The first implementation should use direct event-triggered sends, but route all send logic through one unified Enterprise WeChat notification service.

Recommended shape:

```text
business event -> notification trigger helper -> Enterprise WeChat send service -> webhook + send log
```

This keeps the first version simple while preserving a clean path toward a future centralized notification layer.

## Trigger Points

### Weekly report

Trigger when an admin publishes the weekly report.

### Weak-social invitation

Trigger when a weak-social invitation is successfully created.

Send once only at creation time for:

- direct reminder invitations
- team-wide invitations

Do not trigger on:

- response recorded
- invitation ignored
- invitation expired
- invitation cancelled

### Full team completed today punch

Trigger when a team first transitions from “not all punched today” to “all punched today”.

### Streak milestone

Trigger when a user reaches a configured streak milestone.

Current agreed milestone set:

- 7
- 14
- 30
- 60
- 100

No push for ordinary non-milestone streak growth.

### Season goal reached

Trigger when active season progress first reaches the configured target.

## Dedupe and Rate Limits

Enterprise WeChat must stay low-frequency. Dedupe rules are part of the product behavior, not just implementation detail.

### Weak-social invitations

Direct reminder invitations:

- may push each time an invitation is created

Team-wide invitations:

- same team
- same Shanghai natural day
- same invitation type
- push at most once

If more team-wide invitations of the same type happen on the same day, keep the in-app records but skip duplicate Enterprise WeChat pushes.

### Full team completed today punch

- at most once per team per day
- only on first transition into the “all complete” state
- do not send a “fell out of all complete” message
- do not send again if the team later re-enters the all-complete state on the same day

### Streak milestone

- at most once per user per milestone value
- dedupe across retries, recomputation, or repeated settlement paths

### Season goal reached

- at most once per season
- only on first reach
- no second push after rollback, correction, or re-fill

## Failure Handling

Enterprise WeChat push failure must not block the primary business action.

Examples:

- weak-social invitation creation succeeds even if webhook sending fails
- milestone settlement succeeds even if webhook sending fails
- weekly report publishing succeeds even if webhook sending fails

Failure behavior:

- business flow returns success if the business action succeeded
- Enterprise WeChat send attempt is logged
- send result is available for later inspection

## Message Style

All new first-phase Enterprise WeChat messages should use short text messages that can be read in one screen.

Principles:

- say what happened first
- keep it to one sentence
- do not explain rules in Enterprise WeChat
- use Enterprise WeChat to report, not to teach

### Weak-social examples

Direct reminder:

- `牛马补给站提醒：阿强点名让阿明起来接杯水。`
- `牛马补给站提醒：阿强催阿明出门溜达两分钟。`

Team-wide reminder:

- `牛马补给站提醒：阿强发起了全员起立，大家该动一动了。`
- `牛马补给站提醒：今天有人发起全队摸鱼广播，起来透口气。`

### Team milestone examples

Full team punched:

- `团队里程碑：今天全员已完成打卡。`

Streak milestone:

- `团队里程碑：阿明已连续打卡 30 天。`

Season goal reached:

- `团队里程碑：本赛季目标已达成，冲刺条已满。`

### Weekly report

Keep the current markdown weekly report path unchanged in this phase.

## Service Boundaries

The system should separate trigger logic from message sending logic.

### Send layer

Responsible for:

- building Enterprise WeChat message payload
- calling the webhook
- storing send result logs
- returning structured result

### Trigger layer

Responsible for:

- deciding whether the current business event should push
- applying dedupe/rate-limit rules
- choosing the right message template
- calling the send layer

This avoids scattering webhook decisions across multiple unrelated business files.

## Persistence and Logging

Existing send log direction should be reused and extended rather than replaced.

In addition to send logs, dedupe requires stable identity for high-value pushes.

Recommended dedupe identity examples:

- full team punched: `teamId + dayKey + FULL_TEAM_PUNCHED`
- streak milestone: `teamId + userId + STREAK_MILESTONE + milestoneValue`
- season goal reached: `teamId + seasonId + SEASON_GOAL_REACHED`
- team-wide weak social: `teamId + dayKey + invitationType + TEAM_WIDE_WEAK_SOCIAL`

The exact storage shape can be either:

1. dedicated push event records, or
2. reuse existing business records plus send-log lookups, if the lookup stays simple and reliable

The preferred implementation choice should optimize for clarity and testability over minimizing tables at all costs.

## Expected Module Touchpoints

Likely touched areas for implementation:

- Enterprise WeChat send service module
- weak-social invitation creation flow
- punch settlement / punch API flow
- season progress settlement path
- shared notification trigger helpers
- send log persistence

Likely no-touch areas for this phase:

- docs center
- coffee activity flow
- general activity stream message fan-out

## Testing Requirements

Minimum coverage for implementation should include:

1. weak-social direct invitation sends text push
2. weak-social team-wide invitation sends only once per type per day
3. weak-social response/ignore/expiry do not trigger push
4. full team punched sends once on first completion
5. full team punched does not resend after undo and re-complete on same day
6. streak milestone sends only for configured thresholds
7. streak milestone dedupes repeated settlement
8. season goal reached sends once per season
9. webhook failure does not fail primary business action
10. message text matches the expected short-text style

## Rollout Notes

This phase intentionally chooses a conservative Enterprise WeChat role:

- low-frequency
- high-value
- no noisy activity mirroring

That keeps the channel compatible with a work chat environment and leaves room for future additions such as daily summary or broader notification management, without poisoning the channel early.

## Approved MVP Summary

The agreed first-phase Enterprise WeChat push scope is:

- keep weekly report push
- add weak-social invitation text push
- add team milestone push for full-team punch, streak milestone, and season goal reached
- do not implement daily summary or flow-style pushes in this phase

This is the smallest version that still feels useful, coherent, and aligned with the roadmap.
