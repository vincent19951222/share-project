import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addTodayCoffeeCup,
  fetchCoffeeState,
  removeLatestTodayCoffeeCup,
} from "@/lib/api";

const coffeeSnapshot = {
  members: [{ id: "u1", name: "li", avatarKey: "male1" }],
  gridData: [[{ cups: 1 }]],
  today: 1,
  totalDays: 1,
  currentUserId: "u1",
  stats: {
    todayTotalCups: 1,
    todayDrinkers: 1,
    currentUserTodayCups: 1,
    coffeeKing: { userId: "u1", name: "li", cups: 1 },
  },
};

describe("coffee api helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the coffee snapshot without cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: coffeeSnapshot }),
      }),
    );

    await expect(fetchCoffeeState()).resolves.toEqual(coffeeSnapshot);
    expect(fetch).toHaveBeenCalledWith("/api/coffee/state", { cache: "no-store" });
  });

  it("adds and removes today's latest coffee cup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: coffeeSnapshot }),
      }),
    );

    await expect(addTodayCoffeeCup()).resolves.toEqual(coffeeSnapshot);
    await expect(removeLatestTodayCoffeeCup()).resolves.toEqual(coffeeSnapshot);

    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/coffee/cups/latest",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
