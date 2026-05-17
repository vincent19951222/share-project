import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyTaskRecordScene", () => {
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

  it("renders the core task-record surfaces from the prototype", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    expect(container.querySelector(".supply-task-record-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar a[aria-current='page']")?.textContent).toContain("任务记录");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("68/120");
    expect(container.querySelector("a.supply-task-record-back-link")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelector(".supply-task-record-sidebar")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-timeline-panel")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-radar")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-redemptions")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-panel-image")).toBeNull();
    expect(container.querySelectorAll(".supply-task-record-sidebar nav button")).toHaveLength(5);
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "今日记录",
    );
    expect(container.querySelector(".supply-task-record-filters [role='tab'][aria-selected='true']")?.textContent).toBe(
      "全部",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(7);
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item'][data-status='completed']")).toHaveLength(
      4,
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item'][data-status='claimed']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-testid='task-record-radar-invite']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-testid='task-record-redemption']")).toHaveLength(3);
    expect(container.textContent).toContain("05月24日");
    expect(container.textContent).toContain("运动任务");
    expect(container.textContent).toContain("队友雷达");
    expect(container.textContent).toContain("兑换状态");
  });

  it("uses reused reward and avatar images without panel crops", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => {
      const src = image.getAttribute("src") ?? "";
      const optimizedUrl = new URL(src, "http://localhost").searchParams.get("url");

      return optimizedUrl ?? src;
    });

    expect(imageSources).toEqual(
      expect.arrayContaining([
        "/avatars/male1.png",
        "/gamification/rewards/icons/task_reroll_coupon.png",
        "/gamification/rewards/icons/coins_020.png",
        "/gamification/rewards/icons/luckin_coffee_coupon.png",
        "/avatars/male2.png",
        "/avatars/female1.png",
        "/avatars/male3.png",
      ]),
    );
    expect(imageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/task-record\/.*-panel\.png/);
  });
});
