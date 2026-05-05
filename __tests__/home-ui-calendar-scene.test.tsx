import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import type { CalendarMonthSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const snapshot: CalendarMonthSnapshot = {
  monthKey: "2026-05",
  currentMonthKey: "2026-05",
  todayDay: 28,
  totalDays: 31,
  workoutDays: 12,
  coffeeCupTotal: 18,
  days: [
    { day: 1, workedOut: true, coffeeCups: 1 },
    { day: 2, workedOut: true, coffeeCups: 2 },
    { day: 5, workedOut: false, coffeeCups: 0 },
    { day: 28, workedOut: true, coffeeCups: 2 },
  ],
};

async function waitFor(assertion: () => void | Promise<void>, timeoutMs = 1000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
      if (Date.now() - start >= timeoutMs) {
        throw error;
      }
    }
  }
}

function getDayCell(container: HTMLElement, day: number) {
  const cell = Array.from(container.querySelectorAll(".calendar-day-cell")).find((candidate) => {
    return candidate.querySelector(".calendar-day-number")?.textContent?.trim() === String(day);
  });

  expect(cell).toBeDefined();
  return cell as HTMLElement;
}

describe("home calendar scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot }),
      }),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the calendar as a layered desk binder scene", async () => {
    await act(async () => {
      root.render(<CalendarBoard />);
    });

    await waitFor(() => {
      expect(container.querySelector(".calendar-scene")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-background")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-props")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-content")).not.toBeNull();
      expect(container.querySelector(".calendar-binder-shell")).not.toBeNull();
      expect(container.querySelector(".calendar-paper-surface")).not.toBeNull();
    });

    const propSources = Array.from(container.querySelectorAll(".calendar-scene-props img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(propSources).toEqual(
      expect.arrayContaining([
        "/assets/home-scenes/calendar/binder-rings-left.webp",
        "/assets/home-scenes/calendar/binder-clip.webp",
        "/assets/home-scenes/calendar/highlighter-focus-progress.webp",
        "/assets/home-scenes/calendar/sticker-just-lift.webp",
        "/assets/home-scenes/calendar/note-keep-going-purple.webp",
        "/assets/home-scenes/calendar/calendar-coffee-stamp-paper.webp",
        "/assets/home-scenes/calendar/calendar-coffee-ring-stain.webp",
      ]),
    );
  });

  it("renders fixed header actions, structured summary chips, compact day states, and neighbor cells", async () => {
    await act(async () => {
      root.render(<CalendarBoard />);
    });

    await waitFor(() => {
      expect(container.textContent).toContain("Monthly Record View");
      expect(container.textContent).toContain("牛马日历");
      expect(container.textContent).toContain("2026年5月");
      expect(container.textContent).toContain("上个月");
      expect(container.textContent).toContain("回到本月");
      expect(container.querySelector(".calendar-return-btn")?.getAttribute("disabled")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-chip-workout")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-chip-coffee")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-value")?.textContent).toContain("12");
      expect(container.textContent).toContain("18");
    });

    expect(container.querySelectorAll(".calendar-neighbor-cell")).toHaveLength(4);

    const dayOne = getDayCell(container, 1);
    expect(dayOne.querySelector(".calendar-workout-chip")).not.toBeNull();
    expect(dayOne.querySelector(".calendar-coffee-count")?.textContent).toContain("1");

    const emptyDay = getDayCell(container, 5);
    expect(emptyDay.querySelector(".calendar-empty-mark")).not.toBeNull();
    expect(emptyDay.querySelector(".calendar-coffee-count")).toBeNull();

    const today = getDayCell(container, 28);
    expect(today.className).toContain("calendar-day-cell-today");
    expect(today.querySelector(".calendar-workout-chip")).not.toBeNull();
    expect(today.querySelector(".calendar-coffee-count")?.textContent).toContain("2");
  });
});
