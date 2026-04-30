import { describe, expect, it } from "vitest";
import { getTeamDynamicMeta, TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

describe("gamification team dynamics metadata", () => {
  it("registers every game dynamic type", () => {
    expect(TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE).toBe("GAME_RARE_PRIZE");
    expect(TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE).toBe(
      "GAME_TASK_STREAK_MILESTONE",
    );
    expect(TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE).toBe("GAME_BOOST_MILESTONE");
    expect(TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST).toBe("GAME_TEAM_BROADCAST");
    expect(TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT).toBe("GAME_SOCIAL_MOMENT");
  });

  it("returns readable card metadata for game dynamic types", () => {
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE)).toMatchObject({
      label: "补给高光",
      tone: "highlight",
    });
    expect(
      getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE),
    ).toMatchObject({
      label: "摸鱼自律",
      tone: "success",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE)).toMatchObject({
      label: "暴击打卡",
      tone: "highlight",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST)).toMatchObject({
      label: "团队小喇叭",
      tone: "default",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT)).toMatchObject({
      label: "牛马互动",
      tone: "success",
    });
  });
});
