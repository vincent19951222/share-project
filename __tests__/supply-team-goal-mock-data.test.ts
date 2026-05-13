import { describe, expect, it } from "vitest";
import {
  supplyTeamGoalAssetPaths,
  supplyTeamGoalMock,
} from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

describe("supply team goal mock data", () => {
  it("covers the prototype's team, season, milestone, task, and reward state", () => {
    expect(supplyTeamGoalMock.topBar.resources.map((resource) => resource.value)).toEqual(["2,450", "18", "68/120"]);
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

  it("includes all milestone states needed by the road UI", () => {
    expect(supplyTeamGoalMock.milestones.map((milestone) => milestone.status)).toEqual([
      "completed",
      "completed",
      "current",
      "active",
      "locked",
    ]);
  });

  it("keeps image asset paths under the team-goal public folder", () => {
    expect(supplyTeamGoalAssetPaths.roadBackground).toBe("/assets/home-scenes/supply/team-goal/team-goal-road-bg.webp");
    expect(supplyTeamGoalAssetPaths.crest).toBe("/assets/home-scenes/supply/team-goal/team-goal-crest.webp");
    expect(supplyTeamGoalAssetPaths.vaultChest).toBe("/assets/home-scenes/supply/team-goal/team-goal-vault-chest.webp");
  });
});
