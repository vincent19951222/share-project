import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const boardState: BoardState = {
  members: [
    { id: "user-1", name: "Li", avatarKey: "male1" },
    { id: "user-2", name: "Luo", avatarKey: "male2" },
  ],
  gridData: [[true, false], [false, false]],
  teamVaultTotal: 88,
  currentUser: {
    assetBalance: 18,
    currentStreak: 3,
    nextReward: 10,
    seasonIncome: 18,
    isAdmin: false,
  },
  activeSeason: null,
  today: 2,
  totalDays: 2,
  currentUserId: "user-1",
  logs: [],
  activeTab: "punch",
};

const dispatch = vi.fn();

vi.mock("@/lib/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/store")>()),
  useBoard: () => ({ state: boardState, dispatch }),
}));

describe("home punch scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    dispatch.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ events: [] }),
      }),
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

  it("renders the punch board inside the managed gym scene foundation", async () => {
    const { PunchBoard } = await import("@/components/punch-board/PunchBoard");

    await act(async () => {
      root.render(<PunchBoard />);
    });

    const scene = container.querySelector(".punch-scene");
    const content = container.querySelector(".punch-scene-content");
    const sceneImageSources = Array.from(container.querySelectorAll(".punch-scene img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(scene).not.toBeNull();
    expect(scene?.getAttribute("aria-label")).toBe("健身打卡训练室");
    expect(container.querySelector(".punch-scene-background")).not.toBeNull();
    expect(container.querySelector(".punch-scene-props")).not.toBeNull();
    expect(content).not.toBeNull();
    expect(content?.querySelector(".team-header")).not.toBeNull();
    expect(content?.querySelector(".team-header-bulletin")).not.toBeNull();
    expect(content?.querySelector(".team-header-vault-note")).not.toBeNull();
    expect(content?.querySelector(".team-header-ledger")).not.toBeNull();
    expect(content?.querySelectorAll(".team-header-pin")).toHaveLength(4);
    expect(content?.querySelector(".heatmap-shell")).not.toBeNull();
    expect(content?.querySelector(".activity-stream")).not.toBeNull();
    expect(content?.querySelector(".activity-stream-console")).not.toBeNull();
    expect(content?.querySelector(".activity-stream-header")).not.toBeNull();
    expect(content?.querySelector(".activity-stream-list")).not.toBeNull();
    expect(content?.querySelector(".activity-stream-empty")).not.toBeNull();
    expect(sceneImageSources).toEqual(
      expect.arrayContaining([
        "/assets/home-scenes/punch/gym-wall-bg.webp",
        "/assets/home-scenes/punch/gym-floor-strip.webp",
        "/assets/home-scenes/punch/poster-no-pain.webp",
        "/assets/home-scenes/punch/poster-believe.webp",
        "/assets/home-scenes/punch/stopwatch-keep-going.webp",
        "/assets/home-scenes/punch/dumbbell-corner.webp",
        "/assets/home-scenes/punch/towel-bar.webp",
      ]),
    );
  });
});
