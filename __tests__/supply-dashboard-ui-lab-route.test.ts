import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply studio formal route", () => {
  it("uses /dashboard/status as the formal studio route and keeps the legacy page as a redirect", () => {
    expect(existsSync("app/(board)/dashboard/status/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/status/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");

    expect(boardPage).not.toContain("SupplyDashboardScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="studio" />');
    expect(legacyPage).toContain('redirect("/dashboard/status")');
    expect(navbar).not.toContain("ui-lab");
    expect(routes).toContain('supply: "/dashboard/status"');
    expect(routes).toContain('studio: "/dashboard/status"');
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "data" | "supply";');
  });
});
