import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrinkCheckin } from "@/components/drink-checkin/DrinkCheckin";
import { DrinkProvider } from "@/lib/drink-store";
import type { DrinkSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const snapshot: DrinkSnapshot = {
  members: [{ id: "u1", name: "li", avatarKey: "male1" }],
  gridData: [[{ cups: 0, drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 } }]],
  today: 1,
  totalDays: 1,
  currentUserId: "u1",
  todayEvents: [],
  stats: {
    todayTotalCups: 0,
    todayDrinkers: 0,
    currentUserTodayCups: 0,
    drinkKing: null,
    favoriteDrink: null,
    latestDrink: null,
    drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
  },
};

const updatedSnapshot: DrinkSnapshot = {
  ...snapshot,
  todayEvents: [
    {
      id: "d1",
      userId: "u1",
      userName: "li",
      avatarKey: "male1",
      drinkType: "water",
      time: "08:42",
      note: "测试备注",
      createdAt: "2026-06-02T00:42:00.000Z",
    },
  ],
  stats: {
    ...snapshot.stats,
    todayTotalCups: 1,
    currentUserTodayCups: 1,
    latestDrink: {
      id: "d1",
      userId: "u1",
      userName: "li",
      avatarKey: "male1",
      drinkType: "water",
      time: "08:42",
      note: "测试备注",
      createdAt: "2026-06-02T00:42:00.000Z",
    },
    drinkCounts: { ...snapshot.stats.drinkCounts, water: 1 },
  },
};

describe("DrinkCheckin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.pushState({}, "", "/drink");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens a confirmation ticket and posts the edited drink note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/drinks/state" && method === "GET") {
          return Promise.resolve(createJsonResponse({ snapshot }));
        }

        if (url === "/api/drinks/records" && method === "POST") {
          return Promise.resolve(createJsonResponse({ snapshot: updatedSnapshot }));
        }

        if (url === "/api/activity-events?kind=drink") {
          return Promise.resolve(createJsonResponse({ events: [] }));
        }

        throw new Error(`Unexpected fetch: ${method} ${url}`);
      }),
    );

    await act(async () => {
      root.render(
        <DrinkProvider>
          <DrinkCheckin />
        </DrinkProvider>,
      );
      await Promise.resolve();
    });

    const addWater = container.querySelector<HTMLButtonElement>('button[aria-label="增加一杯水"]');
    expect(addWater).not.toBeNull();

    await act(async () => {
      addWater?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("确认记录一杯");

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[name="drink-note"]');
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea!.value = "测试备注";
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const confirm = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认入账"),
    );

    await act(async () => {
      confirm?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ drinkType: "water", note: "测试备注" }),
      }),
    );
  });
});
