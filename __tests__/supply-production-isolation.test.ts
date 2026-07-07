import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionFiles = [
  "components/gamification/SupplyStation.tsx",
  "components/gamification/production/SupplyStationShell.tsx",
  "components/gamification/production/SupplyAiImageStudioPanel.tsx",
  "components/gamification/production/SupplyThemeGachaPanel.tsx",
  "components/gamification/production/SupplyArtworkBackpackPanel.tsx",
  "components/gamification/production/SupplyLegacyArchivePanel.tsx",
  "components/gamification/production/SupplyDashboardPanel.tsx",
  "components/gamification/production/SupplyDrawPoolPanel.tsx",
  "components/gamification/production/SupplyBackpackPanel.tsx",
  "components/gamification/production/SupplyShopPanel.tsx",
  "components/gamification/production/SupplyTaskRecordPanel.tsx",
  "components/gamification/production/supply-ui-lab-adapters.ts",
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
  "team-goal",
  "团队目标",
];

const bannedUiLabRouteTerms = [
  "@/lib/api",
  "/api/gamification",
  "fetch(",
];

const requiredProductionVisualTerms = [
  "SupplyAiImageStudioPanel",
  "SupplyArtworkBackpackPanel",
  "SupplyLegacyArchivePanel",
  "createAiImageGenerationTask",
  "retryAiImageGenerationTask",
  "normalizeInitialPanel",
  "studio",
  "themeGacha",
  "artworks",
  "legacyArchive",
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

  it("production uses UI Lab visual scenes through production adapters", () => {
    const shell = readSource("components/gamification/production/SupplyStationShell.tsx");
    const adapters = readSource("components/gamification/production/supply-ui-lab-adapters.ts");

    for (const term of requiredProductionVisualTerms) {
      expect(`${shell}\n${adapters}`, `missing ${term}`).toContain(term);
    }

    expect(shell).not.toContain("SupplyThemeGachaPanel");
    expect(shell).not.toContain("drawAiImageThemeFromSupply");
  });
});
