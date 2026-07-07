import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyArtworkBackpackPanel } from "@/components/gamification/production/SupplyArtworkBackpackPanel";
import type { SupplyAiImageSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildSnapshot(overrides: Partial<SupplyAiImageSnapshot> = {}): SupplyAiImageSnapshot {
  const baseSnapshot: SupplyAiImageSnapshot = {
    wallet: { coins: 1536, generationCostPerImage: 10, themeDrawCost: 200 },
    themes: {
      unlocked: [
        {
          id: "theme-01",
          name: "牛马像素馆",
          description: "像素风训练角色。",
          previewImageUrl: "https://example.com/theme-01.png",
          defaultUnlocked: true,
          unlocked: true,
          enabled: true,
          sortOrder: 1,
          tag: "像素",
          palette: ["#fde047", "#111827"],
        },
        {
          id: "theme-02",
          name: "暴汗训练场",
          description: "现场感训练海报。",
          previewImageUrl: "https://example.com/theme-02.png",
          defaultUnlocked: false,
          unlocked: true,
          enabled: true,
          sortOrder: 2,
          tag: "暴汗",
          palette: ["#f97316", "#0f172a"],
        },
      ],
      locked: [],
      allUnlocked: true,
    },
    recentTasks: [],
    recentArtworks: [
      {
        id: "art-1",
        taskId: "task-1",
        itemId: "item-1",
        themeId: "theme-01",
        imageUrl: "https://example.com/art-1.png",
        createdAt: "2026-07-06T08:05:00.000Z",
      },
      {
        id: "art-2",
        taskId: "task-2",
        itemId: "item-2",
        themeId: "theme-02",
        imageUrl: "https://example.com/art-2.png",
        createdAt: "2026-07-06T09:05:00.000Z",
      },
    ],
  };

  return {
    ...baseSnapshot,
    ...overrides,
    wallet: { ...baseSnapshot.wallet, ...overrides.wallet },
    themes: { ...baseSnapshot.themes, ...overrides.themes },
  };
}

describe("SupplyArtworkBackpackPanel", () => {
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
  });

  it("renders unlocked themes and generated artworks as user assets", async () => {
    const onBackToStudio = vi.fn();

    await act(async () => {
      root.render(<SupplyArtworkBackpackPanel onBackToStudio={onBackToStudio} snapshot={buildSnapshot()} />);
    });

    expect(container.querySelector(".supply-artwork-backpack-panel")).not.toBeNull();
    expect(container.textContent).toContain("我的资产背包");
    expect(container.textContent).toContain("2 个主题");
    expect(container.textContent).toContain("2 张作品");
    expect(container.querySelectorAll("[data-testid='supply-theme-asset']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-testid='supply-artwork-asset']")).toHaveLength(2);
    expect(container.querySelector("img[alt='主题卡：牛马像素馆']")).not.toBeNull();
    expect(container.querySelector("img[alt='作品：牛马像素馆']")).not.toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='back-to-ai-image-studio']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onBackToStudio).toHaveBeenCalledTimes(1);
  });

  it("keeps an explicit artwork empty state without hiding unlocked themes", async () => {
    await act(async () => {
      root.render(
        <SupplyArtworkBackpackPanel
          snapshot={buildSnapshot({
            recentArtworks: [],
          })}
        />,
      );
    });

    expect(container.querySelectorAll("[data-testid='supply-theme-asset']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-testid='supply-artwork-asset']")).toHaveLength(0);
    expect(container.textContent).toContain("还没有作品");
  });
});
