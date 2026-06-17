import { afterEach, describe, expect, it, vi } from "vitest";
import { addDrinkRecord, fetchDrinkState, removeLatestDrinkRecord } from "@/lib/api";

const drinkSnapshot = {
  members: [],
  gridData: [],
  today: 2,
  totalDays: 30,
  currentUserId: "u1",
  todayEvents: [],
  stats: {
    todayTotalCups: 0,
    todayDrinkers: 0,
    currentUserTodayCups: 0,
    drinkKing: null,
    favoriteDrink: null,
    latestDrink: null,
    drinkCounts: { water: 0, milkTea: 0, americano: 0, latte: 0, other: 0 },
  },
};

describe("drink API helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls drink endpoints with the expected methods and payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: drinkSnapshot }),
      }),
    );

    await expect(fetchDrinkState()).resolves.toEqual(drinkSnapshot);
    await expect(
      addDrinkRecord({ drinkType: "water", note: "早起一杯", dayKey: "2026-06-16" }),
    ).resolves.toEqual(drinkSnapshot);
    await expect(removeLatestDrinkRecord("water")).resolves.toEqual(drinkSnapshot);

    expect(fetch).toHaveBeenCalledWith("/api/drinks/state", expect.objectContaining({ method: "GET" }));
    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ drinkType: "water", note: "早起一杯", dayKey: "2026-06-16" }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/drinks/records/latest",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ drinkType: "water" }),
      }),
    );
  });
});
