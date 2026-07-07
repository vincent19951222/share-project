import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
describe("supply artworks formal route", () => {
  it("uses /dashboard/backpack as the formal artworks route and keeps the legacy page as a redirect", () => {
    expect(existsSync("app/(board)/dashboard/backpack/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/backpack/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/backpack/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/backpack/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    expect(boardPage).not.toContain("SupplyBackpackScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="artworks" />');
    expect(legacyPage).toContain('redirect("/dashboard/backpack")');
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyBackpackScene");
    expect(routes).toContain('artworks: "/dashboard/backpack"');
    expect(types).toContain(
      'export type AppTab = "punch" | "board" | "coffee" | "data" | "supply";',
    );
  });
});
