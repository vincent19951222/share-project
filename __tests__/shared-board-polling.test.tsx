import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    { id: "user-1", name: "Li", avatarKey: "male1", assetBalance: 0, seasonIncome: 0, slotContribution: 0 },
    { id: "user-2", name: "Luo", avatarKey: "male2", assetBalance: 0, seasonIncome: 0, slotContribution: 0 },
  ],
  gridData: [[false], [false]],
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
  logs: [],
  activeTab: "punch",
  currentUserId: "user-1",
};

const activeBoardState: BoardState = {
  ...initialState,
  activeTab: "board",
};

function createJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe("SharedBoard polling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not fetch notes while the shared board tab is inactive", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    const allCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(allCalls.every((url) => url === "/api/board/state")).toBe(true);
  });

  it("shows an explicit success message after publishing a note", async () => {
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ notes: [] }))
      .mockResolvedValueOnce(createJsonResponse({
        note: {
          id: "note-1",
          type: "ANNOUNCEMENT",
          content: "今晚八点训练",
          color: null,
          pinned: false,
          createdAt: new Date().toISOString(),
          author: { id: "user-1", name: "Li", avatarKey: "male1" },
          canDelete: true,
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({ notes: [] })));

    await act(async () => {
      root.render(
        <BoardProvider initialState={activeBoardState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    const textarea = container.querySelector("textarea");
    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent?.includes("发布"),
    );

    expect(textarea).not.toBeNull();
    expect(button).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      setValue?.call(textarea, "今晚八点训练");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("已发布到共享看板");
  });
});
