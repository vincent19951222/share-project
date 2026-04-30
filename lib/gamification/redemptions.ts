import { getItemDefinition } from "@/lib/gamification/content";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  GamificationRedemptionSnapshot,
  RealWorldRedemptionStatus,
} from "@/lib/types";

type TransactionClient = Prisma.TransactionClient;

type RedemptionRecordForSnapshot = {
  id: string;
  userId: string;
  itemId: string;
  status: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  note: string | null;
  user?: { username: string } | null;
  confirmedByUser?: { username: string } | null;
  cancelledByUser?: { username: string } | null;
};

export class RedemptionServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "RedemptionServiceError";
    this.code = code;
    this.status = status;
  }
}

function trimOptionalNote(note: unknown): string | undefined {
  if (note === undefined || note === null) {
    return undefined;
  }

  if (typeof note !== "string") {
    throw new RedemptionServiceError("备注必须是文本。", "INVALID_REQUEST", 400);
  }

  const trimmed = note.trim();

  if (trimmed.length > 120) {
    throw new RedemptionServiceError("备注最多 120 个字。", "INVALID_REQUEST", 400);
  }

  return trimmed === "" ? undefined : trimmed;
}

function assertRedeemableItem(itemId: string) {
  const definition = getItemDefinition(itemId);

  if (
    !definition ||
    !definition.enabled ||
    definition.category !== "real_world" ||
    definition.useTiming !== "manual_redemption" ||
    !definition.requiresAdminConfirmation ||
    definition.effect.type !== "real_world_redemption"
  ) {
    throw new RedemptionServiceError(
      "这个补给不能申请线下兑换。",
      "ITEM_NOT_REDEEMABLE",
      400,
    );
  }

  return definition;
}

function normalizeStatus(status: string): RealWorldRedemptionStatus {
  if (status === "REQUESTED" || status === "CONFIRMED" || status === "CANCELLED") {
    return status;
  }

  throw new RedemptionServiceError("兑换状态异常。", "INVALID_REDEMPTION_STATUS", 500);
}

function getRedemptionStatusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "待管理员确认";
    case "CONFIRMED":
      return "已确认兑换";
    case "CANCELLED":
      return "已取消，券已返还";
    default:
      return "状态异常";
  }
}

function getRedemptionStatusTone(status: string): GamificationRedemptionSnapshot["statusTone"] {
  switch (status) {
    case "REQUESTED":
      return "warning";
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
      return "muted";
    default:
      return "danger";
  }
}

export function buildRedemptionSnapshot(
  record: RedemptionRecordForSnapshot,
): GamificationRedemptionSnapshot {
  const definition = getItemDefinition(record.itemId);
  const redemptionType =
    definition?.effect.type === "real_world_redemption"
      ? definition.effect.redemptionType
      : "unknown";

  return {
    id: record.id,
    userId: record.userId,
    username: record.user?.username ?? null,
    itemId: record.itemId,
    itemName: definition?.name ?? "未知真实福利",
    redemptionType,
    status: normalizeStatus(record.status),
    statusLabel: getRedemptionStatusLabel(record.status),
    statusTone: getRedemptionStatusTone(record.status),
    requestedAt: record.requestedAt.toISOString(),
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    confirmedByUsername: record.confirmedByUser?.username ?? null,
    cancelledByUsername: record.cancelledByUser?.username ?? null,
    note: record.note,
  };
}

async function decrementInventoryForRequest(input: {
  tx: TransactionClient;
  userId: string;
  itemId: string;
}) {
  const result = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  if (result.count !== 1) {
    throw new RedemptionServiceError(
      "背包里没有可兑换的瑞幸券。",
      "INSUFFICIENT_INVENTORY",
      409,
    );
  }
}

async function refundInventory(input: {
  tx: TransactionClient;
  userId: string;
  teamId: string;
  itemId: string;
}) {
  await input.tx.inventoryItem.upsert({
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
      quantity: 1,
    },
    update: {
      quantity: { increment: 1 },
    },
  });
}

const redemptionInclude = {
  user: { select: { username: true } },
  confirmedByUser: { select: { username: true } },
  cancelledByUser: { select: { username: true } },
} satisfies Prisma.RealWorldRedemptionInclude;

