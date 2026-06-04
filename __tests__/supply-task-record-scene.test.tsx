import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      "/dashboard/status",
    );
    expect(container.querySelector(".supply-task-record-aside")).toBeNull();
    expect(container.querySelectorAll(".supply-task-record-view-all")).toHaveLength(0);
    expect(container.querySelectorAll(".supply-task-record-sidebar nav button")).toHaveLength(5);
    expect(container.querySelectorAll(".supply-task-record-menu-icon img")).toHaveLength(5);
    expect(container.querySelector(".supply-task-record-menu-icon")?.textContent).toBe("");
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "今日记录",
    );
    expect(container.querySelector(".supply-task-record-menu button:nth-child(2)")?.textContent).toContain("3");
    expect(container.querySelector(".supply-task-record-menu button:nth-child(3)")?.textContent).toContain("1");
    expect(container.querySelector(".supply-task-record-menu button:nth-child(4)")?.textContent).toContain("3");
    expect(container.querySelector("#task-record-title")?.textContent).toBe("今日记录");
    expect(container.querySelectorAll(".supply-task-record-date-tabs button")).toHaveLength(7);
    expect(
      Array.from(container.querySelectorAll(".supply-task-record-date-tabs button span")).map(
        (tab) => tab.textContent,
      ),
    ).toEqual(["6天前", "5天前", "4天前", "3天前", "前天", "昨天", "今天"]);
    expect(container.querySelector(".supply-task-record-date-tabs button[aria-selected='true']")?.textContent).toContain(
      "今天",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(7);
    expect(container.querySelectorAll(".supply-task-record-timeline-item[data-event-type]")).not.toHaveLength(0);
    expect(
      Array.from(container.querySelectorAll(".supply-task-record-timeline-item[data-event-type]")).map((item) =>
        item.getAttribute("data-event-type"),
      ),
    ).toEqual(expect.arrayContaining(["task", "reward"]));
    expect(container.querySelector(".supply-task-record-event-icon")).not.toBeNull();
    expect(container.querySelector(".supply-task-record-load-more")).toBeNull();
    expect(container.textContent).toContain("已显示今日全部记录");
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
    expect(container.querySelector(".supply-task-record-empty-state")?.textContent).toContain("当前筛选没有记录");
    expect(container.textContent).toContain("这一天还没有任务记录");
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(0);
  });

  it("filters today records through local state", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "社交互动");

    expect(container.querySelector(".supply-ui-lab-filterbar [role='tab'][aria-selected='true']")?.textContent).toBe(
      "社交互动",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(1);
    expect(container.textContent).toContain("社交任务");
    expect(container.textContent).not.toContain("运动任务");

    await clickButtonContaining(container, "系统通知");

    expect(container.querySelector(".supply-ui-lab-filterbar [role='tab'][aria-selected='true']")?.textContent).toBe(
      "系统通知",
    );
    expect(container.querySelectorAll("[data-testid='task-record-timeline-item']")).toHaveLength(1);
    expect(container.textContent).toContain("连续打卡 18 天奖励");
  });

  it("renders timeline rows without a reward pill when reward data is absent", async () => {
    const activeDateKey = supplyTaskRecordMock.activeDateKey;
    const [firstRecord] = supplyTaskRecordMock.recordsByDate[activeDateKey];
    const { reward: _reward, ...recordWithoutReward } = firstRecord;

    await act(async () => {
      root.render(
        <SupplyTaskRecordScene
          data={{
            ...supplyTaskRecordMock,
            recordsByDate: {
              ...supplyTaskRecordMock.recordsByDate,
              [activeDateKey]: [recordWithoutReward as typeof firstRecord],
            },
          }}
        />,
      );
    });

    expect(container.querySelector("[data-testid='task-record-timeline-item']")?.textContent).toContain(firstRecord.title);
    expect(container.querySelector(".supply-task-record-reward")).toBeNull();
    expect(container.textContent).not.toContain("银 记录");
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

  it("keeps radar and redemption access in the left menu instead of a duplicated right rail", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    expect(container.querySelector(".supply-task-record-aside")).toBeNull();
    expect(container.querySelectorAll(".supply-task-record-view-all")).toHaveLength(0);

    await clickButtonContaining(container, "队友雷达");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("队友雷达");
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "队友雷达",
    );
    expect(container.querySelectorAll("[data-testid='task-record-radar-invite-full']")).toHaveLength(5);

    await clickButtonContaining(container, "兑换记录");

    expect(container.querySelector("#task-record-title")?.textContent).toBe("兑换记录");
    expect(container.querySelector(".supply-task-record-sidebar nav button[aria-pressed='true']")?.textContent).toContain(
      "兑换记录",
    );
    expect(container.querySelectorAll("[data-testid='task-record-redemption-full']")).toHaveLength(3);
  });

  it("handles pending radar invites through local read-like actions", async () => {
    await act(async () => {
      root.render(<SupplyTaskRecordScene data={supplyTaskRecordMock} />);
    });

    await clickButtonContaining(container, "队友雷达");

    expect(container.querySelector(".supply-task-record-menu button:nth-child(4)")?.textContent).toContain("3");
    expect(container.querySelectorAll(".supply-task-record-radar-actions button")).toHaveLength(6);

    const firstInvite = container.querySelector("[data-testid='task-record-radar-invite']");
    const respondButton = Array.from(firstInvite?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) =>
      button.textContent?.includes("回应"),
    );

    await act(async () => {
      respondButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(firstInvite?.textContent).toContain("已回应");
    expect(firstInvite?.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector(".supply-task-record-menu button:nth-child(4)")?.textContent).toContain("2");

    const nextPendingInvite = Array.from(
      container.querySelectorAll<HTMLElement>("[data-testid='task-record-radar-invite']"),
    ).find((invite) => invite.textContent?.includes("待响应"));
    const ignoreButton = Array.from(nextPendingInvite?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) =>
      button.textContent?.includes("忽略"),
    );

    await act(async () => {
      ignoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(nextPendingInvite?.textContent).toContain("已忽略");
    expect(nextPendingInvite?.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector(".supply-task-record-menu button:nth-child(4)")?.textContent).toContain("1");
  });

  it("delegates ignore actions when dismiss handler is provided", async () => {
    const onDismissSocialInvitation = vi.fn();

    await act(async () => {
      root.render(
        <SupplyTaskRecordScene
          data={supplyTaskRecordMock}
          onDismissSocialInvitation={onDismissSocialInvitation}
        />,
      );
    });

    await clickButtonContaining(container, "队友雷达");

    const firstInvite = container.querySelector("[data-testid='task-record-radar-invite']");
    const ignoreButton = Array.from(firstInvite?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) =>
      button.textContent?.includes("忽略"),
    );

    await act(async () => {
      ignoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onDismissSocialInvitation).toHaveBeenCalledWith("invite-sailor");
    expect(firstInvite?.textContent).toContain("待响应");
    expect(firstInvite?.textContent).not.toContain("已忽略");
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
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_task_reroll_coupon.png",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_020.png",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_movement.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_hydration.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_chat.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_learning.webp",
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_task_record_icons_task_record_draw.webp",
      ]),
    );

    await clickButtonContaining(container, "队友雷达");

    const radarImageSources = Array.from(container.querySelectorAll("img")).map((image) => {
      const src = image.getAttribute("src") ?? "";
      const optimizedUrl = new URL(src, "http://localhost").searchParams.get("url");

      return optimizedUrl ?? src;
    });

    expect(radarImageSources).toEqual(
      expect.arrayContaining(["https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male2.png", "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_female1.png", "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male3.png"]),
    );

    await clickButtonContaining(container, "兑换记录");

    const redemptionImageSources = Array.from(container.querySelectorAll("img")).map((image) => {
      const src = image.getAttribute("src") ?? "";
      const optimizedUrl = new URL(src, "http://localhost").searchParams.get("url");

      return optimizedUrl ?? src;
    });

    expect(redemptionImageSources).toContain("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee_coupon.png");
    expect(imageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/task-record\/.*-panel\.png/);
    expect(radarImageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/task-record\/.*-panel\.png/);
    expect(redemptionImageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/task-record\/.*-panel\.png/);
  });
});
