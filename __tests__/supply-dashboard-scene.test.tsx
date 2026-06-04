import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("supply dashboard static scene", () => {
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

  it("renders the isolated layered Dashboard scene from static mock data", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-background")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-content")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-stage")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-current-page")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-current-page")?.textContent).toBe("我的状态");
    expect(container.querySelector(".supply-ui-lab-resource-strip")).not.toBeNull();
    expect(container.querySelectorAll(".supply-ui-lab-topbar-tab[aria-current='page']")).toHaveLength(1);
    const tabs = Array.from(container.querySelectorAll(".supply-ui-lab-topbar-tab")).map((tab) =>
      tab.textContent?.trim(),
    );

    expect(tabs).toEqual(["⌂我的状态", "▤补给商店", "▣任务记录"]);
    expect(container.textContent).not.toContain("排行榜");
    expect(container.textContent).not.toContain("团队目标");
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(
      container.querySelector(".supply-ui-lab-tabs a[aria-selected='true']")?.textContent,
    ).toContain("我的状态");
    expect(container.querySelector(".supply-ui-lab-tabs a[href='/ui-lab/supply-dashboard/team-goal']")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-return-action")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-user-menu")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-user-profile")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource b")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector(".supply-dashboard-status-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel.supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel .supply-dashboard-section-heading button")).toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel .supply-dashboard-section-heading span[aria-hidden='true']")).toBeNull();
    expect(container.querySelector(".supply-dashboard-title-card")).not.toBeNull();
    const effectCards = Array.from(container.querySelectorAll(".supply-dashboard-effect-card"));
    expect(effectCards).toHaveLength(2);
    supplyDashboardMock.activeEffects.forEach((effect, index) => {
      const effectIcon = effectCards[index]?.querySelector("img");
      expect(effectIcon?.getAttribute("src")).toBe(effect.icon);
      expect(effectIcon?.getAttribute("alt")).toBe("");
    });
    expect(container.textContent).toContain("牛马等级");
    expect(container.textContent).toContain("今日待生效");
    expect(container.textContent).toContain("今日已生效");
    expect(container.textContent).toContain("今日 23:59");
    expect(container.textContent).not.toContain("small_boost_coupon");
    expect(container.textContent).not.toContain("season_sprint_coupon");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("生命票");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("帮助中心");
    expect(container.textContent).not.toContain("意见反馈");
    expect(container.textContent).not.toContain("设置");
    expect(container.querySelector('a[href="#help"]')).toBeNull();
    expect(container.querySelector('a[href="#feedback"]')).toBeNull();
    expect(container.querySelector(".supply-dashboard-streak-card")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-streak-card")?.textContent).not.toContain("🔥");
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-image")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-mobile-hero")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-mobile-hero img")?.getAttribute("src")).toBe(
      supplyDashboardAssetPaths.hero,
    );
    expect(container.querySelector(".supply-dashboard-mobile-hero")?.textContent).toContain("Lv.1");
    expect(container.querySelector(".supply-dashboard-mobile-hero")?.textContent).toContain(supplyDashboardMock.motto);
    expect(container.querySelector(".supply-dashboard-hero-status")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-status")?.textContent).toContain("Lv.1");
    expect(container.querySelector(".supply-dashboard-hero-status")?.textContent).toContain("距离升级还差 1000 EXP");
    const heroProgress = container.querySelector(".supply-dashboard-hero-progress");
    const heroProgressBar = heroProgress?.querySelector("[role='progressbar']");
    expect(heroProgressBar).not.toBeNull();
    expect(heroProgress?.textContent).not.toContain("0/1000");
    expect(heroProgress?.querySelector(".supply-ui-lab-progress")?.getAttribute("data-progress-label")).toBe(
      "0/1000 · 0%",
    );
    expect(heroProgressBar?.getAttribute("aria-valuetext")).toBe("0/1000 · 0%");
    const heroBadge = container.querySelector(".supply-dashboard-level-avatar");
    expect(heroBadge).not.toBeNull();
    expect(heroBadge?.getAttribute("src")).toBe(supplyDashboardAssetPaths.levelAvatar);
    expect(heroBadge?.getAttribute("alt")).toBe("");
    expect(container.querySelector(".supply-dashboard-hero-status button")).toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-status a")).toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-status b")).toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel.supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card-shell")).toHaveLength(4);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-shell[data-complete='true']")).toHaveLength(3);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-shell[data-complete='false']")).toHaveLength(1);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay")).toHaveLength(3);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay[data-visual='stamp']")).toHaveLength(3);
    expect(
      container.querySelector(".supply-dashboard-quest-card-shell[data-complete='false'] .supply-dashboard-quest-card-complete-overlay"),
    ).toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-card-actions")).toBeNull();
    expect(container.querySelector(".supply-task-card-icon-action")).toBeNull();
    expect(container.querySelectorAll(".supply-task-card-meta--actions")).toHaveLength(4);
    expect(container.querySelectorAll(".supply-task-card-action--reroll")).toHaveLength(4);
    expect(container.querySelectorAll(".supply-task-card-action--complete")).toHaveLength(4);
    const pendingQuestCard = container.querySelector(".supply-dashboard-quest-card-shell[data-complete='false']");
    expect(pendingQuestCard?.querySelector(".supply-task-card-action--reroll")?.textContent).toContain("↻换一个");
    expect(pendingQuestCard?.querySelector(".supply-task-card-action--complete")?.textContent).toContain("✓打卡");
    expect(pendingQuestCard?.querySelector(".supply-task-card-meta")?.textContent).not.toContain("通用");
    expect(pendingQuestCard?.querySelector(".supply-task-card-meta")?.textContent).not.toContain("换班");
    expect(pendingQuestCard?.querySelector(".supply-task-card-action--reroll")?.getAttribute("aria-label")).toBe(
      "换一个任务：一句话笔记",
    );
    expect(pendingQuestCard?.querySelector(".supply-task-card-action--complete")?.getAttribute("aria-label")).toBe(
      "完成任务打卡：一句话笔记",
    );
    expect(container.querySelector(".supply-dashboard-quest-card-hitbox")).toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-card .supply-task-card-reroll")).toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-card .supply-task-card-state")).toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card")).toHaveLength(4);
    expect(container.querySelectorAll(".supply-dashboard-quest-card.supply-task-card")).toHaveLength(4);
    expect(Array.from(container.querySelectorAll(".supply-dashboard-quest-card")).map((card) => card.getAttribute("data-card-id"))).toEqual([
      "movement_004",
      "hydration_003",
      "social_001",
      "learning_005",
    ]);
    expect(container.querySelector(".supply-dashboard-quest-progress")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-footer")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-footer .supply-ui-lab-action")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-shortcut-dock")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-shortcut-card")).toHaveLength(4);
    expect(container.querySelector(".supply-dashboard-shortcut-card--home")?.getAttribute("data-priority")).toBe("primary");
    expect(container.querySelector(".supply-dashboard-shortcut-card--backpack")?.getAttribute("data-priority")).toBe(
      "secondary",
    );
    expect(container.querySelector(".supply-dashboard-announcement")?.getAttribute("data-priority")).toBe("quiet");
    expect(container.querySelector(".supply-dashboard-announcement")?.textContent).not.toContain("📣");
    expect(container.querySelector(".supply-dashboard-panel-image")).toBeNull();
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("我的状态");
    expect(container.textContent).toContain("补给商店");
    expect(container.textContent).toContain("角色状态");
    expect(container.textContent).toContain("今日主线");
    expect(container.textContent).toContain("任务记录");
  });

  it("can render embedded in the shared app shell without its internal topbar", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene chrome="embedded" data={supplyDashboardMock} />);
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-scene--embedded")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource-strip")).toBeNull();
    expect(container.querySelector(".supply-dashboard-stage")).not.toBeNull();
  });

  it("uses atomic art assets plus the shared topbar logo", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDashboardAssetPaths.background,
        supplyDashboardAssetPaths.hero,
        supplyDashboardAssetPaths.dockBackpack,
        supplyDashboardAssetPaths.dockSupplyMachine,
        supplyDashboardAssetPaths.dockTaskRecord,
        supplyDashboardAssetPaths.taskCards.hydration,
        supplyDashboardAssetPaths.taskCards.movement,
        supplyDashboardAssetPaths.taskCards.social,
        supplyDashboardAssetPaths.taskCards.learning,
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_topbar_cow_logo.png",
      ]),
    );
    expect(imageSources.join("\n")).not.toMatch(/dashboard-(status|hero|quests|shortcut|announcement)-panel/);
    expect(imageSources.join("\n")).not.toContain("/assets/task-cards/raw/");
  });

  it("shows local mock feedback for reroll and reward claim actions", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const feedback = container.querySelector("[data-dashboard-feedback]");
    expect(feedback?.textContent).toContain("本地预览");

    const rerollButton = Array.from(container.querySelectorAll<HTMLButtonElement>(".supply-task-card-action--reroll")).find(
      (button) => !button.disabled,
    );
    expect(rerollButton).not.toBeNull();

    await act(async () => {
      rerollButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("已触发换一个预览");

    const claimButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("领取奖励"),
    );
    expect(claimButton).toBeDefined();

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("奖励领取预览");
  });

  it("shows claimed reward state as a disabled gray button", async () => {
    const onClaimRewards = vi.fn();
    const claimedData = {
      ...supplyDashboardMock,
      dailyReward: {
        claimable: false,
        claimed: true,
      },
      dailyQuests: supplyDashboardMock.dailyQuests.map((quest) => ({
        ...quest,
        completed: true,
      })),
    };

    await act(async () => {
      root.render(<SupplyDashboardScene data={claimedData} onClaimRewards={onClaimRewards} />);
    });

    const claimButton = container.querySelector<HTMLButtonElement>("[data-action='claim-ticket']");

    expect(claimButton?.textContent).toBe("已领取");
    expect(claimButton?.disabled).toBe(true);
    expect(claimButton?.getAttribute("data-claim-state")).toBe("claimed");

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClaimRewards).not.toHaveBeenCalled();
  });

  it("opens task record from the social invitation notice", async () => {
    const onNavigate = vi.fn();
    const data = {
      ...supplyDashboardMock,
      socialInvitationNotice: {
        pendingCount: 1,
        title: "队友邀请待响应",
        message: "luo 邀请你喝水：喝口水",
        actionLabel: "去回应",
        target: "task-record" as const,
      },
    };

    await act(async () => {
      root.render(<SupplyDashboardScene data={data} onNavigate={onNavigate} />);
    });

    expect(container.textContent).toContain("队友邀请待响应");
    expect(container.textContent).toContain("luo 邀请你喝水");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".supply-dashboard-social-notice")?.click();
    });

    expect(onNavigate).toHaveBeenCalledWith("task-record");
  });

  it("lets the unfinished quest card confirm completion in the local demo", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay")).toHaveLength(3);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-shell[data-complete='false']")).toHaveLength(1);

    const learningCard = container.querySelector<HTMLElement>("[data-card-id='learning_005']");
    const completeButton = learningCard
      ?.closest(".supply-dashboard-quest-card-shell")
      ?.querySelector<HTMLButtonElement>(".supply-task-card-action--complete");
    expect(completeButton?.getAttribute("aria-label")).toBe("完成任务打卡：一句话笔记");

    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("确认打卡");
    expect(dialog?.textContent).toContain("一句话笔记");
    expect(dialog?.textContent).toContain("把今天学到的一个东西写成一句话，短到能发群里最好。");
    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay")).toHaveLength(3);

    const cancelButton = Array.from(dialog?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((button) =>
      button.textContent?.includes("取消"),
    );
    expect(cancelButton).toBeDefined();

    await act(async () => {
      cancelButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay")).toHaveLength(3);

    await act(async () => {
      completeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("确认打卡"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card-complete-overlay")).toHaveLength(4);
    expect(container.querySelectorAll(".supply-dashboard-quest-card-shell[data-complete='false']")).toHaveLength(0);
    expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("已完成打卡：一句话笔记");
    expect(container.querySelector(".supply-dashboard-quest-progress")?.textContent).toContain("进度：4/4");
  });

  it("renders an optional return action before the status tab", async () => {
    const onBackToPunch = vi.fn();

    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} onBackToPunch={onBackToPunch} />);
    });

    const navCluster = container.querySelector(".supply-ui-lab-nav-cluster");
    const returnAction = container.querySelector<HTMLButtonElement>(".supply-ui-lab-return-action");

    expect(navCluster?.firstElementChild).toBe(returnAction);
    expect(returnAction?.textContent).toContain("回到打卡");
    expect(container.querySelector(".supply-ui-lab-topbar-tab--status")?.textContent).toContain("我的状态");

    await act(async () => {
      returnAction?.click();
    });

    expect(onBackToPunch).toHaveBeenCalledTimes(1);
  });
});
