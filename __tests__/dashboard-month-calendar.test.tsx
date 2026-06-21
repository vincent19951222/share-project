import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MonthCalendar } from "@/components/dashboard/MonthCalendar";
import type { DashboardMonthSnapshot } from "@/lib/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createMonthSnapshot(): DashboardMonthSnapshot {
  return {
    monthKey: "2026-06",
    currentMonthKey: "2026-06",
    todayDay: 20,
    totalDays: 30,
    workoutDays: 2,
    drinkCupTotal: 2,
    coffeeCupTotal: 2,
    days: Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      return {
        dayKey: `2026-06-${day.toString().padStart(2, "0")}`,
        day,
        workedOut: day === 3 || day === 16,
        drinkCups: day === 3 ? 1 : day === 16 ? 2 : 0,
        coffeeCups: day === 3 ? 1 : day === 16 ? 2 : 0,
        workoutMinutes: day === 3 ? 50 : day === 16 ? 90 : 0,
        trainingType: day === 3 ? "cardio" : day === 16 ? "strength" : null,
        cardioItem: day === 3 ? "elliptical" : null,
        strengthParts: day === 16 ? ["glutes"] : [],
        drinkCounts: {
          water: day === 16 ? 2 : 0,
          milkTea: 0,
          americano: day === 3 ? 1 : 0,
          latte: 0,
          other: 0,
        },
      };
    }),
  };
}

describe("MonthCalendar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    root?.unmount();
    container.remove();
  });

  it("positions first-row tooltips below the cell so they remain visible", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MonthCalendar snapshot={createMonthSnapshot()} />);
    });

    const firstRowDay = container.querySelector<HTMLButtonElement>(
      "button[aria-label^='3日']",
    );
    const lowerDay = container.querySelector<HTMLButtonElement>(
      "button[aria-label^='16日']",
    );

    expect(firstRowDay).not.toBeNull();
    expect(firstRowDay?.classList.contains("calendar-day-cell-tooltip-below")).toBe(true);
    expect(lowerDay).not.toBeNull();
    expect(lowerDay?.classList.contains("calendar-day-cell-tooltip-below")).toBe(false);
  });
});
