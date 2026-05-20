import { describe, expect, it } from "vitest";
import {
  supplyTeamGoalAssetPaths,
  supplyTeamGoalMock,
} from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

describe("supply team goal mock data", () => {
  it("covers the prototype's team, season, milestone, task, and reward state", () => {
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.value)).toEqual([
      "2,450",
      "18",
      "18/60",
    ]);
    expect(supplyTeamGoalMock.team.name).toBe("牛马不加班");
    expect(supplyTeamGoalMock.team.memberCount).toBe(28);
    expect(supplyTeamGoalMock.team.memberLimit).toBe(30);
    expect(supplyTeamGoalMock.season.currentPoints).toBe(78560);
    expect(supplyTeamGoalMock.season.targetPoints).toBe(120000);
    expect(supplyTeamGoalMock.season.progressPercent).toBe(65);
    expect(supplyTeamGoalMock.season.currentStage).toBe(3);
    expect(supplyTeamGoalMock.vault.amount).toBe(5680);
    expect(supplyTeamGoalMock.milestones).toHaveLength(5);
    expect(supplyTeamGoalMock.tasks).toHaveLength(4);
    expect(supplyTeamGoalMock.rewardPreview).toHaveLength(4);
  });

  it("models season completion rewards and milestone rewards from the Task 9 spec", () => {
    expect(supplyTeamGoalMock.completionReward).toEqual({
      title: "赛季达成奖励",
      memberRewards: ["银子 x100", "抽奖券 x3"],
      teamReward: "团队称号 30天",
      reportReward: "赛季达成高光",
    });
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.percent)).toEqual([20, 40, 65, 85, 100]);
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.rewardLabel)).toEqual([
      "团队公告高光",
      "每人 抽奖券 x1",
      "团队称号预览",
      "每人 银子 x50",
      "触发赛季达成奖励",
    ]);
    expect(supplyTeamGoalMock.milestoneRewards.map((reward) => reward.status)).toEqual([
      "completed",
      "completed",
      "current",
      "active",
      "locked",
    ]);
  });

  it("explains the source metric for each daily team task", () => {
    expect(supplyTeamGoalMock.tasks.map((task) => task.metricSource)).toEqual([
      "今日有效健身打卡人数",
      "今日四维任务完成份数",
      "今日弱社交已回应次数",
      "今日全队抽卡次数",
    ]);
  });

  it("includes all milestone states needed by the road UI", () => {
    expect(supplyTeamGoalMock.milestones.map((milestone) => milestone.status)).toEqual([
      "completed",
      "completed",
      "current",
      "active",
      "locked",
    ]);
  });

  it("uses Phase 2 vocabulary and removes legacy helper entries", () => {
    const serializedMock = JSON.stringify(supplyTeamGoalMock);

    expect(serializedMock).not.toContain("补给券");
    expect(serializedMock).not.toContain("帮助中心");
    expect(serializedMock).not.toContain("意见反馈");
    expect(serializedMock).not.toContain("设置");
  });

  it("keeps image asset paths under the team-goal public folder", () => {
    expect(supplyTeamGoalAssetPaths.topbarLogo).toBe("/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png");
    expect(supplyTeamGoalAssetPaths.media).toEqual({
      roadBackground: "/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp",
      crest: "/assets/home-scenes/supply/team-goal/team-goal-crest.webp",
      vaultChest: "/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp",
    });
    expect(JSON.stringify(supplyTeamGoalAssetPaths)).not.toContain("panelImages");
    expect(serializedAssetData()).not.toMatch(
      /team-goal-(raid|road|tasks|rewards|announcement)-panel\.(png|webp|jpe?g)/,
    );
  });
});

function serializedAssetData() {
  return JSON.stringify({ supplyTeamGoalAssetPaths, supplyTeamGoalMock });
}
