# Supply Task 17 Production Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add regression tests that keep Supply UI Lab static routes isolated from production APIs and keep production SupplyStation code isolated from UI Lab mock data and `team-goal`.

**Architecture:** Use source-level contract tests with `readFileSync`. This is intentionally static: the goal is to prevent bad imports and accidental route/API coupling before runtime.

**Tech Stack:** Vitest, Node `fs`, existing Next.js/React source tree.

---

## Files

- Create: `__tests__/supply-production-isolation.test.ts`
- Add: `docs/superpowers/specs/2026-05-26-supply-task-17-production-isolation-design.md`
- Add: `docs/superpowers/plans/2026-05-26-supply-task-17-production-isolation.md`

## Task 1: Add Isolation Contract Test

- [ ] **Step 1: Create the test file**

Create `__tests__/supply-production-isolation.test.ts`.

The test must:

- read the production SupplyStation files;
- assert production files do not contain UI Lab mock imports, mock symbols, `team-goal`, or `团队目标`;
- read the UI Lab route files;
- assert UI Lab routes do not import `@/lib/api`, do not contain `/api/gamification`, and do not call `fetch(`.

- [ ] **Step 2: Run isolation tests**

Run:

```bash
npm test -- __tests__/supply-production-isolation.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS. If a production file contains a stale UI Lab import or a UI Lab route contains a real API call, fix the specific import or route only.

## Task 2: Regression Verification

- [ ] **Step 1: Run production shell regression**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only Task 16 carry-over files plus the new Task 17 docs/test are changed.
