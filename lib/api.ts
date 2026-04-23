import type {
  BoardSnapshot,
  CalendarMonthSnapshot,
  CoffeeSnapshot,
} from "@/lib/types";

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
