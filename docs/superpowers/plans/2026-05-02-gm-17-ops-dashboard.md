# GM-17 Ops Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only admin operations dashboard for gamification health and risk observation.

**Architecture:** Build a focused service in `lib/gamification/ops-dashboard.ts`, expose it through `GET /api/admin/gamification/ops-dashboard`, and render it in `/admin` with a client component that can refresh the snapshot. The dashboard reads existing tables only and does not mutate game state.

**Tech Stack:** Next.js App Router, TypeScript, Prisma SQLite, Vitest, React client component.

---

### Task 1: Snapshot Service

**Files:**
- Create: `lib/gamification/ops-dashboard.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/gamification-ops-dashboard.test.ts`

- [x] Write failing service tests for healthy metrics and risk detection.
- [x] Define shared snapshot types.
- [x] Implement `buildGamificationOpsDashboard({ teamId, now, windowDays })`.
- [x] Verify service tests pass.

### Task 2: Admin API

**Files:**
- Create: `app/api/admin/gamification/ops-dashboard/route.ts`
- Test: `__tests__/gamification-ops-dashboard-api.test.ts`

- [x] Write failing API tests for unauthenticated, non-admin, and admin requests.
- [x] Implement route auth with `loadCurrentUser()` and `isAdminUser()`.
- [x] Return `{ snapshot }`.
- [x] Verify API tests pass.

### Task 3: Admin UI

**Files:**
- Create: `components/admin/GamificationOpsDashboard.tsx`
- Modify: `app/(board)/admin/page.tsx`
- Test: `__tests__/gamification-ops-dashboard-panel.test.tsx`

- [x] Write failing component tests for metrics, risks, queue, and refresh.
- [x] Render the panel above `SeasonAdminPanel`.
- [x] Add refresh behavior through the admin API.
- [x] Verify component tests pass.

### Task 4: Docs And Verification

**Files:**
- Modify: `docs/gamification-dev-roadmap.md`
- Modify: `docs/gamification-acceptance-checklist.md`

- [x] Add GM-17 to the roadmap summary table and new section.
- [x] Add GM-17 acceptance checks.
- [x] Run focused GM-17 tests.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
