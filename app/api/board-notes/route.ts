import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCookieValue } from "@/lib/auth";
import {
  type BoardNoteRecord,
  mapBoardNoteToDto,
  normalizeBoardNoteInput,
} from "@/lib/board-notes";

async function getCurrentUser(userId: string | undefined) {
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(parseCookieValue(request.cookies.get("userId")?.value) ?? undefined);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const notes: BoardNoteRecord[] = await prisma.boardNote.findMany({
      where: {
        teamId: user.teamId,
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarKey: true,
          },
        },
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      notes: notes.map((note) => mapBoardNoteToDto(note, user.id)),
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(parseCookieValue(request.cookies.get("userId")?.value) ?? undefined);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const normalized = normalizeBoardNoteInput(body);

    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const note: BoardNoteRecord = await prisma.boardNote.create({
      data: {
        teamId: user.teamId,
        authorId: user.id,
        type: normalized.value.type,
        content: normalized.value.content,
        color: normalized.value.color,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarKey: true,
          },
        },
      },
    });

    return NextResponse.json({
      note: mapBoardNoteToDto(note, user.id),
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
