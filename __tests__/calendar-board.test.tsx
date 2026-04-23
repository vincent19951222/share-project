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
            { day: 2, workedOut: false, coffeeCups: 2 },
          ]),
        }),
      });
      await currentMonthRequest.promise;
    });

    await waitFor(() => {
      expect(container.textContent).toContain("牛马日历");
      expect(container.textContent).toContain("2026年4月");
      expect(container.textContent).toContain("本月练了 1 天");
      expect(container.textContent).toContain("本月喝了 2 杯");
      expect(container.textContent).not.toContain("回到本月");
      expect(container.querySelectorAll("img[alt='']").length).toBe(2);
      expect(container.querySelectorAll("img[alt='咖啡记录']").length).toBe(0);
    });

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
      expect(container.textContent).toContain("本月练了 1 天");
      expect(container.textContent).toContain("本月喝了 2 杯");
      expect(container.textContent).not.toContain("回到本月");
      expect(container.textContent).not.toContain("详情");
      expect(container.textContent).not.toContain("查看明细");
    });
  });
});
