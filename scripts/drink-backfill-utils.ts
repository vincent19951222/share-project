import type { DrinkType } from "@/lib/drinks";

export interface LegacyCoffeeRecord {
  id: string;
  userId: string;
  teamId: string;
  dayKey: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export function buildDrinkRecordIdFromCoffeeRecordId(coffeeRecordId: string) {
  return `drink_${coffeeRecordId}`;
}

export function mapCoffeeRecordToDrinkRecord(record: LegacyCoffeeRecord) {
  return {
    id: buildDrinkRecordIdFromCoffeeRecordId(record.id),
    userId: record.userId,
    teamId: record.teamId,
    dayKey: record.dayKey,
    drinkType: "americano" satisfies DrinkType,
    note: "历史咖啡记录",
    createdAt: record.createdAt,
    deletedAt: record.deletedAt,
  };
}
