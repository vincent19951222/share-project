import type { BoardSnapshot, CoffeeSnapshot } from "@/lib/types";

async function readSnapshot(response: Response): Promise<BoardSnapshot> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload.snapshot as BoardSnapshot;
}

export async function fetchBoardState(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/state", {
    cache: "no-store",
  });

  return readSnapshot(response);
}

export async function submitTodayPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "POST",
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
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readSnapshot(response);
}

async function readCoffeeSnapshot(response: Response): Promise<CoffeeSnapshot> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload.snapshot as CoffeeSnapshot;
}

export async function fetchCoffeeState(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/state", {
    cache: "no-store",
  });

  return readCoffeeSnapshot(response);
}

export async function addTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readCoffeeSnapshot(response);
}

export async function removeLatestTodayCoffeeCup(): Promise<CoffeeSnapshot> {
  const response = await fetch("/api/coffee/cups/latest", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readCoffeeSnapshot(response);
}
