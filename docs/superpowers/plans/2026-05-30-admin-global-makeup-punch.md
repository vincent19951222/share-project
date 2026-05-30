# Admin Global Makeup Punch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only global makeup punch flow while leaving ordinary yesterday makeup unchanged.

**Architecture:** Keep the existing member makeup API intact. Add a separate admin API, a small ledger model for auditability, an admin page panel for precise entry, and an admin-only heatmap interaction for direct missed-cell makeup.

**Tech Stack:** Next.js App Router API Routes, Prisma SQLite, React client components, Vitest/jsdom.

---

### Task 1: API Contract Tests

**Files:**
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] Add tests for `POST /api/admin/board/makeup-punch`: admin success, member forbidden, duplicate rejected, other-team target rejected.
- [ ] Run `npm test -- __tests__/board-punch-api.test.ts` and confirm the new tests fail because the route does not exist yet.

### Task 2: Persistence And API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260530230000_add_admin_makeup_punch_ledger/migration.sql`
- Create: `app/api/admin/board/makeup-punch/route.ts`

- [ ] Add `AdminMakeupPunchLedger` relations and indexes.
- [ ] Implement admin-only validation: same team target, current month, before today, target day empty.
- [ ] Create `PunchRecord` with `punchType: "admin-makeup"` and fixed `assetAwarded: 10`.
- [ ] Increment user coins, active current-month season slot/stat if available, and write the admin ledger.
- [ ] Return a fresh board snapshot for the admin.
- [ ] Run `npm test -- __tests__/board-punch-api.test.ts` and confirm it passes.

### Task 3: Admin UI Tests

**Files:**
- Modify: `__tests__/admin-page-shell.test.tsx`
- Create: `__tests__/admin-makeup-punch-panel.test.tsx`

- [ ] Assert the admin shell exposes a “全局补卡” section.
- [ ] Assert the makeup panel renders member/date fields and submits to `/api/admin/board/makeup-punch`.
- [ ] Assert success and backend error messages render.
- [ ] Run the new component tests and confirm they fail before implementation.

### Task 4: Admin UI Implementation

**Files:**
- Modify: `components/admin/AdminPageShell.tsx`
- Create: `components/admin/AdminMakeupPunchPanel.tsx`
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `app/(board)/admin/page.tsx`
- Modify: `lib/board-state.ts`
- Modify: `lib/types.ts`

- [ ] Include current team members in the admin page data.
- [ ] Render the global makeup panel before season settings.
- [ ] Use existing admin page card, form, button, success, and error patterns.
- [ ] Submit `{ targetUserId, dayKey }` to the new API.
- [ ] Let admins click missed past heatmap cells and submit the same `{ targetUserId, dayKey }` payload.
- [ ] Keep regular members limited to the existing yesterday makeup path.
- [ ] Run the admin UI tests and confirm they pass.

### Task 5: Verification

**Files:**
- No additional files.

- [ ] Run focused tests for punch API and admin UI.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