async function loadRedemptionStatus(input: {
  tx: TransactionClient;
  teamId: string;
  redemptionId: string;
}) {
  return input.tx.realWorldRedemption.findFirst({
    where: {
      id: input.redemptionId,
      teamId: input.teamId,
    },
    select: { status: true },
  });
}

async function assertAdminInTeam(input: {
  tx: TransactionClient;
  adminUserId: string;
  teamId: string;
}) {
  const admin = await input.tx.user.findFirst({
    where: {
      id: input.adminUserId,
      teamId: input.teamId,
      role: "ADMIN",
    },
    select: { id: true },
  });

  if (!admin) {
    throw new RedemptionServiceError("只有本队管理员可以处理兑换。", "FORBIDDEN", 403);
  }
}

export async function requestRealWorldRedemption(input: {
  userId: string;
  teamId: string;
  itemId: string;
}) {
  assertRedeemableItem(input.itemId);

  const record = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        id: input.userId,
        teamId: input.teamId,
      },
      select: { id: true },
    });

    if (!user) {
      throw new RedemptionServiceError("用户不存在。", "UNAUTHORIZED", 401);
    }

    await decrementInventoryForRequest({
      tx,
      userId: input.userId,
      itemId: input.itemId,
    });

    return tx.realWorldRedemption.create({
      data: {
        userId: input.userId,
        teamId: input.teamId,
        itemId: input.itemId,
        status: "REQUESTED",
      },
      include: redemptionInclude,
    });
  });

  return buildRedemptionSnapshot(record);
}

export async function confirmRealWorldRedemption(input: {
  adminUserId: string;
  teamId: string;
  redemptionId: string;
  note?: unknown;
}) {
  const note = trimOptionalNote(input.note);

  const record = await prisma.$transaction(async (tx) => {
    await assertAdminInTeam({
      tx,
      adminUserId: input.adminUserId,
      teamId: input.teamId,
    });

    const updated = await tx.realWorldRedemption.updateMany({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
        status: "REQUESTED",
      },
      data: {
        status: "CONFIRMED",
        confirmedByUserId: input.adminUserId,
        confirmedAt: new Date(),
        note,
      },
    });

    if (updated.count !== 1) {
      const existing = await loadRedemptionStatus({
        tx,
        teamId: input.teamId,
        redemptionId: input.redemptionId,
      });

      throw new RedemptionServiceError(
        existing ? "这张券不是待确认状态。" : "兑换记录不存在。",
        existing ? "REDEMPTION_NOT_REQUESTED" : "REDEMPTION_NOT_FOUND",
        existing ? 409 : 404,
      );
    }

    return tx.realWorldRedemption.findUniqueOrThrow({
      where: { id: input.redemptionId },
      include: redemptionInclude,
    });
  });

  return buildRedemptionSnapshot(record);
}

export async function cancelRealWorldRedemption(input: {
  adminUserId: string;
  teamId: string;
  redemptionId: string;
  note?: unknown;
}) {
  const note = trimOptionalNote(input.note);

  const record = await prisma.$transaction(async (tx) => {
    await assertAdminInTeam({
      tx,
      adminUserId: input.adminUserId,
      teamId: input.teamId,
    });

    const existing = await tx.realWorldRedemption.findFirst({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        itemId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new RedemptionServiceError("兑换记录不存在。", "REDEMPTION_NOT_FOUND", 404);
    }

    const updated = await tx.realWorldRedemption.updateMany({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
        status: "REQUESTED",
      },
      data: {
        status: "CANCELLED",
        cancelledByUserId: input.adminUserId,
        cancelledAt: new Date(),
        note,
      },
    });

    if (updated.count !== 1) {
      throw new RedemptionServiceError(
        "这张券不是待确认状态。",
        "REDEMPTION_NOT_REQUESTED",
        409,
      );
    }

    await refundInventory({
      tx,
      userId: existing.userId,
      teamId: existing.teamId,
      itemId: existing.itemId,
    });

    return tx.realWorldRedemption.findUniqueOrThrow({
      where: { id: input.redemptionId },
      include: redemptionInclude,
    });
  });

  return buildRedemptionSnapshot(record);
}
