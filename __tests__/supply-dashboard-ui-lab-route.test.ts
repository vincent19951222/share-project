import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply dashboard ui lab route isolation", () => {
  it("uses a standalone ui-lab route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");

    expect(boardPage).not.toContain("SupplyDashboardScene");
    expect(navbar).not.toContain("ui-lab");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
  });
});
