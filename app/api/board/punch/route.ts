import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  PUNCH_REWARD_COINS,
  buildBoardSnapshotForUser,
  getCurrentBoardDay,
} from "@/lib/board-state";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const today = getCurrentBoardDay();

    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.punchRecord.updateMany({
          where: {
            userId: user.id,
            dayIndex: today,
            punched: false,
          },
          data: {
            punched: true,
            punchType: "default",
          },
        });

        if (updated.count === 0) {
          await tx.punchRecord.create({
            data: {
              userId: user.id,
              dayIndex: today,
              punched: true,
              punchType: "default",
            },
          });
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            coins: {
              increment: PUNCH_REWARD_COINS,
            },
          },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ error: "今天已经打过卡了" }, { status: 409 });
      }

      throw error;
    }

    const snapshot = await buildBoardSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
