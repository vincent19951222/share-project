import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import {
  buildBoostMilestoneDynamic,
  buildRarePrizeDynamic,
  buildSocialMomentDynamic,
  buildTaskStreakDynamic,
  buildTeamBroadcastDynamic,
  GAME_TASK_STREAK_MILESTONES,
  safeCreateGameTeamDynamic,
  shouldHighlightBoost,
  shouldHighlightLotteryReward,
} from "@/lib/gamification/team-dynamics";

describe("gamification team dynamics bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the approved four-dimension streak milestones", () => {
    expect(GAME_TASK_STREAK_MILESTONES).toEqual([3, 7, 14, 30]);
  });

  it("highlights rare, real-world, and explicitly highlighted lottery rewards", () => {
    expect(shouldHighlightLotteryReward({ rewardTier: "rare" })).toBe(true);
    expect(shouldHighlightLotteryReward({ rewardKind: "real_world_redemption" })).toBe(true);
    expect(shouldHighlightLotteryReward({ rewardTier: "coin" })).toBe(false);
    expect(
      shouldHighlightLotteryReward({
        rewardTier: "coin",
        highlightInDynamics: true,
      }),
    ).toBe(true);
  });

  it("highlights boost only when bonus at least doubles one reward lane or item is explicit", () => {
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 40,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
      }),
    ).toBe(true);
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 20,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
      }),
    ).toBe(false);
    expect(
      shouldHighlightBoost({
        baseAssetAwarded: 40,
        boostAssetBonus: 20,
        baseSeasonContribution: 40,
        boostSeasonBonus: 0,
        highlightInDynamics: true,
      }),
    ).toBe(true);
  });

  it("builds stable source keys for every game dynamic", () => {
    const occurredAt = new Date("2026-04-26T09:00:00+08:00");

    expect(
      buildRarePrizeDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        drawId: "draw_1",
        resultId: "result_1",
        rewardId: "luckin_coffee_coupon",
        rewardName: "瑞幸咖啡券",
        rewardTier: "rare",
        rewardKind: "real_world_redemption",
        dayKey: "2026-04-26",
        occurredAt,
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
      sourceType: "lottery_draw_result",
      sourceId: "result_1",
      title: "li 抽中了瑞幸咖啡券",
      importance: "high",
    });

    expect(
      buildTaskStreakDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        milestone: 7,
        dayKey: "2026-04-26",
        occurredAt,
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE,
      sourceType: "daily_task_streak",
      sourceId: "user_1:7:2026-04-26",
    });

    expect(
      buildBoostMilestoneDynamic({
        teamId: "team_1",
        userId: "user_1",
        displayName: "li",
        punchRecordId: "punch_1",
        itemUseRecordId: "use_1",
        itemId: "double_niuma_coupon",
        itemName: "双倍牛马券",
        baseAssetAwarded: 40,
        boostAssetBonus: 40,
        baseSeasonContribution: 40,
        boostSeasonBonus: 40,
        dayKey: "2026-04-26",
        occurredAt,
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE,
      sourceType: "punch_record_boost",
      sourceId: "punch_1",
      importance: "high",
    });

    expect(
      buildTeamBroadcastDynamic({
        teamId: "team_1",
        senderUserId: "user_1",
        senderName: "li",
        invitationId: "invitation_1",
        itemId: "team_broadcast_coupon",
        message: "站起来走一圈",
        dayKey: "2026-04-26",
        occurredAt,
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST,
      sourceType: "social_invitation_broadcast",
      sourceId: "invitation_1",
    });

    expect(
      buildSocialMomentDynamic({
        teamId: "team_1",
        invitationId: "invitation_1",
        invitationType: "TEAM_STANDUP",
        senderUserId: "user_1",
        senderName: "li",
        responseCount: 2,
        responders: [
          { userId: "user_2", displayName: "luo" },
          { userId: "user_3", displayName: "liu" },
        ],
        dayKey: "2026-04-26",
        occurredAt,
      }),
    ).toMatchObject({
      type: TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT,
      sourceType: "social_invitation_moment",
      sourceId: "invitation_1",
    });
  });

  it("returns failed when the safe creator catches a downstream error", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db unavailable"));

    await expect(
      safeCreateGameTeamDynamic(
        {
          teamId: "team_1",
          type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
          title: "li 抽中了瑞幸咖啡券",
          summary: "补给站出了大货",
          payload: {},
          actorUserId: "user_1",
          sourceType: "lottery_draw_result",
          sourceId: "result_1",
          importance: "high",
          occurredAt: new Date("2026-04-26T09:00:00+08:00"),
        },
        create,
      ),
    ).resolves.toMatchObject({
      status: "FAILED",
      type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
      failureReason: "db unavailable",
    });
  });

  it("maps reused downstream dynamics to existing bridge results", async () => {
    const create = vi.fn().mockResolvedValue({ id: "dynamic_1", created: false });

    await expect(
      safeCreateGameTeamDynamic(
        {
          teamId: "team_1",
          type: TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST,
          title: "li 发了一条团队小喇叭",
          summary: "站起来走一圈",
          payload: {},
          actorUserId: "user_1",
          sourceType: "social_invitation_broadcast",
          sourceId: "invitation_1",
          importance: "normal",
          occurredAt: new Date("2026-04-26T09:00:00+08:00"),
        },
        create,
      ),
    ).resolves.toMatchObject({
      status: "EXISTING",
      teamDynamicId: "dynamic_1",
    });
  });
});
