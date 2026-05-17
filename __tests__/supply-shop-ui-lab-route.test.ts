import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply shop ui lab route isolation", () => {
  it("uses a standalone shop route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/shop/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const topTabs = readFileSync("components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyShopScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyShopScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(topTabs).toContain('label: "补给商店"');
    expect(topTabs).toContain('href: "/ui-lab/supply-dashboard/shop"');
  });
});
