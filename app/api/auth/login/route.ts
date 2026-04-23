import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCookieValue, verifyPassword, hashPassword } from "@/lib/auth";
import { isValidAvatarKey } from "@/lib/avatars";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, avatarKey } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (user) {
      // Login existing user
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, avatarKey: user.avatarKey, coins: user.coins },
      });
      response.cookies.set("userId", createCookieValue(user.id), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // Register new user
    if (!avatarKey || !isValidAvatarKey(avatarKey)) {
      return NextResponse.json({ error: "请选择头像" }, { status: 400 });
    }

    const teams = await prisma.team.findMany();
    if (teams.length === 0) {
      return NextResponse.json({ error: "没有可用的团队" }, { status: 500 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        avatarKey,
        coins: 0,
        teamId: teams[0].id,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, avatarKey: newUser.avatarKey, coins: newUser.coins },
    });
    response.cookies.set("userId", createCookieValue(newUser.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
