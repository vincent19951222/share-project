import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionFiles = [
  "components/gamification/SupplyStation.tsx",
  "components/gamification/production/SupplyStationShell.tsx",
  "components/gamification/production/SupplyDashboardPanel.tsx",
  "components/gamification/production/SupplyDrawPoolPanel.tsx",
  "components/gamification/production/SupplyBackpackPanel.tsx",
  "components/gamification/production/SupplyShopPanel.tsx",
  "components/gamification/production/SupplyTaskRecordPanel.tsx",
  "lib/gamification/supply-view-model.ts",
];

const uiLabRouteFiles = [
  "app/ui-lab/supply-dashboard/page.tsx",
  "app/ui-lab/supply-dashboard/draw-pool/page.tsx",
  "app/ui-lab/supply-dashboard/backpack/page.tsx",
  "app/ui-lab/supply-dashboard/shop/page.tsx",
  "app/ui-lab/supply-dashboard/task-record/page.tsx",
  "app/ui-lab/supply-dashboard/task-card-review/page.tsx",
];

const bannedProductionTerms = [
  "mock-data",
  "supplyDashboardMock",
  "supplyShopMock",
  "supplyBackpackMock",
  "supplyTaskRecordMock",
  "supplyDrawPoolMock",
  "components/gamification/ui-lab",
  "team-goal",
  "团队目标",
];

const bannedUiLabRouteTerms = [
  "@/lib/api",
  "/api/gamification",
  "fetch(",
];

function readSource(file: string) {
  return readFileSync(file, "utf8");
}

describe("supply production isolation", () => {
  it("does not import UI Lab mock data or team-goal into production code", () => {
    for (const file of productionFiles) {
      const source = readSource(file);

      for (const term of bannedProductionTerms) {
        expect(source, `${file} should not contain ${term}`).not.toContain(term);
      }
    }
  });

  it("keeps UI Lab routes static and free of production API calls", () => {
    for (const file of uiLabRouteFiles) {
      const source = readSource(file);

      for (const term of bannedUiLabRouteTerms) {
        expect(source, `${file} should not contain ${term}`).not.toContain(term);
      }
    }
  });
});
