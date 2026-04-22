import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const initialState: BoardState = {
  members: [
    { id: "user-1", name: "Li", avatarKey: "male1" },
    { id: "user-2", name: "Luo", avatarKey: "male2" },
  ],
  gridData: [[false], [false]],
  teamCoins: 0,
  targetCoins: 100,
  today: 1,
  totalDays: 1,
  logs: [],
  activeTab: "punch",
  currentUserId: "user-1",
};

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
});
