import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { appTabRoutes, supplyPanelRoutes } from "@/lib/navigation-routes";

describe("formal navigation routes", () => {
  it("maps the main dashboard tabs to their public routes", () => {
    expect(appTabRoutes).toEqual({
      punch: "/",
      board: "/board",
      coffee: "/drink",
      data: "/calendar",
      supply: "/dashboard/status",
    });
  });

  it("maps supply station panels to their public dashboard routes", () => {
    expect(supplyPanelRoutes).toEqual({
      dashboard: "/dashboard/status",
      shop: "/dashboard/store",
      taskRecord: "/dashboard/quest",
      backpack: "/dashboard/backpack",
      drawPool: "/dashboard/cards",
    });
  });

  it("keeps legacy ui-lab supply routes as redirects only", () => {
    const legacyRedirects = {
      "app/ui-lab/supply-dashboard/page.tsx": "/dashboard/status",
      "app/ui-lab/supply-dashboard/shop/page.tsx": "/dashboard/store",
      "app/ui-lab/supply-dashboard/task-record/page.tsx": "/dashboard/quest",
      "app/ui-lab/supply-dashboard/backpack/page.tsx": "/dashboard/backpack",
      "app/ui-lab/supply-dashboard/draw-pool/page.tsx": "/dashboard/cards",
    };

    for (const [path, target] of Object.entries(legacyRedirects)) {
      const page = readFileSync(path, "utf8");

      expect(page).toContain("redirect(");
      expect(page).toContain(`"${target}"`);
      expect(page).not.toContain("SupplyDashboardScene");
      expect(page).not.toContain("SupplyShopScene");
      expect(page).not.toContain("SupplyTaskRecordScene");
      expect(page).not.toContain("SupplyBackpackScene");
      expect(page).not.toContain("SupplyDrawPoolScene");
    }
  });
});
