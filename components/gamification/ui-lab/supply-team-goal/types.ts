export type TeamGoalMilestoneStatus = "completed" | "current" | "active" | "locked";
export type TeamGoalTaskStatus = "active" | "completed" | "locked";
export type TeamGoalRewardTone = "purple" | "orange" | "blue" | "violet";

export type TeamGoalResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type TeamGoalSeasonReward = {
  id: string;
  icon: string;
  label: string;
  value: string;
};

export type TeamGoalMilestone = {
  id: string;
  order: number;
  title: string;
  targetPoints: number;
  status: TeamGoalMilestoneStatus;
  rewardLabel: string;
};

export type TeamGoalTask = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  current: number;
  target: number;
  unit: string;
  reward: {
    icon: string;
    label: string;
    value: string;
  };
  status: TeamGoalTaskStatus;
};

export type TeamGoalRewardPreview = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  icon: string;
  tone: TeamGoalRewardTone;
};

export type SupplyTeamGoalPreview = {
  topBar: {
    resources: TeamGoalResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  team: {
    name: string;
    level: number;
    memberCount: number;
    memberLimit: number;
    crestImage: string;
  };
  season: {
    label: string;
    goalName: string;
    dateRange: string;
    remainingDays: number;
    currentPoints: number;
    targetPoints: number;
    progressPercent: number;
    currentStage: number;
    totalStages: number;
  };
  vault: {
    amount: number;
    image: string;
    helper: string;
  };
  seasonRewards: TeamGoalSeasonReward[];
  milestones: TeamGoalMilestone[];
  tasks: TeamGoalTask[];
  rewardPreview: TeamGoalRewardPreview[];
  announcement: {
    message: string;
  };
};
