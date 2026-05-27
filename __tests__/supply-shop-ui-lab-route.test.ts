import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply shop formal route", () => {
  it("uses /dashboard/store as the formal shop route and keeps the legacy page as a redirect", () => {
    expect(existsSync("app/(board)/dashboard/store/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/shop/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/store/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/shop/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const topTabs = readFileSync("components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyShopScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="shop" />');
    expect(legacyPage).toContain('redirect("/dashboard/store")');
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyShopScene");
    expect(routes).toContain('shop: "/dashboard/store"');
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(topTabs).toContain('label: "补给商店"');
    expect(topTabs).toContain('href: "/dashboard/store"');
  });
});
