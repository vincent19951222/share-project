import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import type { CalendarMonthSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function buildSnapshot(
  monthKey: string,
  currentMonthKey: string,
  days: CalendarMonthSnapshot["days"],
): CalendarMonthSnapshot {
  return {
    monthKey,
    currentMonthKey,
    todayDay: monthKey === currentMonthKey ? 23 : null,
    totalDays: 30,
    workoutDays: days.filter((day) => day.workedOut).length,
    coffeeCupTotal: days.reduce((sum, day) => sum + day.coffeeCups, 0),
    days,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

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

async function clickButtonByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  expect(button).toBeDefined();

  await act(async () => {
    button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function clickDayCell(cell: HTMLElement) {
  await act(async () => {
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getDayCell(container: HTMLElement, day: number) {
  const cell = Array.from(container.querySelectorAll(".calendar-day-cell")).find((candidate) => {
    const firstText = candidate.querySelector("span")?.textContent?.trim();
    return firstText === String(day);
  });

  expect(cell).toBeDefined();
  return cell as HTMLElement;
}

function getVisibleState(container: HTMLElement) {
  return {
    monthLabel: container.textContent?.match(/20\d{2}年\d{1,2}月/)?.[0] ?? null,
    workoutSummary: container.textContent?.match(/本月练了 \d+ 天/)?.[0] ?? null,
    coffeeSummary: container.textContent?.match(/本月喝了 \d+ 杯/)?.[0] ?? null,
    buttonLabels: Array.from(container.querySelectorAll("button")).map((button) => button.textContent),
  };
}

describe("CalendarBoard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("loads the current month, reuses cached current month data, and renders repeated coffee icons", async () => {
    const currentMonthRequest = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: CalendarMonthSnapshot }>;
    }>();
    const previousMonthRequest = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: CalendarMonthSnapshot }>;
    }>();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockReturnValueOnce(currentMonthRequest.promise)
        .mockReturnValueOnce(previousMonthRequest.promise),
    );

    await act(async () => {
      root.render(<CalendarBoard />);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/calendar/state",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );

    await act(async () => {
      currentMonthRequest.resolve({
        ok: true,
        json: async () => ({
          snapshot: buildSnapshot("2026-04", "2026-04", [
            { day: 1, workedOut: true, coffeeCups: 0 },
            { day: 2, workedOut: true, coffeeCups: 2 },
          ]),
        }),
      });
      await currentMonthRequest.promise;
    });

    await waitFor(() => {
      expect(container.textContent).toContain("牛马日历");
      expect(container.textContent).toContain("2026年4月");
      expect(container.textContent).toContain("本月练了 2 天");
      expect(container.textContent).toContain("本月喝了 2 杯");
      expect(container.textContent).not.toContain("回到本月");
      expect(container.querySelectorAll("button")).toHaveLength(1);
      expect(
        Array.from(container.querySelectorAll("button")).some((button) =>
          button.textContent?.includes("下个月"),
        ),
      ).toBe(false);
      expect(container.textContent).not.toContain("下个月");
      expect(container.querySelectorAll("img[alt='']").length).toBe(2);
      expect(
        getDayCell(container, 2).querySelectorAll('img[src*="/assets/icons/coffee-pixel.svg"]')
          .length,
      ).toBe(2);
      expect(container.querySelectorAll("img[alt='咖啡记录']").length).toBe(0);
      expect(getDayCell(container, 1).textContent).toContain("1");
      expect(getDayCell(container, 1).querySelector("[aria-label='已训练']")).not.toBeNull();
      expect(getDayCell(container, 1).querySelectorAll("img[alt='']").length).toBe(0);
      expect(getDayCell(container, 2).textContent).toContain("2");
      expect(getDayCell(container, 2).querySelector("[aria-label='已训练']")).not.toBeNull();
      expect(getDayCell(container, 2).querySelectorAll("img[alt='']").length).toBe(2);
      expect(getDayCell(container, 4).textContent).toContain("4");
      expect(getDayCell(container, 4).querySelector("[aria-label='已训练']")).toBeNull();
      expect(getDayCell(container, 4).querySelectorAll("img[alt='']").length).toBe(0);
    });

    const visibleStateBeforeCellClick = getVisibleState(container);
    await clickDayCell(getDayCell(container, 2));

    expect(getVisibleState(container)).toEqual(visibleStateBeforeCellClick);

    await clickButtonByText(container, "上个月");

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/calendar/state?month=2026-03",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );

    await act(async () => {
      previousMonthRequest.resolve({
        ok: true,
        json: async () => ({
          snapshot: buildSnapshot("2026-03", "2026-04", [
            { day: 1, workedOut: true, coffeeCups: 0 },
            { day: 2, workedOut: false, coffeeCups: 2 },
            { day: 3, workedOut: true, coffeeCups: 1 },
          ]),
        }),
      });
      await previousMonthRequest.promise;
    });

    await waitFor(() => {
      expect(container.textContent).toContain("2026年3月");
      expect(container.textContent).toContain("本月练了 2 天");
      expect(container.textContent).toContain("本月喝了 3 杯");
      expect(container.textContent).toContain("回到本月");
      expect(container.querySelectorAll("img[alt='']").length).toBe(3);
    });

    await clickButtonByText(container, "回到本月");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(container.textContent).toContain("2026年4月");
      expect(container.textContent).toContain("本月练了 2 天");
      expect(container.textContent).toContain("本月喝了 2 杯");
      expect(container.textContent).not.toContain("回到本月");
      expect(container.textContent).not.toContain("详情");
      expect(container.textContent).not.toContain("查看明细");
    });
  });

  it("refreshes the current month snapshot when coffee data changes", async () => {
    const initialRequest = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: CalendarMonthSnapshot }>;
    }>();
    const refreshRequest = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: CalendarMonthSnapshot }>;
    }>();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(initialRequest.promise).mockReturnValueOnce(refreshRequest.promise),
    );

    await act(async () => {
      root.render(<CalendarBoard />);
    });

    await act(async () => {
      initialRequest.resolve({
        ok: true,
        json: async () => ({
          snapshot: buildSnapshot("2026-04", "2026-04", [
            { day: 1, workedOut: false, coffeeCups: 1 },
          ]),
        }),
      });
      await initialRequest.promise;
    });

    await waitFor(() => {
      expect(container.textContent).toContain("本月喝了 1 杯");
      expect(getDayCell(container, 1).querySelectorAll("img[alt='']").length).toBe(1);
    });

    await act(async () => {
      window.dispatchEvent(new Event("calendar:refresh"));
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/calendar/state?month=2026-04",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );

    await act(async () => {
      refreshRequest.resolve({
        ok: true,
        json: async () => ({
          snapshot: buildSnapshot("2026-04", "2026-04", [
            { day: 1, workedOut: false, coffeeCups: 2 },
          ]),
        }),
      });
      await refreshRequest.promise;
    });

    await waitFor(() => {
      expect(container.textContent).toContain("本月喝了 2 杯");
      expect(getDayCell(container, 1).querySelectorAll("img[alt='']").length).toBe(2);
    });
  });
});
