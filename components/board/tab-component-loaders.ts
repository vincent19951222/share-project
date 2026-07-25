import type { AppTab } from "@/lib/types";

export const loadSharedBoard = () => import("@/components/shared-board/SharedBoard").then((mod) => mod.SharedBoard);
export const loadDrinkCheckin = () => import("@/components/drink-checkin/DrinkCheckin").then((mod) => mod.DrinkCheckin);
export const loadCalendarBoard = () => import("@/components/calendar/CalendarBoard").then((mod) => mod.CalendarBoard);
export const loadDashboardBoard = () => import("@/components/dashboard/DashboardBoard").then((mod) => mod.DashboardBoard);
export const loadReportCenter = () => import("@/components/report-center/ReportCenter").then((mod) => mod.ReportCenter);
export const loadDataDashboard = () => import("@/components/data-dashboard/DataDashboard").then((mod) => mod.DataDashboard);

export function preloadBoardTabComponent(tab: AppTab) {
  switch (tab) {
    case "board":
      void loadSharedBoard();
      break;
    case "coffee":
      void loadDrinkCheckin();
      break;
    case "data":
      void loadDataDashboard();
      void loadDashboardBoard();
      break;
    case "punch":
      break;
  }
}
