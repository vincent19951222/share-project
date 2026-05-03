import type {
  BoardSnapshot,
  CalendarMonthSnapshot,
  CoffeeSnapshot,
  GamificationLotteryDrawSnapshot,
  GamificationRedemptionSnapshot,
  GamificationStateSnapshot,
  GamificationWeeklyReportPublishResult,
  GamificationWeeklyReportSnapshot,
} from "@/lib/types";
import type { WeeklyReportSnapshot } from "@/lib/weekly-report";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface WeeklyReportDraftRecord {
  id: string;
  teamId: string;
  createdByUserId: string;
  weekStartDayKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  snapshot: WeeklyReportSnapshot;
}

export interface WeeklyReportPublishResult {
  id: string;
}

interface WeeklyReportDraftEnvelope {
  draft: WeeklyReportDraftRecord | null;
}

interface WeeklyReportPublishEnvelope {
  dynamic: WeeklyReportPublishResult;
}

async function readJsonPayload(
  response: Response,
  fallbackMessage: string,
): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError(fallbackMessage, response.status);
  }
}

async function readApiResult<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = await readJsonPayload(response, fallbackMessage);

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload as T;
}

async function readSnapshot(response: Response): Promise<BoardSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as BoardSnapshot;
}

export async function fetchBoardState(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/state", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readSnapshot(response);
}

export async function submitTodayPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readSnapshot(response);
}

export async function deleteTodayPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readSnapshot(response);
}

async function readCoffeeSnapshot(response: Response): Promise<CoffeeSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as CoffeeSnapshot;
}

async function readCalendarSnapshot(
  response: Response,
): Promise<CalendarMonthSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as CalendarMonthSnapshot;
}

async function readGamificationSnapshot(
  response: Response,
): Promise<GamificationStateSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as GamificationStateSnapshot;
}

export async function fetchCoffeeState(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/state", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readCoffeeSnapshot(response);
}

export async function fetchCalendarState(
  monthKey?: string,
): Promise<CalendarMonthSnapshot> {
  const search = monthKey
    ? `?${new URLSearchParams({ month: monthKey }).toString()}`
    : "";
  const response = await fetch(`/api/calendar/state${search}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readCalendarSnapshot(response);
}

export async function fetchGamificationState(): Promise<GamificationStateSnapshot> {
  const response = await fetch("/api/gamification/state", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readGamificationSnapshot(response);
}

export async function fetchGamificationWeeklyReport(
  weekStartDayKey?: string,
): Promise<GamificationWeeklyReportSnapshot> {
  const search = weekStartDayKey
    ? `?${new URLSearchParams({ weekStart: weekStartDayKey }).toString()}`
    : "";
  const response = await fetch(`/api/gamification/reports/weekly${search}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{
    snapshot: GamificationWeeklyReportSnapshot;
  }>(response, "获取牛马补给周报失败");

  return payload.snapshot;
}

export async function publishGamificationWeeklyReportRequest(input: {
  weekStartDayKey: string;
  sendEnterpriseWechat: boolean;
}): Promise<GamificationWeeklyReportPublishResult> {
  const response = await fetch("/api/gamification/reports/weekly/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readApiResult<{
    result: GamificationWeeklyReportPublishResult;
  }>(response, "发布牛马补给周报失败");

  return payload.result;
}

async function postGamificationAction(
  path: string,
  body: Record<string, unknown> = {},
): Promise<GamificationStateSnapshot> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return readGamificationSnapshot(response);
}

export async function ensureTodayGamificationTasks(): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/ensure-today");
}

export async function completeGamificationTask({
  dimensionKey,
  completionText,
}: {
  dimensionKey: string;
  completionText?: string;
}): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/complete", {
    dimensionKey,
    completionText,
  });
}

export async function rerollGamificationTask({
  dimensionKey,
}: {
  dimensionKey: string;
}): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/reroll", {
    dimensionKey,
  });
}

