# Supply Task 01 Release Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为牛马补给站第三阶段建立文档化、可测试的发布护栏和验收契约，先保护生产数据库发布流程，再进入 schema/API/UI 接入。

**Architecture:** 本任务只修改项目文档并新增一个 Vitest 文档契约测试。测试读取 overall spec、数据库流程、生产发布清单和游戏化验收清单，确认第三阶段关键决策、生产 SQLite 发布步骤、EXP/商店购买验收 SQL 都存在。

**Tech Stack:** Next.js 15 App Router repository, TypeScript strict mode, Vitest, Prisma/SQLite operational docs, Windows PM2 production deployment docs.

---

## Scope

本计划对应 spec：

`docs/superpowers/specs/2026-05-25-supply-task-01-release-guardrails-design.md`

本任务只做文档和契约测试，不修改：

- `prisma/schema.prisma`
- `lib/gamification/*`
- `app/api/*`
- `components/gamification/*`
- seed 或生产数据库文件

## File Structure

- Create: `__tests__/supply-production-plan-contract.test.ts`
  - 读取 Task 1 相关文档，锁住第三阶段产品决策、生产数据库发布护栏和验收 SQL 字段。
- Modify: `docs/database-workflow.md`
  - 增加牛马补给站第三阶段 DB 变更专项段落，明确 `User.exp`、`ExperienceLedger`、`ShopPurchase`、备份和 `npx prisma db push`。
- Modify: `docs/production-release-checklist.md`
  - 增加第三阶段发布 checklist，覆盖 Windows 生产路径、生产备份、Prisma generate/db push、build、PM2 restart 和生产 seed 禁令。
- Modify: `docs/gamification-acceptance-checklist.md`
  - 增加第三阶段 EXP 和 ShopPurchase 验收项，以及只读 SQL。

## Task 1: Release Guardrails Contract Test

**Files:**
- Create: `__tests__/supply-production-plan-contract.test.ts`

- [ ] **Step 1: Write the failing document contract test**

Create `__tests__/supply-production-plan-contract.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readDoc = (path: string) => readFileSync(path, "utf8");

const overallSpec = readDoc(
  "docs/superpowers/specs/2026-05-25-supply-production-integration-overall-design.md",
);
const taskSpec = readDoc(
  "docs/superpowers/specs/2026-05-25-supply-task-01-release-guardrails-design.md",
);
const databaseWorkflow = readDoc("docs/database-workflow.md");
const productionChecklist = readDoc("docs/production-release-checklist.md");
const acceptanceChecklist = readDoc("docs/gamification-acceptance-checklist.md");

describe("supply production release guardrail contracts", () => {
  it("locks the approved phase-3 product decisions", () => {
    for (const doc of [overallSpec, taskSpec]) {
      expect(doc).toContain("`team-goal` 不进入第三阶段");
      expect(doc).toContain("`User.coins`");
      expect(doc).toContain("银子");
      expect(doc).toContain("ExperienceLedger");
      expect(doc).toContain("ShopPurchase");
    }

    expect(overallSpec).toContain("补给商店在第三阶段做真实购买");
    expect(taskSpec).toContain("背包容量第三阶段固定展示为 `60`");
  });

  it("documents production database release safeguards", () => {
    expect(databaseWorkflow).toContain("牛马补给站第三阶段 DB 变更");
    expect(databaseWorkflow).toContain("`User.exp`");
    expect(databaseWorkflow).toContain("`ExperienceLedger`");
    expect(databaseWorkflow).toContain("`ShopPurchase`");
    expect(databaseWorkflow).toContain("备份生产 SQLite");
    expect(databaseWorkflow).toContain("npx prisma generate");
    expect(databaseWorkflow).toContain("npx prisma db push");
    expect(databaseWorkflow).toContain("不要在生产执行 `npx tsx prisma/seed.ts`");
    expect(databaseWorkflow).toContain(
      "不要在生产执行 `npx tsx scripts/fill-gamification-test-data.ts`",
    );
  });

  it("documents the phase-3 production release checklist", () => {
    expect(productionChecklist).toContain("牛马补给站第三阶段发布专项检查");
    expect(productionChecklist).toContain("E:\\Projects\\share-project");
    expect(productionChecklist).toContain("E:\\data\\share-project\\prod.db");
    expect(productionChecklist).toContain("file:/E:/data/share-project/prod.db");
    expect(productionChecklist).toContain("`User.exp`");
    expect(productionChecklist).toContain("`ExperienceLedger`");
    expect(productionChecklist).toContain("`ShopPurchase`");
    expect(productionChecklist).toContain("npx prisma generate");
    expect(productionChecklist).toContain("npx prisma db push");
    expect(productionChecklist).toContain("npm run build");
    expect(productionChecklist).toContain("pm2 restart share-project --update-env");
    expect(productionChecklist).toContain("生产环境不要执行 `npx tsx prisma/seed.ts`");
    expect(productionChecklist).toContain(
      "生产环境不要执行 `npx tsx scripts/fill-gamification-test-data.ts`",
    );
  });

  it("extends acceptance checks for exp and shop purchase consistency", () => {
    expect(acceptanceChecklist).toContain("第三阶段 EXP 和商店购买验收");
    expect(acceptanceChecklist).toContain("ExperienceLedger");
    expect(acceptanceChecklist).toContain("ShopPurchase");
    expect(acceptanceChecklist).toContain("u.exp as userExp");
    expect(acceptanceChecklist).toContain("ledgerExp");
    expect(acceptanceChecklist).toContain("shopPurchases");
    expect(acceptanceChecklist).toContain("userExp = ledgerExp");
    expect(acceptanceChecklist).toContain("ShopPurchase");
    expect(acceptanceChecklist).toContain("InventoryItem");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: FAIL. The test file exists, but the three target docs do not yet contain the third-stage guardrail sections and SQL aliases required by the assertions.

## Task 2: Database Workflow Guardrails

**Files:**
- Modify: `docs/database-workflow.md`

- [ ] **Step 1: Add a phase-3 database release section**

In `docs/database-workflow.md`, add this section after `## Golden Rules`:

