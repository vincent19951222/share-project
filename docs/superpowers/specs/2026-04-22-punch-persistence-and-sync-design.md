# Punch Persistence And Sync Design

## Goal

Make the core punch-board experience stateful and shared for a single-server deployment.

After this change:

- a user's punch action is written to the database
- refreshes and re-login keep the same punch state
- multiple users looking at the board converge on the same state within 5 seconds

This design is intentionally narrow. It solves reliable persistence and lightweight multi-user sync for the existing board. It does not introduce a new realtime stack or multi-server architecture.

## Problem Statement

The current board has a split-brain state model:

- initial board data is read from Prisma and `PunchRecord`
- live punch interactions are handled only in client state through `dispatch({ type: "PUNCH" })`

That means the UI can look updated locally without creating any durable shared state. As a result:

- refresh can discard the latest interaction
- another user on the same team does not reliably see the change
- the system cannot claim shared collaboration, only local simulation

For the current deployment phase, the app will run on one server and be used by multiple people. That makes database-backed punch writes and lightweight polling the right first step.

## Product Scope

Included:

- persist punch actions into the existing SQLite database
- expose a server API for punch submission
- expose a server API for reading current board state
- refresh current user state immediately after a successful punch
- poll for board changes every 5 seconds while the board experience is active
- keep the existing App Router structure and current visual layout

Not included:

- WebSocket or SSE push updates
- multi-server deployment
- `coins -> gp` renaming
- offline mode
- background sync while the user is off the board
- presence indicators such as "who is online"
- historical replay or audit UI for punch activity

## Deployment Assumption

This design assumes:

- one Next.js application instance
- one SQLite database file on the same host as the application process
- all users access that same running server

Under that assumption, SQLite is acceptable for this phase because the application server serializes writes through one process and punch actions are low-frequency. This design does not support multiple application servers writing to different local SQLite files.

## Success Criteria

The feature is successful when all of the following are true:

- a successful punch creates or updates a durable `PunchRecord`
- refreshing the page shows the same punch state
- another user on the same team sees the punch update within 5 seconds
- duplicate same-day punch attempts are rejected safely
- existing login and board access rules continue to apply
- the board continues to work on the current single-server SQLite deployment

## User Experience

### Punch Flow

When the current user clicks today's punch cell:

1. the client sends a punch request to the server
2. the server validates identity and punch eligibility
3. the server writes the record and updates team/user totals
4. the current user's UI updates immediately from the server response
5. other open clients converge through the next poll cycle

The initiating user should not have to wait for polling to see their own result.

### Sync Experience

The board is not "realtime" in the strict sense. It is "near-realtime":

- the current user sees their own successful action immediately
- teammates see the update within one polling interval
- acceptable sync latency target is 5 seconds

The UI does not need a "live" badge in this version. Accuracy matters more than spectacle.

## Architecture

The system should move from client-owned punch state to server-owned punch state.

### Source Of Truth

Database-backed board state becomes the only source of truth for punches and team totals.

Client reducer state remains useful for UI concerns, but not as the authoritative record of whether a punch happened. The reducer should no longer invent punch success locally before the server accepts it.

### Server Responsibilities

Add two server capabilities:

1. `POST /api/board/punch`
   - accepts a punch request for the authenticated user
   - validates team/user/day constraints
   - writes `PunchRecord`
   - returns the updated board snapshot or enough data to refresh it safely

2. `GET /api/board/state`
   - returns the current board snapshot for the authenticated user's team
   - used by polling and post-punch refresh

The server computes board state from Prisma models and returns a normalized DTO for the client.

### Client Responsibilities

The client:

- submits punch requests
- renders loading and success/error states
- replaces local board data from server responses
- polls every 5 seconds while mounted on the board experience

The client should not compute "virtual success" ahead of the server.

## Data Model

The existing schema already contains the key relation:

- `User`
- `Team`
- `PunchRecord`

No new table is required for this first version.

### PunchRecord Usage

`PunchRecord` already has:

- `userId`
- `dayIndex`
- `punched`
- `punchType`
- `createdAt`
- unique constraint on `[userId, dayIndex]`

That unique constraint is exactly what the first version needs to prevent duplicate same-day punches.

### Coins

This version keeps the current `coins` model as-is.

When a punch succeeds, the server should update the user's `coins` and any board-derived team total consistently. Renaming to `gp` is a separate future project and must not be folded into this spec.

## Board State Contract

The app currently assembles `BoardState` in the board layout. That shape should remain conceptually similar, but it should be produced through a reusable board-state builder rather than ad hoc layout-only logic.

