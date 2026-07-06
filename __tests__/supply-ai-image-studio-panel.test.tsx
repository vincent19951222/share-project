import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyAiImageStudioPanel } from "@/components/gamification/production/SupplyAiImageStudioPanel";
import type { SupplyAiImageSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: SupplyAiImageSnapshot = {
  wallet: {
    coins: 800,
    generationCostPerImage: 60,
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
    ],
    locked: [],
    allUnlocked: false,
  },
  recentTasks: [
    {
      id: "task-1",
      themeId: "theme-01",
      userPrompt: "训练后海报",
      requestedCount: 2,
      status: "partial",
      coinCost: 120,
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

  it("renders wallet, themes, count selector, prompt input, and generate button", () => {
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

    expect(container.textContent).toContain("800");
    expect(container.textContent).toContain("牛马像素馆");
    expect(container.querySelector("textarea")).not.toBeNull();
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "1")).toBe(true);
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "2")).toBe(true);
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "4")).toBe(true);
    expect(container.textContent).toContain("生成");
    expect(container.textContent).toContain("重新生成失败项");
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

    expect(textarea?.value).toBe("");
    expect(container.textContent).not.toContain("pose.png");
    expect(container.textContent).not.toContain("light.png");
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
});
