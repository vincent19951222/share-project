import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import type { BoardNoteDto } from "@/lib/board-notes";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const activeBoardState: BoardState = {
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
  activeTab: "board",
  currentUserId: "user-1",
};

const notes: BoardNoteDto[] = [
  {
    id: "note-free-1",
    type: "FREE",
    content: "今天练腿，明天照样走路。",
    color: "YELLOW",
    pinned: false,
    createdAt: new Date().toISOString(),
    author: { id: "user-1", name: "Li", avatarKey: "male1" },
    canDelete: true,
  },
  {
    id: "note-announcement-2",
    type: "ANNOUNCEMENT",
    content: "今晚八点训练，迟到加练。",
    color: null,
    pinned: false,
    createdAt: new Date().toISOString(),
    author: { id: "user-2", name: "Luo", avatarKey: "male2" },
    canDelete: false,
  },
];

function createJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe("shared board note wall scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ notes })));
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

  it("renders the office cork-board scene, clipped composer, and media props", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={activeBoardState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    expect(container.querySelector(".shared-board-scene")).not.toBeNull();
    expect(container.querySelector(".shared-board-background")).not.toBeNull();
    expect(container.querySelector(".shared-board-wall-bg")).not.toBeNull();
    expect(container.querySelector(".shared-board-props")).not.toBeNull();
    expect(container.querySelector(".shared-board-content")).not.toBeNull();
    expect(container.querySelector(".shared-board-wall-set")).not.toBeNull();
    expect(container.querySelector(".shared-board-cork")).not.toBeNull();
    expect(container.querySelector(".shared-board-composer")).not.toBeNull();
    expect(container.querySelector(".shared-board-clip")).not.toBeNull();
    expect(container.querySelector(".shared-board-type-toggle")).not.toBeNull();
    expect(container.querySelectorAll(".shared-board-color-chip")).toHaveLength(4);
    expect(container.querySelector(".sync-status-symbol")).not.toBeNull();

    const mediaSources = Array.from(container.querySelectorAll("img")).map((image) =>
      image.getAttribute("src") ?? "",
    );

    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_clipboard_clip.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_poster_no_excuses.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_poster_focus_train_win.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_discipline_note.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_dumbbell_edge.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_marker_pen.webp");
    expect(mediaSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_shared_board_paperclip.webp");
  });

  it("keeps scene props outside the content safe area and groups composer with the cork board", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={activeBoardState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    const scene = container.querySelector(".shared-board-scene");
    const background = container.querySelector(".shared-board-background");
    const props = container.querySelector(".shared-board-props");
    const content = container.querySelector(".shared-board-content");
    const wallSet = container.querySelector(".shared-board-wall-set");

    expect(scene?.children[0]).toBe(background);
    expect(scene?.children[1]).toBe(props);
    expect(scene?.children[2]).toBe(content);
    expect(content?.children[0]).toBe(wallSet);
    expect(wallSet?.querySelector(".shared-board-composer-wrap")).not.toBeNull();
    expect(wallSet?.querySelector(".shared-board-cork")).not.toBeNull();
  });

  it("renders sticky-note card hooks without changing note permissions", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={activeBoardState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    expect(container.querySelectorAll(".note-card")).toHaveLength(2);
    expect(container.querySelector(".shared-board-note-wall")).not.toBeNull();
    expect(container.querySelector(".note-free-yellow")).not.toBeNull();
    expect(container.querySelector(".note-card .note-fold")).not.toBeNull();

    const pin = container.querySelector<HTMLImageElement>(".note-free-yellow .note-pin");
    expect(pin?.getAttribute("src")).toMatch(
      /^https:\/\/vincent-1355816760\.cos\.ap-guangzhou\.myqcloud\.com\/obsidian_images\/share_project_public_assets_home_scenes_shared_board_pushpin_(red|blue|yellow)\.webp$/,
    );

    expect(container.querySelector(".note-announcement-ribbon")?.textContent).toBe("团队通告");
    expect(container.querySelector(".note-announcement-rule")).not.toBeNull();
    expect(container.querySelector("[aria-label='删除便签']")).not.toBeNull();
  });

  it("renders a board-mounted success row after publishing", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(createJsonResponse({ notes }))
      .mockResolvedValueOnce(createJsonResponse({
        note: {
          id: "note-new",
          type: "FREE",
          content: "发布到墙上",
          color: "BLUE",
          pinned: false,
          createdAt: new Date().toISOString(),
          author: { id: "user-1", name: "Li", avatarKey: "male1" },
          canDelete: true,
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({ notes }));

    await act(async () => {
      root.render(
        <BoardProvider initialState={activeBoardState}>
          <SharedBoard />
        </BoardProvider>,
      );
    });

    const textarea = container.querySelector("textarea");
    const button = Array.from(container.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("发布"),
    );

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(textarea, "发布到墙上");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".shared-board-success-row")).not.toBeNull();
    expect(container.textContent).toContain("已发布到共享看板");
  });
});
