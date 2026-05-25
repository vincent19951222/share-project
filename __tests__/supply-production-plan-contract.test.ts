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