export async function claimGamificationLifeTicket(): Promise<GamificationStateSnapshot> {
  return postGamificationAction("/api/gamification/tasks/claim-ticket");
}

export interface UseGamificationItemRequest {
  itemId: string;
  target?: {
    dimensionKey?: "movement" | "hydration" | "social" | "learning";
    recipientUserId?: string;
    message?: string;
  };
}

export async function useGamificationItem(payload: UseGamificationItemRequest): Promise<{
  snapshot: GamificationStateSnapshot;
  itemUse: {
    id: string;
    itemId: string;
    status: "PENDING" | "SETTLED";
    targetType: string | null;
    targetId: string | null;
    inventoryConsumed: boolean;
    message: string;
  };
}> {
  const response = await fetch("/api/gamification/items/use", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "道具使用响应解析失败");
}

export async function respondToSocialInvitation(payload: {
  invitationId: string;
  responseText?: string;
}): Promise<{
  snapshot: GamificationStateSnapshot;
  response: {
    id: string;
    invitationId: string;
    responderUserId: string;
    responseText: string | null;
  };
}> {
  const response = await fetch("/api/gamification/social/respond", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "social response parse failed");
}

async function readRedemptionPayload(response: Response): Promise<{
  redemption: GamificationRedemptionSnapshot;
  inventory?: { itemId: string; quantity: number };
}> {
  return readApiResult<{
    redemption: GamificationRedemptionSnapshot;
    inventory?: { itemId: string; quantity: number };
  }>(response, "兑换响应解析失败");
}

export async function requestRealWorldRedemption(itemId: string) {
  const response = await fetch("/api/gamification/redemptions/request", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itemId }),
  });

  return readRedemptionPayload(response);
}

export async function confirmRealWorldRedemption(redemptionId: string) {
  const response = await fetch("/api/admin/gamification/redemptions/confirm", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ redemptionId }),
  });

  return readRedemptionPayload(response);
}

export async function cancelRealWorldRedemption(redemptionId: string) {
  const response = await fetch("/api/admin/gamification/redemptions/cancel", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ redemptionId }),
  });

  return readRedemptionPayload(response);
}

export async function drawGamificationLottery({
  drawType,
  useCoinTopUp = false,
}: {
  drawType: "SINGLE" | "TEN";
  useCoinTopUp?: boolean;
}): Promise<{
  snapshot: GamificationStateSnapshot;
  draw: GamificationLotteryDrawSnapshot;
}> {
  const response = await fetch("/api/gamification/lottery/draw", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ drawType, useCoinTopUp }),
  });

  return readApiResult<{
    snapshot: GamificationStateSnapshot;
    draw: GamificationLotteryDrawSnapshot;
  }>(response, "抽奖响应解析失败");
}

export async function addTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readCoffeeSnapshot(response);
}

export async function removeLatestTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups/latest", {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readCoffeeSnapshot(response);
}

export async function fetchCurrentWeeklyReportDraft(): Promise<WeeklyReportDraftRecord | null> {
  const response = await fetch("/api/reports/weekly/draft", {
    cache: "no-store",
    credentials: "same-origin",
  });

  const payload = await readApiResult<WeeklyReportDraftEnvelope>(response, "获取本周周报草稿失败");
  return payload.draft ?? null;
}

export async function generateCurrentWeeklyReportDraft(): Promise<WeeklyReportDraftRecord> {
  const response = await fetch("/api/reports/weekly/draft", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = await readApiResult<WeeklyReportDraftEnvelope>(response, "生成本周周报失败");

  if (!payload.draft) {
    throw new ApiError("生成本周周报失败", response.status);
  }

  return payload.draft;
}

export async function publishCurrentWeeklyReportDraft(): Promise<WeeklyReportPublishResult> {
  const response = await fetch("/api/reports/weekly/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = await readApiResult<WeeklyReportPublishEnvelope>(response, "发布本周周报失败");
  return payload.dynamic;
}
