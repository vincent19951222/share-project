export const ACTIVITY_EVENT_TYPES = {
  PUNCH: "PUNCH",
  UNDO_PUNCH: "UNDO_PUNCH",
  COFFEE_ADD: "COFFEE_ADD",
  COFFEE_REMOVE: "COFFEE_REMOVE",
} as const;

export type ActivityEventType =
  (typeof ACTIVITY_EVENT_TYPES)[keyof typeof ACTIVITY_EVENT_TYPES];

export interface ActivityEventDto {
  id: string;
  type: string;
  text: string;
  assetAwarded: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarKey: string;
  };
}

export interface ActivityEventWithUser {
  id: string;
  type: string;
  message: string;
  assetAwarded: number | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    avatarKey: string;
  };
}

export function buildPunchActivityMessage(username: string, reward: number, boostLabel?: string | null) {
  if (boostLabel) {
    return `${username} 刚刚打卡，拿下 ${reward} 银子，${boostLabel}生效`;
  }

  return `${username} 刚刚打卡，拿下 ${reward} 银子`;
}

export function buildUndoPunchActivityMessage(username: string, consumedBoostLabel?: string | null) {
  if (consumedBoostLabel) {
    return `${username} 撤销了今天的打卡，已消耗的${consumedBoostLabel}不返还`;
  }

  return `${username} 撤销了今天的打卡`;
}

export function buildCoffeeAddActivityMessage(username: string, totalCups: number) {
  return `${username} 续命 1 杯，今日累计 ${totalCups} 杯`;
}

export function buildCoffeeRemoveActivityMessage(username: string, totalCups: number) {
  return `${username} 撤回 1 杯咖啡，今日累计 ${totalCups} 杯`;
}

export function getActivityEventTypesByKind(kind: string | null | undefined) {
  if (kind === "punch") {
    return [ACTIVITY_EVENT_TYPES.PUNCH, ACTIVITY_EVENT_TYPES.UNDO_PUNCH];
  }

  if (kind === "coffee") {
    return [ACTIVITY_EVENT_TYPES.COFFEE_ADD, ACTIVITY_EVENT_TYPES.COFFEE_REMOVE];
  }

  return null;
}

export function mapActivityEventToDto(event: ActivityEventWithUser): ActivityEventDto {
  return {
    id: event.id,
    type: event.type,
    text: event.message,
    assetAwarded: event.assetAwarded,
    createdAt: event.createdAt.toISOString(),
    user: {
      id: event.user.id,
      name: event.user.username,
      avatarKey: event.user.avatarKey,
    },
  };
}
