import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrinkCheckin } from "@/components/drink-checkin/DrinkCheckin";
import { DrinkReceipt } from "@/components/drink-checkin/DrinkReceipt";
import { DrinkTeamGrid } from "@/components/drink-checkin/DrinkTeamGrid";
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

  it("uses an internal vertical scroll container inside the fixed board tab panel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/drinks/state") {
          return Promise.resolve(createJsonResponse({ snapshot }));
        }

        if (url === "/api/activity-events?kind=drink") {
          return Promise.resolve(createJsonResponse({ events: [] }));
        }

        throw new Error(`Unexpected fetch: ${url}`);
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

    const main = container.querySelector("main");
    expect(main?.className).toContain("h-full");
    expect(main?.className).toContain("overflow-y-auto");
    expect(main?.className).toContain("overflow-x-hidden");
    expect(container.querySelector(".drink-checkin-shell")).not.toBeNull();
    expect(container.querySelector(".drink-checkin-content")).not.toBeNull();
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

  it("keeps the confirmation ticket open when drink submission fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/drinks/state" && method === "GET") {
          return Promise.resolve(createJsonResponse({ snapshot }));
        }

        if (url === "/api/drinks/records" && method === "POST") {
          return Promise.resolve(createJsonResponse({ error: "水铺暂时离线" }, false, 500));
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
    await act(async () => {
      addWater?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirm = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认入账"),
    );
    await act(async () => {
      confirm?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("确认记录一杯");
    expect(container.textContent).toContain("水铺暂时离线");
  });

  it("shows the current user's latest drink in the receipt sidebar", async () => {
    const teamLatestSnapshot: DrinkSnapshot = {
      ...updatedSnapshot,
      todayEvents: [
        {
          id: "mine",
          userId: "u1",
          userName: "li",
          avatarKey: "male1",
          drinkType: "water",
          time: "08:42",
          note: "我的水",
          createdAt: "2026-06-02T00:42:00.000Z",
        },
        {
          id: "other",
          userId: "u2",
          userName: "luo",
          avatarKey: "male2",
          drinkType: "latte",
          time: "09:10",
          note: "队友拿铁",
          createdAt: "2026-06-02T01:10:00.000Z",
        },
      ],
      stats: {
        ...updatedSnapshot.stats,
        latestDrink: {
          id: "other",
          userId: "u2",
          userName: "luo",
          avatarKey: "male2",
          drinkType: "latte",
          time: "09:10",
          note: "队友拿铁",
          createdAt: "2026-06-02T01:10:00.000Z",
        },
      },
    };

    await act(async () => {
      root.render(
        <DrinkReceipt
          snapshot={teamLatestSnapshot}
          busy={false}
          error={null}
          onConfirmDrink={async () => true}
          onRemoveDrink={async () => {}}
        />,
      );
    });

    const statusSidebar = container.querySelector("aside");
    expect(container.querySelector(".drink-receipt-layout")).not.toBeNull();
    expect(container.querySelector(".drink-receipt-card")).not.toBeNull();
    expect(container.querySelector(".drink-options-grid")).not.toBeNull();
    expect(container.querySelector(".drink-option-card")).not.toBeNull();
    expect(container.querySelector(".drink-option-art")).not.toBeNull();
    expect(container.querySelector(".drink-option-image")).not.toBeNull();
    expect(container.querySelector(".drink-option-controls")).not.toBeNull();
    expect(container.querySelector(".drink-status-card")).not.toBeNull();
    expect(statusSidebar?.textContent).toContain("我的水");
    expect(statusSidebar?.textContent).not.toContain("队友拿铁");
  });

  it("renders the latest 7 drink days including today in the team grid", async () => {
    const gridSnapshot: DrinkSnapshot = {
      ...snapshot,
      today: 12,
      totalDays: 30,
      members: [{ id: "u1", name: "li", avatarKey: "male1" }],
      gridData: [
        Array.from({ length: 30 }, (_, index) => ({
          cups: index === 11 ? 2 : 0,
          drinkCounts: { water: index === 11 ? 2 : 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
        })),
      ],
    };

    await act(async () => {
      root.render(<DrinkTeamGrid snapshot={gridSnapshot} />);
    });

    expect(container.textContent).toContain("6日");
    expect(container.textContent).toContain("今天");
    expect(container.textContent).toContain("2");
    expect(container.textContent).not.toContain("1日2日3日");
    expect(container.querySelector(".drink-team-board")).not.toBeNull();
    expect(container.querySelector(".drink-team-scroll")).not.toBeNull();
    expect(container.querySelector(".drink-team-table")).not.toBeNull();
  });
});
