import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply theme gacha formal route", () => {
  it("uses /dashboard/cards as the formal theme-gacha route and keeps the legacy page as a redirect", () => {
    expect(existsSync("app/(board)/dashboard/cards/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/draw-pool/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/cards/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/draw-pool/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyDrawPoolScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="themeGacha" />');
    expect(legacyPage).toContain('redirect("/dashboard/cards")');
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyDrawPoolScene");
    expect(routes).toContain('themeGacha: "/dashboard/cards"');
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
  });
});
