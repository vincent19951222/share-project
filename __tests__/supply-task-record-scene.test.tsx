import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const clickButtonContaining = async (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
    candidate.textContent?.includes(label),
  );

  expect(button, label).toBeDefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

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

  it("renders today records with date tabs and Phase 2 vocabulary", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    expect(container.querySelector(".supply-task-record-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector("a.supply-task-record-back-link")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelectorAll(".supply-task-record-sidebar nav button")).toHaveLength(5);
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "今日记录",
    );
    expect(container.querySelector("#task-record-title")?.textContent).toBe("今日记录");
    expect(container.querySelectorAll(".supply-task-record-date-tabs button")).toHaveLength(7);
    expect(container.querySelector(".supply-task-record-date-tabs button[aria-selected='true']")?.textContent).toContain(
      "今天",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(7);
    expect(container.textContent).toContain("05月18日");
    expect(container.textContent).toContain("运动任务");
    expect(container.textContent).toContain("抽奖券 x1");
    expect(container.textContent).not.toContain("生命票");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("牛马币");
  });

  it("switches the visible records when a date tab is selected and shows an empty state", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "昨天");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("今日记录");
    expect(container.textContent).toContain("05月17日");
    expect(container.textContent).toContain("完成队友互动");
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(3);

    await clickButtonContaining(container, "5天前");

    expect(container.textContent).toContain("05月13日");
    expect(container.textContent).toContain("这一天还没有任务记录");
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(0);
  });

  it("switches sidebar modes into full main views", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "抽卡记录");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("抽卡记录");
    expect(container.querySelectorAll("[data-testid='task-record-draw-history']")).toHaveLength(3);
    expect(container.textContent).toContain("十连");
    expect(container.textContent).toContain("消耗抽奖券 10");
    expect(container.textContent).toContain("批次保底已触发");

    await clickButtonContaining(container, "兑换记录");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("兑换记录");
    expect(container.querySelectorAll("[data-testid='task-record-redemption-full']")).toHaveLength(3);
    expect(container.textContent).toContain("兑换中");
    expect(container.textContent).toContain("已完成");
    expect(container.textContent).toContain("已失效");

    await clickButtonContaining(container, "队友雷达");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("队友雷达");
    expect(container.querySelectorAll("[data-testid='task-record-radar-invite-full']")).toHaveLength(5);
    expect(container.textContent).toContain("待响应");
    expect(container.textContent).toContain("已回应");
    expect(container.textContent).toContain("已过期");

    await clickButtonContaining(container, "规则说明");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("规则说明");
    expect(container.querySelectorAll("[data-testid='task-record-rule']")).toHaveLength(4);
    expect(container.textContent).toContain("日期 tab 展示最近 7 天");
    expect(container.textContent).toContain("抽卡记录展示单抽、十连、消耗抽奖券和批次保底状态");
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
