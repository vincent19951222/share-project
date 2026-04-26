import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const dispatch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      members: [{ id: "u1", name: "li", avatarKey: "male1" }],
      gridData: [[false]],
      teamVaultTotal: 0,
      currentUser: {
        assetBalance: 0,
        currentStreak: 0,
        nextReward: 10,
        seasonIncome: 0,
        isAdmin: false,
      },
      activeSeason: null,
      today: 1,
      totalDays: 1,
      currentUserId: "u1",
      logs: [],
      activeTab: "punch",
    },
    dispatch,
  }),
}));

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("TeamDynamicsBell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          unreadCount: 2,
          items: [
            {
              id: "dyn-1",
              type: "SEASON_STARTED",
              title: "新赛季已经开启：五月脱脂挑战",
              summary: "五月脱脂挑战 - 80 格冲刺已经开始",
              occurredAt: "2026-04-25T08:00:00.000Z",
              payload: {},
              isRead: false,
              importance: "normal",
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows unread count on the bell and opens the preview panel", async () => {
    await act(async () => {
      root.render(<Navbar />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("2");

    const bellButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.getAttribute("aria-label")?.includes("团队动态"),
    );
    expect(bellButton).toBeDefined();

    await act(async () => {
      bellButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("查看全部动态");
    expect(container.textContent).toContain("新赛季已经开启：五月脱脂挑战");
  });

  it("ignores preview fetch failures in environments without a live api", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await act(async () => {
      root.render(<Navbar />);
      await Promise.resolve();
    });

    expect(container.querySelector(".team-dynamics-bell-badge")).toBeNull();
  });
});