````markdown
## 牛马补给站第三阶段 DB 变更

第三阶段会新增真实 EXP、等级和商店购买能力。对应 schema 变更是：

- `User.exp`
- `ExperienceLedger`
- `ShopPurchase`

当前项目第三阶段生产发布约定使用 `npx prisma db push` 同步 SQLite schema。本文前面保留的 migration 叙述用于长期数据库方法论；牛马补给站第三阶段按本节和生产发布清单执行。

发布前必须备份生产 SQLite：

```powershell
New-Item -ItemType Directory -Force E:\data\share-project\backups
Copy-Item E:\data\share-project\prod.db E:\data\share-project\backups\prod-$(Get-Date -Format "yyyy-MM-dd-HHmmss").db
```

生产 schema 同步顺序：

```powershell
Set-Location E:\Projects\share-project
$env:DATABASE_URL="file:/E:/data/share-project/prod.db"
npm install
npx prisma generate
npx prisma db push
npm run build
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 restart share-project --update-env"
```

生产禁令：

- 不要在生产执行 `npx tsx prisma/seed.ts`。
- 不要在生产执行 `npx tsx scripts/fill-gamification-test-data.ts`。
- 不要用本地 `dev.db`、验收库或 UI Lab mock 数据覆盖 `E:\data\share-project\prod.db`。
````

- [ ] **Step 2: Run the focused test and verify remaining failures**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: FAIL. Database workflow assertions now pass, while production checklist and acceptance checklist assertions still fail.

## Task 3: Production Release Checklist

**Files:**
- Modify: `docs/production-release-checklist.md`

- [ ] **Step 1: Add the phase-3 production checklist**

In `docs/production-release-checklist.md`, add this section after `## Pre-Release Gate`:

````markdown
## 牛马补给站第三阶段发布专项检查

第三阶段 schema 变更：

- `User.exp`
- `ExperienceLedger`
- `ShopPurchase`

生产目标必须保持：

```text
code: E:\Projects\share-project
db:   E:\data\share-project\prod.db
env:  DATABASE_URL="file:/E:/data/share-project/prod.db"
```

发布前确认：

- [ ] 当前 release commit 包含第三阶段 schema 和代码。
- [ ] `E:\data\share-project\prod.db` 已备份到 `E:\data\share-project\backups`。
- [ ] 生产环境变量为 `DATABASE_URL="file:/E:/data/share-project/prod.db"`。
- [ ] 生产环境不要执行 `npx tsx prisma/seed.ts`。
- [ ] 生产环境不要执行 `npx tsx scripts/fill-gamification-test-data.ts`。

涉及 schema 变更时，生产执行顺序为：

