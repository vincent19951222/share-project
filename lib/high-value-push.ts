import {
  formatEnterpriseWechatText,
  recordEnterpriseWechatPushEvent,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

const STREAK_PUSH_MILESTONES = new Set([7, 14, 30, 60, 100]);

export async function pushStreakMilestoneIfNeeded(input: {
  teamId: string;
  userId: string;
  username: string;
  streak: number;
  dayKey: string;
}) {
  if (!STREAK_PUSH_MILESTONES.has(input.streak)) {
    return { status: "SKIPPED" as const };
  }

  const eventKey = `${input.teamId}:${input.userId}:STREAK:${input.streak}`;
  const recorded = await recordEnterpriseWechatPushEvent({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    eventKey,
    targetType: "StreakMilestone",
    targetId: `${input.userId}:${input.streak}`,
    payloadJson: JSON.stringify({
      username: input.username,
      streak: input.streak,
      dayKey: input.dayKey,
    }),
  });

  if (!recorded.created) {
    return { status: "SKIPPED" as const };
  }

  return sendEnterpriseWechatMessage({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    targetType: "StreakMilestone",
    targetId: `${input.userId}:${input.streak}`,
    message: formatEnterpriseWechatText({
      title: "团队里程碑",
      lines: [`${input.username} 已连续打卡 ${input.streak} 天。`],
    }),
  });
}

export async function pushFullTeamAttendanceIfNeeded(input: {
  teamId: string;
  dayKey: string;
}) {
  const eventKey = `${input.teamId}:${input.dayKey}:FULL_TEAM_PUNCHED`;
  const recorded = await recordEnterpriseWechatPushEvent({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    eventKey,
    targetType: "Attendance",
    targetId: input.dayKey,
    payloadJson: JSON.stringify({ dayKey: input.dayKey }),
  });

  if (!recorded.created) {
    return { status: "SKIPPED" as const };
  }

  return sendEnterpriseWechatMessage({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    targetType: "Attendance",
    targetId: input.dayKey,
    message: formatEnterpriseWechatText({
      title: "团队里程碑",
      lines: ["今天全员已完成打卡。"],
    }),
  });
}

export async function pushSeasonTargetReachedIfNeeded(input: {
  teamId: string;
  seasonId: string;
  goalName: string;
}) {
  const eventKey = `${input.teamId}:${input.seasonId}:SEASON_TARGET_REACHED`;
  const recorded = await recordEnterpriseWechatPushEvent({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    eventKey,
    targetType: "SeasonGoal",
    targetId: input.seasonId,
    payloadJson: JSON.stringify({ goalName: input.goalName }),
  });

  if (!recorded.created) {
    return { status: "SKIPPED" as const };
  }

  return sendEnterpriseWechatMessage({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    targetType: "SeasonGoal",
    targetId: input.seasonId,
    message: formatEnterpriseWechatText({
      title: "团队里程碑",
      lines: [`本赛季目标已达成：${input.goalName}。`],
    }),
  });
}
