import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply team goal ui lab route isolation", () => {
  it("uses a standalone team-goal route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/team-goal/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyTeamGoalScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyTeamGoalScene");
    expect(types).toContain(
      'export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";',
    );
  });
});
