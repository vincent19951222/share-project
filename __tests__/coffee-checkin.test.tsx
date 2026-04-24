import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import type { CoffeeSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function snapshot(cups: number): CoffeeSnapshot {
  return {
    members: [{ id: "u1", name: "li", avatarKey: "male1" }],
    gridData: [[{ cups: 0 }, { cups }]],
    today: 2,
    totalDays: 2,
    currentUserId: "u1",
    stats: {
      todayTotalCups: cups,
      todayDrinkers: cups > 0 ? 1 : 0,
      currentUserTodayCups: cups,
      coffeeKing: cups > 0 ? { userId: "u1", name: "li", cups } : null,
    },
  };
}

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function mockCoffeeFetch({
  stateSnapshots = [],
  addSnapshots = [],
  removeSnapshots = [],
  coffeeEvents = [],
}: {
  stateSnapshots?: CoffeeSnapshot[];
  addSnapshots?: CoffeeSnapshot[];
  removeSnapshots?: CoffeeSnapshot[];
  coffeeEvents?: Array<{
    id: string;
    type: string;
    text: string;
    assetAwarded: number | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatarKey: string;
    };
  }>;
}) {
  const stateQueue = [...stateSnapshots];
  const addQueue = [...addSnapshots];
  const removeQueue = [...removeSnapshots];

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/activity-events?kind=coffee") {
        return Promise.resolve(createJsonResponse({ events: coffeeEvents }));
      }

      if (url === "/api/coffee/state" && method === "GET") {
        const nextSnapshot = stateQueue.shift();
        if (!nextSnapshot) {
          throw new Error("Unexpected /api/coffee/state call");
        }
        return Promise.resolve(createJsonResponse({ snapshot: nextSnapshot }));
      }

      if (url === "/api/coffee/cups" && method === "POST") {
        const nextSnapshot = addQueue.shift();
        if (!nextSnapshot) {
          throw new Error("Unexpected /api/coffee/cups call");
        }
        return Promise.resolve(createJsonResponse({ snapshot: nextSnapshot }));
      }

      if (url === "/api/coffee/cups/latest" && method === "DELETE") {
        const nextSnapshot = removeQueue.shift();
        if (!nextSnapshot) {
          throw new Error("Unexpected /api/coffee/cups/latest call");
        }
        return Promise.resolve(createJsonResponse({ snapshot: nextSnapshot }));
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    }),
  );
}

describe("CoffeeCheckin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads coffee state and can add or remove today's cups", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    mockCoffeeFetch({
      stateSnapshots: [snapshot(0)],
      addSnapshots: [snapshot(1)],
      removeSnapshots: [snapshot(0)],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("今日咖啡小票");
    expect(container.textContent).toContain("今天还没续命");

    const removeButtonAtZero = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect((removeButtonAtZero as HTMLButtonElement | undefined)?.disabled).toBe(true);

    const addButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("+1 杯"),
    );
    expect(addButton).toBeDefined();

    await act(async () => {
      addButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "calendar:refresh" }));
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "activity-events:refresh" }));
    expect(container.textContent).toContain("我的今日杯数");
    expect(
      container.querySelector('img[src*="/assets/icons/coffee-pixel.svg"]'),
    ).not.toBeNull();

    const removeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect(removeButton).toBeDefined();
    expect((removeButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      removeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups/latest",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "calendar:refresh" }));
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "activity-events:refresh" }));
  });

  it("shows an actionable error when the initial coffee state is unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "未登录" }),
      }),
    );

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("咖啡小票没打出来");
    expect(container.textContent).toContain("登录状态过期，请重新登录。");
    expect(container.textContent).toContain("重新登录");
    expect(container.textContent).not.toContain("正在打印今日咖啡小票");
  });

  it("asks for confirmation before adding the first cup from the calendar", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(0)],
      addSnapshots: [snapshot(1)],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    const calendarAddButton = container.querySelector(
      'button[aria-label="确认今天咖啡打卡"]',
    );
    expect(calendarAddButton).toBeDefined();

    await act(async () => {
      calendarAddButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("确认今天喝咖啡？");
    expect(fetch).toHaveBeenCalledTimes(2);

    const dialog = container.querySelector('[role="dialog"]');
    const confirmButton = Array.from(dialog!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认 1 杯"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("今天已续命 1 杯");
  });

  it("uses the pixel coffee icon for checked-in team calendar cells", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(2)],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    const coffeeCalendarIcons = container.querySelectorAll(
      'img[src*="/assets/icons/coffee-pixel.svg"]',
    );

    expect(coffeeCalendarIcons.length).toBeGreaterThan(0);
  });

  it("lets the calendar dialog add or remove cups after coffee is already checked in", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(2)],
      addSnapshots: [snapshot(3)],
      removeSnapshots: [snapshot(2)],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    const calendarAdjustButton = container.querySelector(
      'button[aria-label="调整今天咖啡杯数"]',
    );
    expect(calendarAdjustButton).toBeDefined();

    await act(async () => {
      calendarAdjustButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("调整今天的杯数");
    expect(container.textContent).toContain("当前记录 2 杯");

    let dialog = container.querySelector('[role="dialog"]');
    const addCupButton = Array.from(dialog!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("+1 杯"),
    );
    expect(addCupButton).toBeDefined();

    await act(async () => {
      addCupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("今天已续命 3 杯");

    await act(async () => {
      container
        .querySelector('button[aria-label="调整今天咖啡杯数"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    dialog = container.querySelector('[role="dialog"]');
    const removeCupButton = Array.from(dialog!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("-1 杯"),
    );
    expect(removeCupButton).toBeDefined();

    await act(async () => {
      removeCupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups/latest",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(container.textContent).toContain("今天已续命 2 杯");
  });

  it("renders coffee activity events with the same realtime feed shape", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(1)],
      coffeeEvents: [
        {
          id: "coffee-1",
          type: "COFFEE_ADD",
          text: "li 续命 1 杯，今日累计 1 杯",
          assetAwarded: null,
          createdAt: "2026-04-23T01:18:00.000Z",
          user: {
            id: "u1",
            name: "li",
            avatarKey: "male1",
          },
        },
      ],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("实时动态");

    const feed = container.querySelector('[aria-label="咖啡实时动态"]');
    expect(feed).not.toBeNull();

    expect(feed!.textContent).toContain("已同步");
    expect(feed!.textContent).toContain("li 续命 1 杯，今日累计 1 杯");
    expect(feed!.querySelectorAll("img")).toHaveLength(1);
  });

  it("shows an empty live feed when there is no coffee check-in today", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(0)],
      coffeeEvents: [],
    });

    await act(async () => {
      root.render(<CoffeeCheckin />);
      await Promise.resolve();
    });

    const feed = container.querySelector('[aria-label="咖啡实时动态"]');
    expect(feed).not.toBeNull();
    expect(feed!.querySelectorAll("img")).toHaveLength(0);
    expect(feed!.textContent).toContain("今天还没有咖啡打卡");
  });
});
