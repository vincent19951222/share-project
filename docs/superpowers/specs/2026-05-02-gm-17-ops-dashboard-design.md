# GM-17 Ops Dashboard Design

## Goal

GM-17 adds a read-only operations dashboard for admins so they can see whether the gamification economy is healthy before changing rules or publishing new iterations.

## Scope

GM-17 includes:

- A read-only admin snapshot for a recent activity window.
- Economy health checks for tickets and coins.
- Pending redemption visibility.
- Weak social frequency and response visibility.
- Lottery and real-world reward production visibility.
- Enterprise WeChat failure visibility.
- A `/admin` panel that presents the snapshot to admins.

GM-17 does not include:

- Editing task cards, reward pools, item definitions, or game rules.
- Repairing user assets.
- Writing new Team Dynamics.
- Sending Enterprise WeChat messages.
- Adding database tables.

## Product Shape

The feature appears on `/admin` above the existing season manager as `运营观察`. It has three layers:

1. Metric cards for the current window: net tickets, lottery draws, pending redemptions, social response rate, real-world rewards, and WeChat failures.
2. Risk cards: asset mismatch, ticket hoarding, overdue redemptions, repeated direct social invitations, real-world reward cost pressure, and WeChat failures.
3. Operational queues and leaderboards: pending redemptions, ticket balances, direct social pairs, and recent real-world reward output.

All content is scoped to the current admin's team.

## Data Flow

`buildGamificationOpsDashboard()` reads existing tables:

- `User`
- `PunchRecord`
- `LotteryTicketLedger`
- `LotteryDraw`
- `LotteryDrawResult`
- `RealWorldRedemption`
- `SocialInvitation`
- `SocialInvitationResponse`
- `EnterpriseWechatSendLog`

`GET /api/admin/gamification/ops-dashboard` returns the same snapshot for client refresh. The admin page also builds the first snapshot server-side.

## Rules

- Window defaults to 7 days.
- Ticket balance mismatch compares `User.ticketBalance` with the sum of `LotteryTicketLedger.delta`.
- Coin mismatch compares `User.coins` with `PunchRecord.assetAwarded + lottery coin rewards - LotteryDraw.coinSpent`.
- Ticket hoarding is flagged at 30 or more tickets.
- Redemption queue is flagged when any `REQUESTED` record is 2 or more days old.
- Repeated direct social invitation is flagged at 3 or more direct invitations from the same sender to the same recipient within the window.
- WeChat risk is flagged when failed send logs exist in the window.

## Testing

- Service tests cover a healthy empty-ish seed state and a seeded risk state.
- API tests cover 401, 403, and admin success.
- Component tests cover rendering metrics, risks, queues, and refresh behavior.
