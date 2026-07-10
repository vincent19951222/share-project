import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyAiImageStudioPanel } from "@/components/gamification/production/SupplyAiImageStudioPanel";
import type { SupplyAiImageSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: SupplyAiImageSnapshot = {
  wallet: {
    coins: 800,
    generationCostPerImage: 10,
    themeDrawCost: 200,
  },
  themes: {
    unlocked: [
      {
        id: "theme-01",
        name: "牛马像素馆",
        description: "像素风",
        previewImageUrl: "https://example.com/theme.png",
        defaultUnlocked: true,
        unlocked: true,
        enabled: true,
        sortOrder: 1,
        tag: "像素",
        palette: ["#fde047"],
      },
      {
        id: "theme-02",
        name: "深夜健身房",
        description: "霓虹风",
        previewImageUrl: "https://example.com/theme-2.png",
        defaultUnlocked: true,
        unlocked: true,
        enabled: true,
        sortOrder: 2,
        tag: "霓虹",
        palette: ["#1d4ed8"],
      },
    ],
    locked: [],
    allUnlocked: true,
  },
  recentTasks: [
    {
      id: "task-1",
      themeId: "theme-01",
      userPrompt: "训练后海报",
      requestedCount: 2,
      status: "partial",
      coinCost: 20,
      refundedCoinAmount: 0,
      errorMessage: "有一张失败",
      retryAvailable: true,
      createdAt: "2026-07-06T08:00:00.000Z",
      updatedAt: "2026-07-06T08:05:00.000Z",
      items: [
        {
          id: "item-1",
          index: 0,
          status: "completed",
          imageUrl: "https://example.com/artwork-1.png",
          errorMessage: null,
        },
        {
          id: "item-2",
          index: 1,
          status: "failed",
          imageUrl: null,
          errorMessage: "provider timeout",
        },
      ],
    },
  ],
  recentArtworks: [
    {
      id: "artwork-1",
      taskId: "task-1",
      itemId: "item-1",
      themeId: "theme-01",
      imageUrl: "https://example.com/artwork-1.png",
      createdAt: "2026-07-06T08:05:00.000Z",
    },
  ],
};

function createFile(name: string, content: string, type = "image/png") {
  return new File([content], name, { type });
}

async function flushAsyncState() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function expandComposer(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-composer-collapsed-input']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function cloneSnapshot(overrides: Partial<SupplyAiImageSnapshot> = {}): SupplyAiImageSnapshot {
  return {
    ...snapshot,
    ...overrides,
    wallet: { ...snapshot.wallet, ...overrides.wallet },
    themes: { ...snapshot.themes, ...overrides.themes },
    recentTasks: overrides.recentTasks ?? snapshot.recentTasks,
    recentArtworks: overrides.recentArtworks ?? snapshot.recentArtworks,
  };
}

describe("SupplyAiImageStudioPanel", () => {
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
    vi.restoreAllMocks();
  });

  it("renders the phase 1 workspace as a theme masonry and chat control deck", () => {
    const onCreateTask = vi.fn();

    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={onCreateTask}
          onRetryTask={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("牛马像素馆");
    expect(container.textContent).toContain("深夜健身房");
    expect(container.textContent).toContain("对话流");
    const masonryViewport = container.querySelector("[data-testid='supply-theme-masonry']");
    const masonryColumns = container.querySelector("[data-testid='supply-theme-masonry-columns']");

    expect(masonryViewport?.className).toContain("xl:overflow-y-auto");
    expect(masonryViewport?.className).not.toContain("columns-1");
    expect(masonryColumns?.className).toContain("columns-1");
    expect(masonryColumns?.className).toContain("lg:columns-3");
    expect(container.querySelectorAll("[data-testid='supply-theme-card']")).toHaveLength(2);
    expect(container.querySelector("[data-testid='supply-creation-control-deck']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-desktop-task-history']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-desktop-task-history']")?.textContent).toContain("任务队列");
    expect(container.querySelector("[data-testid='supply-creation-composer']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-composer-collapsed-input']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-expanded-creation-panel']")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("input[type='file']")).toBeNull();
    expect(container.textContent).toContain("上传参考图，描述想要的作品");
    expect(container.textContent).toContain("重新生成失败项");
  });

  it("expands the bottom composer only after the user clicks it and collapses it from the chat flow", async () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    const composer = container.querySelector<HTMLElement>("[data-testid='supply-creation-composer']");
    const chatFlow = container.querySelector<HTMLElement>("[data-testid='supply-creation-chat-flow']");
    const collapsedInput = composer?.querySelector<HTMLButtonElement>("[data-testid='supply-composer-collapsed-input']");

    expect(composer).not.toBeNull();
    expect(chatFlow).not.toBeNull();
    expect(collapsedInput?.textContent).toContain("上传参考图，描述想要的作品");
    expect(composer?.querySelector("[data-testid='supply-expanded-creation-panel']")).toBeNull();
    expect(composer?.querySelector("input[type='file']")).toBeNull();
    expect(composer?.querySelector("textarea")).toBeNull();
    expect(composer?.querySelector("[data-action='create-ai-image-task']")).toBeNull();

    await act(async () => {
      collapsedInput?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const expandedPanel = composer?.querySelector<HTMLElement>("[data-testid='supply-expanded-creation-panel']");
    expect(expandedPanel).not.toBeNull();
    expect(expandedPanel?.textContent).toContain("添加参考图");
    expect(expandedPanel?.textContent).toContain("补充要求");
    expect(expandedPanel?.textContent).toContain("可选");
    expect(expandedPanel?.querySelector("input[type='file']")).not.toBeNull();
    expect(expandedPanel?.querySelector("textarea")).not.toBeNull();
    expect(expandedPanel?.querySelector("[data-action='create-ai-image-task']")?.textContent).toContain(
      "10银子 生成 1 张",
    );
    expect(expandedPanel?.querySelector("[data-testid='supply-reference-upload-zone']")?.className).toContain("p-1.5");
    expect(expandedPanel?.querySelector("[data-testid='supply-reference-upload-empty']")?.className).toContain("min-h-[40px]");
    expect(expandedPanel?.querySelector("[data-testid='supply-reference-upload-plus']")?.className).toContain("h-9");

    await act(async () => {
      chatFlow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(composer?.querySelector("[data-testid='supply-expanded-creation-panel']")).toBeNull();
    expect(composer?.querySelector("[data-testid='supply-composer-collapsed-input']")).not.toBeNull();
  });

  it("lets masonry theme images keep their natural height instead of forcing preset ratios", () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-testid='supply-theme-card']"));
    const mediaFrames = cards.map((card) => card.firstElementChild as HTMLDivElement | null);
    const images = cards.map((card) => card.querySelector<HTMLImageElement>("img"));

    expect(mediaFrames).toHaveLength(2);
    expect(mediaFrames.every((frame) => frame?.style.aspectRatio === "")).toBe(true);
    expect(images.every((image) => image?.className.includes("h-auto"))).toBe(true);
    expect(images.every((image) => image?.className.includes("absolute"))).toBe(false);
  });

  it("constrains the desktop workbench so the masonry column scrolls independently and the control deck fits the viewport", () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    const panel = container.querySelector<HTMLElement>(".supply-ai-image-studio-panel");
    const grid = panel?.firstElementChild as HTMLElement | null;
    const masonry = container.querySelector<HTMLElement>("[data-testid='supply-theme-masonry']");
    const masonryColumns = container.querySelector<HTMLElement>("[data-testid='supply-theme-masonry-columns']");
    const leftRail = masonry?.parentElement;
    const deck = container.querySelector<HTMLElement>("[data-testid='supply-creation-control-deck']");

    expect(panel?.className).toContain("xl:h-[calc(100dvh-8rem)]");
    expect(panel?.className).toContain("xl:overflow-hidden");
    expect(grid?.className).toContain("xl:h-full");
    expect(grid?.className).toContain("xl:min-h-0");
    expect(leftRail?.className).toContain("xl:flex");
    expect(leftRail?.className).toContain("xl:h-full");
    expect(leftRail?.className).toContain("xl:min-h-0");
    expect(leftRail?.className).toContain("xl:overflow-hidden");
    expect(masonry?.className).toContain("xl:flex-1");
    expect(masonry?.className).toContain("xl:overflow-y-auto");
    expect(masonry?.className).not.toContain("columns-1");
    expect(masonryColumns?.className).toContain("columns-1");
    expect(masonryColumns?.className).toContain("lg:columns-3");
    expect(deck?.className).toContain("xl:h-full");
    expect(deck?.className).not.toContain("xl:sticky");
    expect(deck?.className).not.toContain("xl:top-20");
    expect(container.querySelector("[data-testid='supply-creation-chat-flow']")?.className).toContain("flex-1");
    expect(container.querySelector("[data-testid='supply-creation-composer']")?.className).toContain("shrink-0");
  });

  it("keeps the collapsed composer pinned when a new queued task enters the chat history", () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={cloneSnapshot({
            recentTasks: [
              {
                id: "task-queued",
                themeId: "theme-02",
                userPrompt: "",
                requestedCount: 1,
                status: "queued",
                coinCost: 10,
                refundedCoinAmount: 0,
                errorMessage: null,
                retryAvailable: false,
                createdAt: "2026-07-07T13:54:00.000Z",
                updatedAt: "2026-07-07T13:54:00.000Z",
                items: [
                  {
                    id: "item-queued",
                    index: 0,
                    status: "queued",
                    imageUrl: null,
                    errorMessage: null,
                  },
                ],
              },
              ...snapshot.recentTasks,
            ],
          })}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    const deck = container.querySelector<HTMLElement>("[data-testid='supply-creation-control-deck']");
    const chatFlow = container.querySelector<HTMLElement>("[data-testid='supply-creation-chat-flow']");
    const composer = container.querySelector<HTMLElement>("[data-testid='supply-creation-composer']");

    expect(container.textContent).toContain("排队中");
    expect(deck?.className).toContain("h-[calc(100dvh-8rem)]");
    expect(deck?.className).toContain("max-h-[820px]");
    expect(deck?.className).toContain("overflow-hidden");
    expect(chatFlow?.className).toContain("min-h-0");
    expect(chatFlow?.className).toContain("flex-1");
    expect(chatFlow?.className).toContain("overflow-y-auto");
    expect(composer?.className).toContain("shrink-0");
    expect(composer?.querySelector("[data-testid='supply-composer-collapsed-input']")).not.toBeNull();
  });

  it("converts uploaded files to data urls, submits payload, and clears local inputs after success", async () => {
    const onCreateTask = vi.fn().mockResolvedValue(undefined);

    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={onCreateTask}
          onRetryTask={vi.fn()}
        />,
      );
    });

    await expandComposer(container);

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");

    expect(input).not.toBeNull();
    expect(textarea).not.toBeNull();

    const firstFile = createFile("pose.png", "pose");
    const secondFile = createFile("light.png", "light");

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [firstFile, secondFile],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      textarea!.value = "来一张训练后像素海报";
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "4")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-action='create-ai-image-task']")?.textContent).toContain(
      "40银子 生成 4 张",
    );

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onCreateTask).toHaveBeenCalledWith({
      themeId: "theme-01",
      requestedCount: 4,
      userPrompt: "来一张训练后像素海报",
      referenceImages: [
        expect.objectContaining({
          filename: "pose.png",
          dataUrl: expect.stringContaining("data:image/png;base64,"),
        }),
        expect.objectContaining({
          filename: "light.png",
          dataUrl: expect.stringContaining("data:image/png;base64,"),
        }),
      ],
    });

    expect(container.textContent).not.toContain("pose.png");
    expect(container.textContent).not.toContain("light.png");
    expect(container.querySelector("[data-testid='supply-expanded-creation-panel']")).toBeNull();
    expect(container.querySelector("[data-testid='supply-composer-collapsed-input']")).not.toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("keeps prompt and reference images after a failed create attempt", async () => {
    const onCreateTask = vi.fn().mockRejectedValue(new Error("create failed"));

    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={onCreateTask}
          onRetryTask={vi.fn()}
        />,
      );
    });

    await expandComposer(container);

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");

    expect(input).not.toBeNull();
    expect(textarea).not.toBeNull();

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [createFile("keep.png", "keep")],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushAsyncState();

    await act(async () => {
      textarea!.value = "失败后也要保留";
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      await expect(
        (async () => {
          container
            .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          await Promise.resolve();
        })(),
      ).resolves.toBeUndefined();
    });

    expect(onCreateTask).toHaveBeenCalledTimes(1);
    expect(textarea?.value).toBe("失败后也要保留");
    expect(container.textContent).toContain("keep.png");
    expect(container.querySelector("[data-testid='supply-expanded-creation-panel']")).not.toBeNull();
  });

  it("caps uploads at three and deleting one duplicate filename only removes the clicked item", async () => {
    const onCreateTask = vi.fn().mockResolvedValue(undefined);

    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={onCreateTask}
          onRetryTask={vi.fn()}
        />,
      );
    });

    await expandComposer(container);

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();

    const firstDuplicate = createFile("same.png", "first");
    const secondDuplicate = createFile("same.png", "second");
    const thirdFile = createFile("other.png", "third");
    const droppedByCap = createFile("extra.png", "fourth");

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [firstDuplicate, secondDuplicate, thirdFile, droppedByCap],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushAsyncState();

    const rowsBeforeDelete = Array.from(container.querySelectorAll<HTMLElement>("[data-reference-image-id]"));
    expect(rowsBeforeDelete).toHaveLength(3);
    expect(rowsBeforeDelete.filter((node) => node.textContent?.includes("same.png"))).toHaveLength(2);
    expect(rowsBeforeDelete.filter((node) => node.textContent?.includes("other.png"))).toHaveLength(1);
    expect(rowsBeforeDelete.filter((node) => node.textContent?.includes("extra.png"))).toHaveLength(0);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .filter((button) => button.textContent === "删除")[0]
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const rowsAfterDelete = Array.from(container.querySelectorAll<HTMLElement>("[data-reference-image-id]"));
    expect(rowsAfterDelete).toHaveLength(2);
    expect(rowsAfterDelete.filter((node) => node.textContent?.includes("same.png"))).toHaveLength(1);
    expect(rowsAfterDelete.filter((node) => node.textContent?.includes("other.png"))).toHaveLength(1);
    expect(rowsAfterDelete.filter((node) => node.textContent?.includes("extra.png"))).toHaveLength(0);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onCreateTask).toHaveBeenCalledWith({
      themeId: "theme-01",
      requestedCount: 1,
      userPrompt: "",
      referenceImages: [
        expect.objectContaining({
          filename: "same.png",
          dataUrl: "data:image/png;base64,c2Vjb25k",
        }),
        expect.objectContaining({
          filename: "other.png",
          dataUrl: "data:image/png;base64,dGhpcmQ=",
        }),
      ],
    });
  });

  it("clears the file input value even when a new upload is rejected by the cap", async () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    await expandComposer(container);

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [
          createFile("one.png", "one"),
          createFile("two.png", "two"),
          createFile("three.png", "three"),
        ],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushAsyncState();

    Object.defineProperty(input!, "value", {
      configurable: true,
      writable: true,
      value: "C:\\fakepath\\extra.png",
    });

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [createFile("extra.png", "extra")],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(input?.value).toBe("");
    expect(container.querySelectorAll("[data-reference-image-id]")).toHaveLength(3);
    expect(container.textContent).not.toContain("extra.png");
  });

  it("replaces raw task and item backend errors with curated user-safe copy", () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={cloneSnapshot({
            recentTasks: [
              {
                ...snapshot.recentTasks[0],
                errorMessage: "provider timeout: gpt-image-2 prompt rejected",
                items: [
                  {
                    ...snapshot.recentTasks[0].items[0],
                    errorMessage: "upstream debug trace id=abc123",
                  },
                  snapshot.recentTasks[0].items[1],
                ],
              },
            ],
          })}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    expect(container.textContent).not.toContain("provider timeout: gpt-image-2 prompt rejected");
    expect(container.textContent).not.toContain("upstream debug trace id=abc123");
    expect(container.textContent).not.toContain("provider timeout");
    expect(container.textContent).toContain("任务有未完成的图片，可直接重试。");
    expect(container.textContent).toContain("这张图片暂时没出图，重试后会重新排队。");
  });

  it("opens completed task images in a preview dialog that closes from the button or backdrop", async () => {
    act(() => {
      root.render(
        <SupplyAiImageStudioPanel
          snapshot={snapshot}
          onCreateTask={vi.fn()}
          onRetryTask={vi.fn()}
        />,
      );
    });

    expect(container.querySelector("[role='dialog']")).toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='preview-ai-image-result']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector<HTMLElement>("[role='dialog']");
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.querySelector("img")?.getAttribute("src")).toBe("https://example.com/artwork-1.png");
    expect(dialog?.querySelector("img")?.getAttribute("alt")).toBe("任务 task-1 结果 1");

    await act(async () => {
      dialog
        ?.querySelector<HTMLButtonElement>("[data-action='close-ai-image-preview']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='dialog']")).toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='preview-ai-image-result']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='dialog']")).not.toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLElement>("[data-testid='supply-ai-image-preview-backdrop']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
