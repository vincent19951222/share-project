import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("BoardApp dynamic tab boundaries", () => {
  const boardAppSource = readFileSync("components/board/BoardApp.tsx", "utf8");
  const loaderSource = readFileSync("components/board/tab-component-loaders.ts", "utf8");
  const dynamicTabsSource = readFileSync("components/board/dynamic-tabs.tsx", "utf8");

  it("keeps the default punch tab static and moves heavy tabs behind dynamic imports", () => {
    expect(boardAppSource).toContain('from "@/components/punch-board/PunchBoard"');
    expect(boardAppSource).not.toContain('from "@/components/shared-board/SharedBoard"');
    expect(boardAppSource).not.toContain('from "@/components/coffee-checkin/CoffeeCheckin"');
    expect(boardAppSource).not.toContain('from "@/components/drink-checkin/DrinkCheckin"');
    expect(boardAppSource).not.toContain('from "@/components/calendar/CalendarBoard"');
    expect(boardAppSource).not.toContain('from "@/components/data-dashboard/DataDashboard"');
    expect(boardAppSource).not.toContain('from "@/components/report-center/ReportCenter"');
    expect(boardAppSource).not.toContain('from "@/components/gamification/SupplyStation"');
  });

  it("defines reusable dynamic tab components and preload helpers", () => {
    expect(dynamicTabsSource).toContain('from "next/dynamic"');
    expect(dynamicTabsSource).toContain("DynamicSharedBoard");
    expect(dynamicTabsSource).toContain("DynamicDrinkCheckin");
    expect(dynamicTabsSource).toContain("DynamicDataDashboard");
    expect(dynamicTabsSource).toContain("DynamicSupplyStation");
    expect(loaderSource).toContain("loadDrinkCheckin");
    expect(loaderSource).toContain("loadSharedBoard");
    expect(loaderSource).toContain("loadDataDashboard");
    expect(loaderSource).toContain("loadSupplyStation");
    expect(loaderSource).toContain("preloadBoardTabComponent");
    expect(loaderSource).toContain('case "data"');
    expect(loaderSource).not.toContain('case "dash"');
    expect(loaderSource).not.toContain('case "calendar"');
    expect(loaderSource).toContain("preloadSupplyPanelComponent");
  });
});
