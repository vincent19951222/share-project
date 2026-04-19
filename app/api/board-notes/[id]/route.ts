import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getCurrentUser(userId: string | undefined) {
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request.cookies.get("userId")?.value);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;

    const note = await prisma.boardNote.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
        authorId: true,
      },
    });

    if (!note || note.teamId !== user.teamId) {
      return NextResponse.json({ error: "便签不存在" }, { status: 404 });
    }

    if (note.authorId !== user.id) {
      return NextResponse.json({ error: "只能删除自己的便签" }, { status: 403 });
    }

    await prisma.boardNote.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
