import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task record formal route", () => {
  it("uses /dashboard/quest as the formal task-record route and keeps the legacy page as a redirect", () => {
    expect(existsSync("app/(board)/dashboard/quest/page.tsx")).toBe(true);
    expect(existsSync("app/ui-lab/supply-dashboard/task-record/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const formalPage = readFileSync("app/(board)/dashboard/quest/page.tsx", "utf8");
    const legacyPage = readFileSync("app/ui-lab/supply-dashboard/task-record/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const routes = readFileSync("lib/navigation-routes.ts", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const topTabs = readFileSync("components/gamification/ui-lab/supply-dashboard/SupplyDashboardTopTabs.tsx", "utf8");

    expect(boardPage).not.toContain("SupplyTaskRecordScene");
    expect(formalPage).toContain('<BoardApp activeTab="supply" supplyPanel="taskRecord" />');
    expect(legacyPage).toContain('redirect("/dashboard/quest")');
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyTaskRecordScene");
    expect(routes).toContain('taskRecord: "/dashboard/quest"');
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "data" | "supply";');
    expect(topTabs).toContain('label: "任务记录"');
    expect(topTabs).toContain('href: "/dashboard/quest"');
  });
});
