import { describe, expect, it } from "vitest";
import {
  buildDrinkRecordIdFromCoffeeRecordId,
  mapCoffeeRecordToDrinkRecord,
} from "@/scripts/drink-backfill-utils";

describe("drink record coffee backfill", () => {
  it("maps legacy coffee records to stable americano drink records", () => {
    expect(buildDrinkRecordIdFromCoffeeRecordId("coffee_123")).toBe("drink_coffee_123");
    expect(
      mapCoffeeRecordToDrinkRecord({
        id: "coffee_123",
        userId: "user_1",
        teamId: "team_1",
        dayKey: "2026-06-02",
        createdAt: new Date("2026-06-02T01:30:00.000Z"),
        deletedAt: null,
      }),
    ).toEqual({
      id: "drink_coffee_123",
      userId: "user_1",
      teamId: "team_1",
      dayKey: "2026-06-02",
      drinkType: "americano",
      note: "历史咖啡记录",
      createdAt: new Date("2026-06-02T01:30:00.000Z"),
      deletedAt: null,
    });
  });
});
