import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClientOrTransaction } from "@/lib/prisma";

type DbClient = PrismaClientOrTransaction;

interface AdjustLotteryTicketsInput {
  userId: string;
  teamId: string;
  dayKey: string;
  delta: number;
  reason: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: unknown;
  db?: DbClient;
}

interface AdjustInventoryItemInput {
  userId: string;
  teamId: string;
  itemId: string;
  delta: number;
  db?: DbClient;
}

function runInTransaction<T>(
  db: DbClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if ("$transaction" in db) {
    return db.$transaction(callback);
  }

  return callback(db);
}

export async function adjustLotteryTickets(input: AdjustLotteryTicketsInput) {
  const db = input.db ?? prisma;

  if (input.delta === 0) {
    throw new Error("Lottery ticket delta cannot be 0");
  }

  return runInTransaction(db, async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    const balanceAfter = user.ticketBalance + input.delta;

    if (balanceAfter < 0) {
      throw new Error("Ticket balance cannot be negative");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { ticketBalance: balanceAfter },
    });

    return tx.lotteryTicketLedger.create({
      data: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: input.dayKey,
        delta: input.delta,
        balanceAfter,
        reason: input.reason,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadataJson: input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
      },
    });
  });
}

export async function adjustInventoryItem(input: AdjustInventoryItemInput) {
  const db = input.db ?? prisma;

  if (input.delta === 0) {
    throw new Error("Inventory delta cannot be 0");
  }

  return runInTransaction(db, async (tx) => {
    const existing = await tx.inventoryItem.findUnique({
      where: {
        userId_itemId: {
          userId: input.userId,
          itemId: input.itemId,
        },
      },
    });

    const nextQuantity = (existing?.quantity ?? 0) + input.delta;

    if (nextQuantity < 0) {
      throw new Error("Inventory quantity cannot be negative");
    }

    return tx.inventoryItem.upsert({
      where: {
        userId_itemId: {
          userId: input.userId,
          itemId: input.itemId,
        },
      },
      create: {
        userId: input.userId,
        teamId: input.teamId,
        itemId: input.itemId,
        quantity: nextQuantity,
      },
      update: {
        quantity: nextQuantity,
      },
    });
  });
}
