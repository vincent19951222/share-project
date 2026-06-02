import type { SupplyPanelKey } from "@/lib/navigation-routes";
import type { AppTab } from "@/lib/types";

export const loadSharedBoard = () => import("@/components/shared-board/SharedBoard").then((mod) => mod.SharedBoard);
export const loadDrinkCheckin = () => import("@/components/drink-checkin/DrinkCheckin").then((mod) => mod.DrinkCheckin);
export const loadCalendarBoard = () => import("@/components/calendar/CalendarBoard").then((mod) => mod.CalendarBoard);
export const loadReportCenter = () => import("@/components/report-center/ReportCenter").then((mod) => mod.ReportCenter);
export const loadSupplyStation = () => import("@/components/gamification/SupplyStation").then((mod) => mod.SupplyStation);

export function preloadBoardTabComponent(tab: AppTab) {
  switch (tab) {
    case "board":
      void loadSharedBoard();
      break;
    case "coffee":
      void loadDrinkCheckin();
      break;
    case "calendar":
      void loadCalendarBoard();
      break;
    case "dash":
      void loadReportCenter();
      break;
    case "supply":
      void loadSupplyStation();
      break;
    case "punch":
      break;
  }
}

export function preloadSupplyPanelComponent(_panel: SupplyPanelKey) {
  void loadSupplyStation();
}
