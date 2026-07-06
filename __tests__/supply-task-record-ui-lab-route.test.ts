import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply quest compatibility route", () => {
  it("keeps /dashboard/quest as a compatibility alias into legacy archive and preserves the legacy redirect", () => {
    expect(existsSync("app/(board)/dashboard/quest/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/task-record/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/quest/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/task-record/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    expect(boardPage).not.toContain("SupplyTaskRecordScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="legacyArchive" />');
    expect(legacyPage).toContain('redirect("/dashboard/quest")');
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyTaskRecordScene");
    expect(routes).not.toContain('taskRecord: "/dashboard/quest"');
    expect(routes).toContain('legacyArchive: "/dashboard/store"');
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
  });
});
