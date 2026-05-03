export const TEAM_DYNAMIC_TYPES = {
  WEEKLY_REPORT_CREATED: "WEEKLY_REPORT_CREATED",
  SEASON_STARTED: "SEASON_STARTED",
  SEASON_TARGET_REACHED: "SEASON_TARGET_REACHED",
  SEASON_ENDED: "SEASON_ENDED",
  TEAM_FULL_ATTENDANCE: "TEAM_FULL_ATTENDANCE",
  STREAK_MILESTONE: "STREAK_MILESTONE",
  COFFEE_SUMMARY: "COFFEE_SUMMARY",
  BOARD_NOTICE_REFERENCE: "BOARD_NOTICE_REFERENCE",
  GAME_RARE_PRIZE: "GAME_RARE_PRIZE",
  GAME_TASK_STREAK_MILESTONE: "GAME_TASK_STREAK_MILESTONE",
  GAME_BOOST_MILESTONE: "GAME_BOOST_MILESTONE",
  GAME_TEAM_BROADCAST: "GAME_TEAM_BROADCAST",
  GAME_SOCIAL_MOMENT: "GAME_SOCIAL_MOMENT",
} as const;

export type TeamDynamicType =
  (typeof TEAM_DYNAMIC_TYPES)[keyof typeof TEAM_DYNAMIC_TYPES];

export type TeamDynamicListView = "panel" | "page";
export type TeamDynamicFilterType = TeamDynamicType | "ALL";
export type TeamDynamicTone = "default" | "highlight" | "success";

export const TEAM_DYNAMICS_PANEL_LIMIT = 8;
export const TEAM_DYNAMICS_PAGE_LIMIT = 50;

export interface TeamDynamicMeta {
  label: string;
  tone: TeamDynamicTone;
}

export interface TeamDynamicListItem {
  id: string;
  type: TeamDynamicType;
  title: string;
  summary: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  importance: "normal" | "high";
}

export interface TeamDynamicListResponse {
  items: TeamDynamicListItem[];
  unreadCount: number;
  nextCursor: string | null;
}

export interface NormalizedTeamDynamicsQuery {
  view: TeamDynamicListView;
  unreadOnly: boolean;
  type: TeamDynamicFilterType;
  limit: number;
  cursor: string | null;
}

const TEAM_DYNAMIC_META: Record<TeamDynamicType, TeamDynamicMeta> = {
  [TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED]: {
    label: "周报",
    tone: "highlight",
  },
  [TEAM_DYNAMIC_TYPES.SEASON_STARTED]: {
    label: "赛季",
    tone: "default",
  },
  [TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED]: {
    label: "赛季里程碑",
    tone: "success",
  },
  [TEAM_DYNAMIC_TYPES.SEASON_ENDED]: {
    label: "赛季",
    tone: "default",
  },
  [TEAM_DYNAMIC_TYPES.TEAM_FULL_ATTENDANCE]: {
    label: "全勤日",
    tone: "success",
  },
  [TEAM_DYNAMIC_TYPES.STREAK_MILESTONE]: {
    label: "连续打卡",
    tone: "highlight",
  },
  [TEAM_DYNAMIC_TYPES.COFFEE_SUMMARY]: {
    label: "咖啡摘要",
    tone: "default",
  },
  [TEAM_DYNAMIC_TYPES.BOARD_NOTICE_REFERENCE]: {
    label: "公告引用",
    tone: "default",
  },
  [TEAM_DYNAMIC_TYPES.GAME_RARE_PRIZE]: {
    label: "补给高光",
    tone: "highlight",
  },
  [TEAM_DYNAMIC_TYPES.GAME_TASK_STREAK_MILESTONE]: {
    label: "摸鱼自律",
    tone: "success",
  },
  [TEAM_DYNAMIC_TYPES.GAME_BOOST_MILESTONE]: {
    label: "暴击打卡",
    tone: "highlight",
  },
  [TEAM_DYNAMIC_TYPES.GAME_TEAM_BROADCAST]: {
    label: "团队小喇叭",
    tone: "default",
  },
  [TEAM_DYNAMIC_TYPES.GAME_SOCIAL_MOMENT]: {
    label: "牛马互动",
    tone: "success",
  },
};

const TEAM_DYNAMIC_TYPE_VALUES = new Set<TeamDynamicType>(
  Object.values(TEAM_DYNAMIC_TYPES),
);

export function isTeamDynamicType(value: string | null | undefined): value is TeamDynamicType {
  if (!value) {
    return false;
  }

  return TEAM_DYNAMIC_TYPE_VALUES.has(value as TeamDynamicType);
}

export function normalizeTeamDynamicsQuery(
  searchParams: URLSearchParams,
): NormalizedTeamDynamicsQuery {
  const view = searchParams.get("view") === "page" ? "page" : "panel";
  const typeParam = searchParams.get("type");

  return {
    view,
    unreadOnly: searchParams.get("filter") === "unread",
    type: isTeamDynamicType(typeParam) ? typeParam : "ALL",
    limit: view === "page" ? TEAM_DYNAMICS_PAGE_LIMIT : TEAM_DYNAMICS_PANEL_LIMIT,
    cursor: searchParams.get("cursor"),
  };
}

export function getTeamDynamicMeta(type: TeamDynamicType): TeamDynamicMeta {
  return TEAM_DYNAMIC_META[type];
}
