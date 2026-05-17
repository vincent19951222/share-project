import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

describe("supply backpack ui lab route isolation", () => {
  it("uses a standalone backpack route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/backpack/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const backpackShortcut = supplyDashboardMock.shortcutLinks.find((link) => link.id === "backpack");

    expect(boardPage).not.toContain("SupplyBackpackScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyBackpackScene");
    expect(types).toContain(
      'export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";',
    );
    expect(backpackShortcut).toMatchObject({
      href: "/ui-lab/supply-dashboard/backpack",
      title: "背包",
    });
  });
});
