# Prisma Baseline And Mainline Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Prisma migration history with the real database shape on `main`, then ship `next/mainline` as a clean incremental migration instead of forcing unstable schema drift into production.

**Architecture:** Treat this as a two-phase rollout. First, create a Prisma baseline on top of `main` that matches the already-existing production schema without mutating live tables. Second, rebase or merge `next/mainline` onto that baseline and generate a new incremental migration that contains only Team Dynamics, Weekly Report, and WeCom webhook related schema changes.

**Tech Stack:** Git, Prisma Migrate, SQLite, Next.js, PM2, Vitest

---

### Task 1: Freeze And Snapshot The Current State

**Files:**
- Create: `docs/superpowers/plans/2026-04-28-prisma-baseline-and-mainline-rollout.md`
- Inspect: `prisma/schema.prisma`
- Inspect: `prisma/migrations/20260418065441_init/migration.sql`
- Inspect: `README.md`

- [ ] **Step 1: Confirm the current branch and working tree state**

Run:

```powershell
git branch --show-current
git status --short --branch
git log --oneline --decorate --no-merges main..HEAD
```

Expected:
- Current branch is `next/mainline`
- Worktree may be dirty, but you know which files are uncommitted
- Commits ahead of `main` are visible and reviewable

- [ ] **Step 2: Snapshot the current Prisma migration state**

Run:

```powershell
npx prisma migrate status
```

Expected:
- Prisma reports the migration directory contents
- If the database was historically created by `db push`, status may show unapplied or mismatched history

- [ ] **Step 3: Snapshot the database shape that already exists in development**

Run:

```powershell
npx prisma db pull --print
```

Expected:
- The printed schema includes the real existing tables
- This output can be compared against `prisma/schema.prisma` and the migration history

- [ ] **Step 4: Commit nothing yet**

Run:

```powershell
git status --short
```

Expected:
- No attempt to generate or commit migrations yet
- We are still in audit mode

- [ ] **Step 5: Commit checkpoint**

```bash
# No commit in this task. Continue once audit output is understood.
```

### Task 2: Create A Baseline Migration On Top Of `main`

**Files:**
- Create: `prisma/migrations/<timestamp>_baseline_main_schema/migration.sql`
- Modify: `prisma/migrations/migration_lock.toml` only if Prisma updates it
- Inspect: `prisma/schema.prisma` on `main`

- [ ] **Step 1: Move to a clean branch from `main`**

Run:

```powershell
git switch main
git pull origin main
git switch -c chore/prisma-baseline-main
```

Expected:
- You are now on a fresh baseline branch rooted at the latest `main`

- [ ] **Step 2: Make sure the `main` schema represents the current stable production model**

Run:

```powershell
git diff -- prisma/schema.prisma
Get-Content -Encoding UTF8 prisma\schema.prisma
```

Expected:
- `prisma/schema.prisma` reflects the stable production model only
- No Team Dynamics or Weekly Report tables should be present yet unless they are already merged to `main`

- [ ] **Step 3: Generate a baseline SQL script from empty to the `main` schema**

Run:

