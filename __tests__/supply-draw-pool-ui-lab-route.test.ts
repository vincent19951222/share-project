import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply draw pool ui lab route isolation", () => {
  it("uses a standalone draw-pool route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/draw-pool/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const dashboardMock = readFileSync("components/gamification/ui-lab/supply-dashboard/mock-data.ts", "utf8");

    expect(boardPage).not.toContain("SupplyDrawPoolScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyDrawPoolScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(dashboardMock).toContain('href: "/ui-lab/supply-dashboard/draw-pool"');
    expect(dashboardMock).toContain('title: "补给站"');
    expect(dashboardMock).not.toContain('href="#supply"');
  });
});
