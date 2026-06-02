import { buildDrinkSnapshotForUser } from "@/lib/drink-state";
import type { CoffeeSnapshot, DrinkSnapshot } from "@/lib/types";

export function mapDrinkSnapshotToCoffeeSnapshot(snapshot: DrinkSnapshot): CoffeeSnapshot {
  return {
    members: snapshot.members,
    gridData: snapshot.gridData.map((row) => row.map((cell) => ({ cups: cell.cups }))),
    today: snapshot.today,
    totalDays: snapshot.totalDays,
    currentUserId: snapshot.currentUserId,
    stats: {
      todayTotalCups: snapshot.stats.todayTotalCups,
      todayDrinkers: snapshot.stats.todayDrinkers,
      currentUserTodayCups: snapshot.stats.currentUserTodayCups,
      coffeeKing: snapshot.stats.drinkKing,
    },
  };
}

export async function buildCoffeeCompatibleSnapshotForUser(userId: string) {
  const snapshot = await buildDrinkSnapshotForUser(userId);
  return snapshot ? mapDrinkSnapshotToCoffeeSnapshot(snapshot) : null;
}
