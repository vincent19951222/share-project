import type {
  AiImageGenerationTaskSnapshot,
  AiImageThemeSnapshot,
  BoardSnapshot,
  CalendarMonthSnapshot,
  CoffeeSnapshot,
  DashboardScope,
  DashboardSnapshot,
  DrinkSnapshot,
  GamificationLotteryDrawSnapshot,
  GamificationRedemptionSnapshot,
  GamificationStateSnapshot,
  SupplyStationProductionSnapshot,
  TeamDashboardSnapshot,
} from "@/lib/types";
import { scopeToQuery } from "@/lib/dashboard-scope";
import type { DrinkType } from "@/lib/drinks";
import type { WorkoutTicketPayload } from "@/lib/workouts";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

export async function submitTodayPunch(payload: WorkoutTicketPayload): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readSnapshot(response);
}

export async function updateTodayWorkout(payload: WorkoutTicketPayload): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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

export async function submitYesterdayMakeupPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch/makeup-yesterday", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readSnapshot(response);
}

export async function submitAdminMakeupPunch(input: {
  targetUserId: string;
  dayKey: string;
}): Promise<BoardSnapshot> {
  const response = await fetch("/api/admin/board/makeup-punch", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
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

async function readDrinkSnapshot(response: Response): Promise<DrinkSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as DrinkSnapshot;
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

async function readDashboardSnapshot(response: Response): Promise<DashboardSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as DashboardSnapshot;
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

export async function fetchDrinkState(): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/state", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  return readDrinkSnapshot(response);
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

export async function fetchDashboardState(scope: DashboardScope): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard/state?${scopeToQuery(scope)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readDashboardSnapshot(response);
}

export async function fetchTeamDashboardState(
  scope: DashboardScope,
): Promise<TeamDashboardSnapshot> {
  const response = await fetch(`/api/dashboard/team-state?${scopeToQuery(scope)}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{ snapshot: TeamDashboardSnapshot }>(
    response,
    "获取团队战报失败",
  );
  return payload.snapshot;
}

export async function fetchGamificationState(): Promise<GamificationStateSnapshot> {
  const response = await fetch("/api/gamification/state", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readGamificationSnapshot(response);
}

export async function fetchSupplyStationState(): Promise<SupplyStationProductionSnapshot> {
  const response = await fetch("/api/gamification/supply/state", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await readApiResult<{
    snapshot: SupplyStationProductionSnapshot;
  }>(response, "获取牛马补给站失败");

  return payload.snapshot;
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

export async function purchaseGamificationShopItem(itemId: string): Promise<{
  purchase: {
    id: string;
    itemId: string;
    totalPriceCoins: number;
  };
  snapshot: GamificationStateSnapshot;
}> {
  const response = await fetch("/api/gamification/shop/purchase", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itemId }),
  });

  return readApiResult(response, "购买补给响应解析失败");
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

export async function dismissSocialInvitation(payload: { invitationId: string }): Promise<{
  snapshot: GamificationStateSnapshot;
  invitation: {
    id: string;
    status: string;
  };
}> {
  const response = await fetch("/api/gamification/social/dismiss", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "忽略队友邀请失败");
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

export async function addDrinkRecord(input: {
  drinkType: DrinkType;
  note?: string | null;
  dayKey?: string;
}): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/records", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readDrinkSnapshot(response);
}

export async function removeLatestDrinkRecord(drinkType?: DrinkType): Promise<DrinkSnapshot> {
  const response = await fetch("/api/drinks/records/latest", {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(drinkType ? { drinkType } : {}),
  });

  return readDrinkSnapshot(response);
}

export async function createAiImageGenerationTask(payload: {
  themeId: string;
  userPrompt?: string;
  requestedCount: 1 | 2 | 4;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
}): Promise<{ taskId: string }> {
  const response = await fetch("/api/gamification/ai-image/tasks", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "创建生图任务失败");
}

export async function fetchAiImageGenerationTask(
  taskId: string,
): Promise<{ task: AiImageGenerationTaskSnapshot }> {
  const response = await fetch(`/api/gamification/ai-image/tasks/${taskId}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readApiResult(response, "获取生图任务失败");
}

export async function retryAiImageGenerationTask(taskId: string): Promise<{ taskId: string }> {
  const response = await fetch(`/api/gamification/ai-image/tasks/${taskId}/retry`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readApiResult(response, "重试生图任务失败");
}

export async function drawAiImageThemeFromSupply(): Promise<{ theme: AiImageThemeSnapshot }> {
  const response = await fetch("/api/gamification/ai-image/themes/draw", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readApiResult(response, "抽取生图主题失败");
}
