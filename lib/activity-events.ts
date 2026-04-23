export const ACTIVITY_EVENT_TYPES = {
  PUNCH: "PUNCH",
  UNDO_PUNCH: "UNDO_PUNCH",
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

export function buildPunchActivityMessage(username: string, reward: number) {
  return `${username} 刚刚打卡，拿下 ${reward} 银子`;
}

export function buildUndoPunchActivityMessage(username: string) {
  return `${username} 撤销了今天的打卡`;
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
