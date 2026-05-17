import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";
import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";

describe("SupplyTeamGoalScene", () => {
  it("renders the static team goal prototype structure", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);

    await act(async () => {
      root.render(<SupplyTeamGoalScene data={supplyTeamGoalMock} />);
    });

    expect(host.querySelector(".supply-team-goal-scene")).not.toBeNull();
    expect(host.textContent).toContain("牛马补给站");
    expect(host.textContent).toContain("团队目标");
    expect(
      host.querySelector(".supply-ui-lab-topbar-tab[aria-selected='true']")?.textContent,
    ).toContain("团队目标");
    expect(
      host.querySelector(".supply-ui-lab-topbar-tab[href='/ui-lab/supply-dashboard']")?.textContent,
    ).toContain("我的状态");
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
    expect(host.textContent).toContain("当前阶段：3/5");
    expect(host.querySelector(".supply-team-goal-road-track")).not.toBeNull();
    expect(host.querySelectorAll("[data-testid='team-goal-milestone']")).toHaveLength(5);
    expect(host.querySelectorAll("[data-testid='team-goal-task']")).toHaveLength(4);
    expect(host.querySelectorAll("[data-testid='team-goal-reward']")).toHaveLength(4);

    root.unmount();
  });
});
