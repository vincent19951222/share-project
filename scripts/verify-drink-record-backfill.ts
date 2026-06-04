import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  buildDrinkRecordIdFromCoffeeRecordId,
  mapCoffeeRecordToDrinkRecord,
  type LegacyCoffeeRecord,
} from "@/scripts/drink-backfill-utils";

interface BackfillVerifierClient {
  coffeeRecord: {
    findMany: () => Promise<LegacyCoffeeRecord[]>;
  };
  drinkRecord: {
    findUnique: (input: {
      where: { id: string };
    }) => Promise<{
      id: string;
      userId: string;
      teamId: string;
      dayKey: string;
      drinkType: string;
      note: string | null;
      createdAt: Date;
      deletedAt: Date | null;
    } | null>;
  };
}

function sameOptionalDate(left: Date | null, right: Date | null) {
  if (left === null || right === null) {
    return left === right;
  }

  return left.getTime() === right.getTime();
}

function assertEqual(
  coffeeRecordId: string,
  field: string,
  actual: unknown,
  expected: unknown,
) {
  if (actual !== expected) {
    throw new Error(`Backfill mismatch for ${coffeeRecordId}: ${field}`);
  }
}

export async function verifyDrinkRecordBackfill(client: BackfillVerifierClient = prisma) {
  const coffeeRecords = await client.coffeeRecord.findMany();

  for (const coffeeRecord of coffeeRecords) {
    const expected = mapCoffeeRecordToDrinkRecord(coffeeRecord);
    const actual = await client.drinkRecord.findUnique({
      where: { id: buildDrinkRecordIdFromCoffeeRecordId(coffeeRecord.id) },
    });

    if (!actual) {
      throw new Error(`Backfill missing for ${coffeeRecord.id}`);
    }

    assertEqual(coffeeRecord.id, "userId", actual.userId, expected.userId);
    assertEqual(coffeeRecord.id, "teamId", actual.teamId, expected.teamId);
    assertEqual(coffeeRecord.id, "dayKey", actual.dayKey, expected.dayKey);
    assertEqual(coffeeRecord.id, "drinkType", actual.drinkType, expected.drinkType);
    assertEqual(coffeeRecord.id, "note", actual.note, expected.note);

    if (actual.createdAt.getTime() !== expected.createdAt.getTime()) {
      throw new Error(`Backfill mismatch for ${coffeeRecord.id}: createdAt`);
    }

    if (!sameOptionalDate(actual.deletedAt, expected.deletedAt)) {
      throw new Error(`Backfill mismatch for ${coffeeRecord.id}: deletedAt`);
    }
  }

  return {
    checked: coffeeRecords.length,
  };
}

async function main() {
  const result = await verifyDrinkRecordBackfill();
  console.log(`Backfill verified: checked=${result.checked}`);
}

if (process.argv[1]?.endsWith("verify-drink-record-backfill.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