```powershell
Set-Location E:\Projects\share-project
$env:DATABASE_URL="file:/E:/data/share-project/prod.db"
npm install
npx prisma generate
npx prisma db push
npm run build
cmd /c "set DATABASE_URL=file:/E:/data/share-project/prod.db && pm2 restart share-project --update-env"
```

发布后 smoke 增加：

- [ ] 补给站能展示新 UI 和原有抽奖、背包、兑换能力。
- [ ] 用户等级和 EXP 能加载，且不显示静态假数据。
- [ ] 商店购买会扣银子、增加背包库存并写入 `ShopPurchase`。
- [ ] 管理员兑换队列仍能确认或取消真实福利兑换。
````

- [ ] **Step 2: Run the focused test and verify remaining failures**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: FAIL. Database workflow and production checklist assertions now pass, while acceptance checklist assertions still fail.

## Task 4: Acceptance Checklist SQL

**Files:**
- Modify: `docs/gamification-acceptance-checklist.md`

- [ ] **Step 1: Add third-stage EXP and shop purchase acceptance checks**

In `docs/gamification-acceptance-checklist.md`, add this section after the current economic data SQL checks:

````markdown
### 第三阶段 EXP 和商店购买验收

第三阶段补给站接入生产后，追加这些端到端检查：

- [ ] 补给站资源栏继续把 `User.coins` 展示为“银子”。
- [ ] 用户能看到真实等级和 EXP 进度，不再使用 UI Lab 静态假数据。
- [ ] 完成每日四维任务后，`User.exp` 增加，并写入 `ExperienceLedger`。
- [ ] 完成真实健身打卡后，`User.exp` 增加，并写入 `ExperienceLedger`。
- [ ] 商店购买成功后，`User.coins` 减少、`InventoryItem.quantity` 增加，并写入 `ShopPurchase`。

每次完整验收后跑下面的只读 SQL：

```bash
sqlite3 /Users/vincent/data/share-project/dev.db '
select
  u.username,
  u.exp as userExp,
  coalesce((select sum(delta) from ExperienceLedger e where e.userId = u.id), 0) as ledgerExp,
  coalesce((select count(*) from ShopPurchase s where s.userId = u.id), 0) as shopPurchases
from User u
order by u.createdAt;
'
```

通过标准：

- `userExp = ledgerExp`。
- 发生商店购买后，`shopPurchases` 增加。
- 商店购买后的银子减少和库存增加能从 `ShopPurchase` 与 `InventoryItem` 解释。
````

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: PASS.

## Task 5: Self-Review And Commit

**Files:**
- Verify: `__tests__/supply-production-plan-contract.test.ts`
- Verify: `docs/database-workflow.md`
- Verify: `docs/production-release-checklist.md`
- Verify: `docs/gamification-acceptance-checklist.md`

- [ ] **Step 1: Scan for placeholder language**

Run:

```bash
rg "TB[D]|TO[D]O|待[定]|稍[后]|fill[ ]in|Similar[ ]to" __tests__/supply-production-plan-contract.test.ts docs/database-workflow.md docs/production-release-checklist.md docs/gamification-acceptance-checklist.md
```

Expected: no output.

- [ ] **Step 2: Scan for required contract terms**

Run:

```bash
rg "User.exp|ExperienceLedger|ShopPurchase|userExp|ledgerExp|shopPurchases|npx prisma db push|npx prisma generate|pm2 restart share-project --update-env|team-goal|银子" docs/database-workflow.md docs/production-release-checklist.md docs/gamification-acceptance-checklist.md docs/superpowers/specs/2026-05-25-supply-task-01-release-guardrails-design.md __tests__/supply-production-plan-contract.test.ts
```

Expected: output includes every required term in at least one target file, and the contract test includes assertions for the operationally critical terms.

- [ ] **Step 3: Run the focused contract test**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the Task 1 implementation**

Run:

```bash
git add docs/database-workflow.md docs/production-release-checklist.md docs/gamification-acceptance-checklist.md __tests__/supply-production-plan-contract.test.ts
git commit -m "docs: add supply production release guardrails"
```

Expected: commit succeeds with only the three documentation files and one contract test staged.

## Handoff

Task 1 complete means the release and acceptance guardrails exist and are protected by a focused contract test. After that, continue to Task 2 from `docs/superpowers/plans/2026-05-25-supply-production-integration.md`, which starts the real Prisma schema work for `User.exp`, `ExperienceLedger`, and `ShopPurchase`.