```powershell
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

Expected:
- Output SQL creates exactly the stable `main` schema
- Review the SQL before saving it

- [ ] **Step 4: Save the baseline migration in a new migration directory**

Run:

```powershell
New-Item -ItemType Directory -Path prisma\migrations\20260428_baseline_main_schema -Force
```

Then write the reviewed SQL into:

```text
prisma/migrations/20260428_baseline_main_schema/migration.sql
```

Expected:
- The migration directory exists
- The SQL file fully represents the stable `main` schema

- [ ] **Step 5: Mark the baseline as already applied on existing databases instead of replaying it**

Run on every existing environment that already has these tables:

```powershell
npx prisma migrate resolve --applied 20260428_baseline_main_schema
```

Expected:
- `_prisma_migrations` records the baseline without changing real tables

- [ ] **Step 6: Verify Prisma now sees a consistent history on the baseline branch**

Run:

```powershell
npx prisma migrate status
```

Expected:
- Prisma reports that migration history is now aligned
- No historical drift remains for the `main` schema

- [ ] **Step 7: Commit the baseline migration**

```powershell
git add prisma/migrations
git commit -m "chore: add prisma baseline for stable main schema"
```

### Task 3: Rebase Or Merge `next/mainline` Onto The Baseline

**Files:**
- Modify: `prisma/schema.prisma`
- Inspect: `lib/weekly-report-service.ts`
- Inspect: `lib/wework-webhook.ts`
- Inspect: `app/api/reports/weekly/publish/route.ts`

- [ ] **Step 1: Bring the baseline commit into the feature branch**

Recommended path:

```powershell
git switch next/mainline
git merge chore/prisma-baseline-main
```

Expected:
- `next/mainline` now contains the baseline migration history
- Resolve any merge conflicts before continuing

- [ ] **Step 2: Confirm the feature schema still contains the new tables**

Run:

```powershell
git diff main -- prisma/schema.prisma
Get-Content -Encoding UTF8 prisma\schema.prisma
```

Expected:
- Diff shows Team Dynamics and Weekly Report related additions on top of `main`

- [ ] **Step 3: Generate the real incremental migration from baseline to feature schema**

Run:

```powershell
npx prisma migrate dev --name add-team-dynamics-and-weekly-report
```

Expected:
- Prisma creates a new migration after the baseline
- The generated SQL should add only the feature-level tables and indexes

- [ ] **Step 4: Review the generated migration carefully**

Run:

```powershell
Get-ChildItem prisma\migrations | Select-Object Name
Get-Content -Encoding UTF8 prisma\migrations\<new_timestamp>_add-team-dynamics-and-weekly-report\migration.sql
```

Expected:
- SQL creates `WeeklyReportDraft`, `TeamDynamic`, and `TeamDynamicReadState`
- SQL should not recreate old `Season`, `BoardNote`, `CoffeeRecord`, or other already-stable tables

- [ ] **Step 5: Commit the incremental feature migration**

```powershell
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add team dynamics and weekly report migration"
```

### Task 4: Verify Code And Database Rollout Safety

**Files:**
- Test: `__tests__/weekly-report-api.test.ts`
- Test: `__tests__/weekly-report-service.test.ts`
- Test: `__tests__/wework-webhook.test.ts`
- Inspect: `.env.example`
- Inspect: `README.md`

- [ ] **Step 1: Run the focused regression tests**

Run:

```powershell
npm test -- __tests__/weekly-report-service.test.ts __tests__/weekly-report-api.test.ts __tests__/wework-webhook.test.ts
```

Expected:
- All targeted tests pass

- [ ] **Step 2: Run the TypeScript check**

Run:

```powershell
npm run lint
```

Expected:
- `tsc --noEmit` passes

- [ ] **Step 3: Verify migration status one more time**

Run:

```powershell
npx prisma migrate status
```

Expected:
- Migration history is linear and applied in development

- [ ] **Step 4: Commit any last documentation updates**

```powershell
git add README.md .env.example ROADMAP.md
git commit -m "docs: update rollout notes for wework and migrations"
```

Expected:
- Skip this commit if those files were already included earlier and nothing changed

### Task 5: Merge To `main` And Roll Out To Production

**Files:**
- Inspect: `README.md`
- Inspect: `prisma/migrations/<timestamp>_baseline_main_schema/migration.sql`
- Inspect: `prisma/migrations/<timestamp>_add-team-dynamics-and-weekly-report/migration.sql`

- [ ] **Step 1: Merge the baseline branch to `main` first**

Run:

```powershell
git switch main
git pull origin main
git merge chore/prisma-baseline-main
git push origin main
```

Expected:
- `main` now contains the baseline migration history only

- [ ] **Step 2: Mark the baseline as applied on the production database**

Run in the production code directory:

```powershell
cd E:\Projects\share-project
npx prisma migrate resolve --applied 20260428_baseline_main_schema
```

Expected:
- Production migration history now knows the stable schema already exists

- [ ] **Step 3: Merge the feature branch to `main` after baseline alignment**

Run:

```powershell
git switch main
git pull origin main
git merge next/mainline
git push origin main
```

Expected:
- `main` now contains the feature code and the incremental Team Dynamics migration

- [ ] **Step 4: Deploy the feature migration and application code in production**

Run in the production code directory:

```powershell
cd E:\Projects\share-project
git pull origin main
npm install
npx prisma migrate deploy
npm run build
cmd /c pm2 restart share-project --update-env
```

Expected:
- Production database applies only the new incremental migration
- Next.js rebuilds successfully
- PM2 restarts the app with the latest environment

- [ ] **Step 5: Smoke test the production app**

Run:

```powershell
cmd /c pm2 status share-project
cmd /c pm2 logs share-project --lines 60 --nostream
```

Expected:
- PM2 shows the app online
- No startup errors from Prisma migration or missing env vars
