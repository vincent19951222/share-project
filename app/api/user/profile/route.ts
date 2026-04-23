import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAvatarKey } from "@/lib/avatars";
import { parseCookieValue } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const body = await request.json();
    const { username, avatarKey } = body;

    if (avatarKey !== undefined && !isValidAvatarKey(avatarKey)) {
      return NextResponse.json({ error: "无效的头像" }, { status: 400 });
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length === 0) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "用户名已被占用" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username: username.trim() }),
        ...(avatarKey !== undefined && { avatarKey }),
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        avatarKey: updatedUser.avatarKey,
        coins: updatedUser.coins,
      },
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