The server-side board snapshot should contain at least:

- `members`
- `gridData`
- `teamCoins`
- `targetCoins`
- `today`
- `totalDays`
- `activeTab` may remain client-owned
- `currentUserId`

### Time Window

For this phase, keep the current month-window behavior already used by the board:

- fixed `totalDays`
- current day index derived consistently in one place
- board read APIs and page preload must use the same day calculation

If the current implementation still uses a temporary fixed day number, the design allows keeping that for this project only if both preload and polling use the same source. However, using a real server-side day calculation is preferred if it can be done without expanding scope.

## API Design

### POST `/api/board/punch`

Request:

- authenticated via existing `userId` cookie
- no client-supplied `memberId`; the server derives the acting user from auth
- optional `punchType` only if the existing UI still needs it

Server validation:

- user must be logged in
- user must exist
- current team membership must be valid
- user may only punch for the current effective day
- duplicate punch for the same user/day must be rejected or treated idempotently

Server side-effects:

- create or upsert `PunchRecord`
- increment `coins` once for a first successful punch

Response:

- return the latest normalized board snapshot, or
- return a success payload and require the client to fetch `/api/board/state` immediately

Preferred choice:

- return the normalized board snapshot directly from the punch API

Reason:

- fewer round trips for the initiating client
- less chance of a visible stale gap after successful punch

### GET `/api/board/state`

Purpose:

- current board snapshot for the authenticated user's team

Requirements:

- same auth guard as the punch API
- same board-state derivation rules as page preload
- no client ability to read another team's state

This endpoint is the single polling target.

## Sync Strategy

### Chosen Strategy: 5-Second Polling

Use client polling every 5 seconds while the board experience is mounted.

Why this strategy is the right first version:

- it is simple to implement and test
- it works well with single-server SQLite
- it avoids the operational and state complexity of WebSocket/SSE
- it meets the accepted user requirement of 5-10 second convergence

### Polling Rules

- polling runs only while the board app is mounted for an authenticated user
- polling reads from `GET /api/board/state`
- successful poll replaces local board snapshot
- failed polls should not crash the page
- transient failure can be ignored quietly or surfaced lightly, but the UI must stay usable

### Immediate Refresh After Punch

The current user should not wait for the next poll.

After a successful `POST /api/board/punch`, the client should:

- update local board state from the response immediately, or
- immediately fetch `/api/board/state` and replace state

Preferred choice:

- use the punch response as the immediate refresh source

Polling remains responsible for keeping other clients in sync.

## State Management Changes

The reducer must stop being the primary owner of punch truth.

Recommended behavior:

- remove or de-emphasize local-only `PUNCH` mutation for real user actions
- keep reducer actions for view state such as active tab
- if a reducer action is still used for punch updates, it must consume server-returned data rather than inventing a local mutation

The `SIMULATE_REMOTE_PUNCH` behavior is not compatible with true shared state and should be removed or disabled as part of this project unless there is an explicit non-production reason to keep it.

## Error Handling

The design must handle these cases explicitly:

- unauthenticated user
- user not found
- duplicate same-day punch
- database write failure
- polling fetch failure

Expected UX:

- duplicate punch should show a clear, non-scary message
- network or server error should not corrupt local board state
- polling failures should not blank the board

## Security And Ownership

- the authenticated cookie remains the source of user identity
- the client must not be allowed to punch for another member by passing arbitrary member IDs
- all board reads are team-scoped on the server
- the server owns all permission checks

## Testing And Verification

Implementation should verify:

- punch API creates a `PunchRecord` the first time
- second punch for the same day is rejected or treated idempotently according to the chosen API contract
- user `coins` increment only once per valid punch
- board-state reader returns correct `gridData` from persisted records
- current user sees immediate success after punching
- a second client sees the updated state within one polling cycle
- refresh preserves state
- auth boundaries still hold

Recommended test layers:

- API tests for `POST /api/board/punch`
- API tests for `GET /api/board/state`
- component test for board refresh after punch
- polling behavior test with mocked interval/timers

## Out Of Scope

This design does not include:

- WebSocket
- SSE
- optimistic multi-client conflict resolution
- mobile push notifications
- presence or typing indicators
- `gp` migration
- leaderboards or analytics redesign

## Follow-Up Path

If this version succeeds and the team later wants tighter sync or more traffic headroom, the next upgrade path is:

1. keep server-owned punch writes
2. replace polling with SSE or WebSocket
3. if deployment moves beyond one server, migrate from SQLite to PostgreSQL
