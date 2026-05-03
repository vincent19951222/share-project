import { TEAM_DYNAMIC_TYPES, type TeamDynamicType } from "@/lib/team-dynamics";
import * as teamDynamicsService from "@/lib/team-dynamics-service";

export const GAME_TASK_STREAK_MILESTONES = [3, 7, 14, 30] as const;

export type GameTaskStreakMilestone = (typeof GAME_TASK_STREAK_MILESTONES)[number];

export interface GameDynamicCreateInput {
  teamId: string;
  type: TeamDynamicType;
  title: string;
  summary: string;
  payload: unknown;
  actorUserId: string | null;
  sourceType: string;
  sourceId: string;
  importance: "normal" | "high";
  occurredAt: Date;
}

export interface GameTeamDynamicResult {
  status: "CREATED" | "EXISTING" | "SKIPPED" | "FAILED";
  type?: TeamDynamicType;
  teamDynamicId?: string;
  failureReason?: string;
}

type CreateGameDynamic = (
  input: GameDynamicCreateInput,
) => Promise<{ id: string; created?: boolean }>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Team Dynamics write failure";
}

export function shouldHighlightLotteryReward(input: {
  rewardTier?: string;
  rewardKind?: string;
  highlightInDynamics?: boolean;
}) {
  return (
    input.rewardTier === "rare" ||
    input.rewardTier === "real_world" ||
    input.rewardKind === "real_world_redemption" ||
    input.highlightInDynamics === true
  );
}

export function shouldHighlightBoost(input: {
  baseAssetAwarded: number;
  boostAssetBonus: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  highlightInDynamics?: boolean;
}) {
  if (input.highlightInDynamics) {
    return true;
  }

  return (
    (input.baseAssetAwarded > 0 && input.boostAssetBonus >= input.baseAssetAwarded) ||
    (input.baseSeasonContribution > 0 &&
      input.boostSeasonBonus >= input.baseSeasonContribution)
  );
}

export function isGameTaskStreakMilestone(value: number): value is GameTaskStreakMilestone {
  return GAME_TASK_STREAK_MILESTONES.includes(value as GameTaskStreakMilestone);
}

export function buildRarePrizeDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  drawId: string;
  resultId: string;
  rewardId: string;
  rewardName: string;
  rewardTier: string;
  rewardKind?: string;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE,
    title: `${input.displayName} 抽中了${input.rewardName}`,
    summary: "补给站出了大货，建议全队围观。",
    payload: input,
    actorUserId: input.userId,
    sourceType: "lottery_draw_result",
    sourceId: input.resultId,
    importance: "high",
    occurredAt: input.occurredAt,
  };
}

export function buildTaskStreakDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  milestone: GameTaskStreakMilestone;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE,
    title: `${input.displayName} 连续 ${input.milestone} 天完成四维摸鱼任务`,
    summary: "站一站、喝白白、把事办黄、把股看红，今日全部达标。",
    payload: {
      ...input,
      dimensions: ["movement", "hydration", "social", "learning"],
    },
    actorUserId: input.userId,
    sourceType: "daily_task_streak",
    sourceId: `${input.userId}:${input.milestone}:${input.dayKey}`,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export function buildBoostMilestoneDynamic(input: {
  teamId: string;
  userId: string;
  displayName: string;
  punchRecordId: string;
  itemUseRecordId: string;
  itemId: string;
  itemName: string;
  baseAssetAwarded: number;
  boostAssetBonus: number;
  baseSeasonContribution: number;
  boostSeasonBonus: number;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE,
    title: `${input.displayName} 的${input.itemName}生效，今日收益暴击`,
    summary: `个人银子 +${input.boostAssetBonus}，赛季贡献 +${input.boostSeasonBonus}。`,
    payload: input,
    actorUserId: input.userId,
    sourceType: "punch_record_boost",
    sourceId: input.punchRecordId,
    importance: "high",
    occurredAt: input.occurredAt,
  };
}

export function buildTeamBroadcastDynamic(input: {
  teamId: string;
  senderUserId: string;
  senderName: string;
  invitationId: string;
  itemId: string;
  message: string;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST,
    title: `${input.senderName} 发了一条团队小喇叭`,
    summary: input.message,
    payload: input,
    actorUserId: input.senderUserId,
    sourceType: "social_invitation_broadcast",
    sourceId: input.invitationId,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export function buildSocialMomentDynamic(input: {
  teamId: string;
  invitationId: string;
  invitationType: string;
  senderUserId: string;
  senderName: string;
  responseCount: number;
  responders: Array<{ userId: string; displayName: string }>;
  dayKey: string;
  occurredAt: Date;
}): GameDynamicCreateInput {
  return {
    teamId: input.teamId,
    type: TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT,
    title: `${input.senderName} 的全队邀请收到 ${input.responseCount} 个响应`,
    summary: "这不是考核，这是牛马之间最后的温情。",
    payload: input,
    actorUserId: input.senderUserId,
    sourceType: "social_invitation_moment",
    sourceId: input.invitationId,
    importance: "normal",
    occurredAt: input.occurredAt,
  };
}

export async function safeCreateGameTeamDynamic(
  input: GameDynamicCreateInput,
  create: CreateGameDynamic = async (createInput) =>
    teamDynamicsService.createOrReuseTeamDynamic(createInput),
): Promise<GameTeamDynamicResult> {
  try {
    const dynamic = await create(input);

    return {
      status: dynamic.created === false ? "EXISTING" : "CREATED",
      type: input.type,
      teamDynamicId: dynamic.id,
    };
  } catch (error) {
    const failureReason = getErrorMessage(error);

    if (process.env.NODE_ENV !== "test") {
      console.warn("Game Team Dynamics write failed", {
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        failureReason,
      });
    }

    return {
      status: "FAILED",
      type: input.type,
      failureReason,
    };
  }
}
