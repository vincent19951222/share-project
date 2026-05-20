import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyTeamGoalScene", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("renders the team goal prototype with Task 9 reward and metric additions", async () => {
    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    expect(host.querySelector(".supply-team-goal-scene")).not.toBeNull();
    expect(host.textContent).toContain("牛马补给站");
    expect(host.textContent).toContain("团队目标");
    expect(host.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(host.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(host.querySelector(".supply-ui-lab-topbar-tab[aria-selected='true']")?.textContent).toContain("团队目标");
    expect(host.querySelector(".supply-ui-lab-topbar-tab[href='/ui-lab/supply-dashboard']")?.textContent).toContain(
      "我的状态",
    );
    expect(host.querySelector(".supply-ui-lab-brand img")).not.toBeNull();
    expect(host.querySelector(".supply-ui-lab-statusbar")).not.toBeNull();
    expect(host.querySelector(".supply-ui-lab-user-menu")).not.toBeNull();
    expect(host.querySelector(".supply-team-goal-panel-image")).toBeNull();
    expect(host.innerHTML).not.toMatch(/team-goal-(raid|road|tasks|rewards|announcement)-panel\.(png|webp|jpe?g)/);
    expect(host.textContent).not.toContain("查看成员");
    expect(host.textContent).toContain("返回大厅");
    expect(host.textContent).toContain("本周团队副本");
    expect(host.textContent).toContain("78,560");
    expect(host.textContent).toContain("120,000");
    expect(host.textContent).toContain("65%");
    expect(host.textContent).toContain("5,680");
    expect(host.textContent).toContain("今日团队任务");
    expect(host.textContent).toContain("奖励预览");
    expect(host.textContent).toContain("赛季达成奖励");
    expect(host.textContent).toContain("银子 x100");
    expect(host.textContent).toContain("抽奖券 x3");
    expect(host.textContent).toContain("团队称号 30天");
    expect(host.textContent).toContain("赛季达成高光");
    expect(host.textContent).toContain("20%");
    expect(host.textContent).toContain("每人 抽奖券 x1");
    expect(host.textContent).toContain("今日有效健身打卡人数");
    expect(host.textContent).toContain("今日四维任务完成份数");
    expect(host.textContent).toContain("今日弱社交已回应次数");
    expect(host.textContent).toContain("今日全队抽卡次数");
    expect(host.textContent).toContain("当前阶段：3/5");
    expect(host.querySelector(".supply-team-goal-road-track")).not.toBeNull();
    expect(host.querySelectorAll("[data-testid='team-goal-milestone']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-milestone-reward']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-task']")).toHaveLength(4);
    expect(host.querySelectorAll("[data-testid='team-goal-reward']")).toHaveLength(4);
    expect(host.textContent).not.toContain("补给券");
    expect(host.textContent).not.toContain("帮助中心");
    expect(host.textContent).not.toContain("意见反馈");
    expect(host.textContent).not.toContain("设置");
  });

  it("shows local feedback when the reward claim button is clicked", async () => {
    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    const claimButton = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("领取团队奖励"),
    );

    expect(claimButton).toBeDefined();
    expect(host.textContent).toContain("达成所有阶段即可领取全部奖励");

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).toContain("本地预览：奖励已加入领取反馈");
  });
});
