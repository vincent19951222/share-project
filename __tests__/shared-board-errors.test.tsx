import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const activeBoardState: BoardState = {
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
  activeTab: "board",
  currentUserId: "user-1",
};

function createJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe("SharedBoard error copy", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ notes: [] }))
      .mockResolvedValueOnce(createJsonResponse({ error: "server error" }, false)));

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
  });

  it("shows a readable publish error message when note creation fails", async () => {
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

      setValue?.call(textarea, "今晚八点一起练");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("发布失败，请稍后再试");
  });
});
