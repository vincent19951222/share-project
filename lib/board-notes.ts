export const BOARD_NOTE_MAX_LENGTH = 1000;

export const BOARD_NOTE_TYPES = ["FREE", "ANNOUNCEMENT"] as const;
export type BoardNoteType = (typeof BOARD_NOTE_TYPES)[number];

export const BOARD_NOTE_COLORS = ["YELLOW", "BLUE", "GREEN", "PINK"] as const;
export type BoardNoteColor = (typeof BOARD_NOTE_COLORS)[number];

export interface BoardNoteDto {
  id: string;
  type: BoardNoteType;
  content: string;
  color: BoardNoteColor | null;
  pinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarKey: string;
  };
  canDelete: boolean;
}

export interface BoardNoteRecord {
  id: string;
  type: string;
  content: string;
  color: string | null;
  pinned: boolean;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    username: string;
    avatarKey: string;
  };
}

export function isBoardNoteType(value: unknown): value is BoardNoteType {
  return typeof value === "string" && BOARD_NOTE_TYPES.includes(value as BoardNoteType);
}

export function isBoardNoteColor(value: unknown): value is BoardNoteColor {
  return typeof value === "string" && BOARD_NOTE_COLORS.includes(value as BoardNoteColor);
}

export function normalizeBoardNoteInput(body: unknown):
  | { ok: true; value: { type: BoardNoteType; content: string; color: BoardNoteColor | null } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "请求内容无效" };
  }

  const input = body as { type?: unknown; content?: unknown; color?: unknown };

  if (!isBoardNoteType(input.type)) {
    return { ok: false, error: "无效的便签类型" };
  }

  if (typeof input.content !== "string") {
    return { ok: false, error: "内容不能为空" };
  }

  const content = input.content.trim();

  if (content.length === 0) {
    return { ok: false, error: "内容不能为空" };
  }

  if (content.length > BOARD_NOTE_MAX_LENGTH) {
    return { ok: false, error: `内容不能超过 ${BOARD_NOTE_MAX_LENGTH} 字` };
  }

  if (input.type === "ANNOUNCEMENT") {
    return { ok: true, value: { type: input.type, content, color: null } };
  }

  if (input.color === undefined || input.color === null || input.color === "") {
    return { ok: true, value: { type: input.type, content, color: "YELLOW" } };
  }

  if (!isBoardNoteColor(input.color)) {
    return { ok: false, error: "无效的便签颜色" };
  }

  return { ok: true, value: { type: input.type, content, color: input.color } };
}

export function mapBoardNoteToDto(note: BoardNoteRecord, currentUserId: string): BoardNoteDto {
  return {
    id: note.id,
    type: note.type as BoardNoteType,
    content: note.content,
    color: note.color as BoardNoteColor | null,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    author: {
      id: note.author.id,
      name: note.author.username,
      avatarKey: note.author.avatarKey,
    },
    canDelete: note.authorId === currentUserId,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatClock(date)}`;
}

function formatFullDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatClock(date)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff === 0) {
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    return `${hours}小时前`;
  }

  if (dayDiff === 1) {
    return `昨天 ${formatClock(date)}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return formatMonthDay(date);
  }

  return formatFullDate(date);
}
