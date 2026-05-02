import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RewardTile } from "@/components/gamification/RewardTile";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("RewardTile", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders a utility tile with generated icon, rarity badge, quantity, and label", () => {
    act(() => {
      root.render(
        <RewardTile
          name="任务换班券"
          rewardTier="utility"
          rarity="uncommon"
          iconSrc="/gamification/rewards/icons/task_reroll_coupon.png"
          iconAlt="任务换班券"
          quantity={1}
          selected
        />,
      );
    });

    const tile = container.querySelector("[data-reward-tile='utility']");
    const image = container.querySelector("img");

    expect(tile).not.toBeNull();
    expect(tile?.className).toContain("reward-tile-tier-utility");
    expect(tile?.className).toContain("reward-tile-selected");
    expect(container.textContent).toContain("R");
    expect(container.textContent).toContain("x1");
    expect(container.textContent).toContain("任务换班券");
    expect(image?.getAttribute("src")).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(image?.getAttribute("alt")).toBe("任务换班券");
  });

  it("renders a fallback mark when the icon asset is missing", () => {
    act(() => {
      root.render(<RewardTile name="未知奖励" rewardTier="rare" rarity="epic" quantity={3} />);
    });

    const tile = container.querySelector("[data-reward-tile='rare']");

    expect(tile).not.toBeNull();
    expect(tile?.className).toContain("reward-tile-tier-rare");
    expect(container.textContent).toContain("SSR");
    expect(container.textContent).toContain("?");
    expect(container.textContent).toContain("x3");
    expect(container.querySelector("img")).toBeNull();
  });

  it("supports draw-result and detail size variants", () => {
    act(() => {
      root.render(
        <div>
          <RewardTile name="抽奖展示" rewardTier="coin" rarity="common" size="draw-result" />
          <RewardTile name="详情展示" rewardTier="social" rarity="rare" size="detail" />
        </div>,
      );
    });

    expect(container.querySelector(".reward-tile-size-draw-result")).not.toBeNull();
    expect(container.querySelector(".reward-tile-size-detail")).not.toBeNull();
    expect(container.textContent).toContain("N");
    expect(container.textContent).toContain("SR");
  });

  it("can render as decorative content inside interactive rows", () => {
    act(() => {
      root.render(
        <button type="button">
          <RewardTile name="任务换班券" rewardTier="utility" rarity="uncommon" decorative />
          任务换班券 x1
        </button>,
      );
    });

    const tile = container.querySelector("[data-reward-tile='utility']");

    expect(tile?.tagName).toBe("SPAN");
    expect(tile?.getAttribute("aria-hidden")).toBe("true");
  });
});
