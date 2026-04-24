import { NextRequest, NextResponse } from "next/server";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  getActivityEventTypesByKind,
  mapActivityEventToDto,
} from "@/lib/activity-events";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/session";

const RECENT_ACTIVITY_LIMIT = 50;
const RECENT_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kind = request.nextUrl.searchParams.get("kind");
    const typeFilter = getActivityEventTypesByKind(kind);
    const since =
      kind === "coffee"
        ? new Date(`${getShanghaiDayKey()}T00:00:00+08:00`)
        : new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MS);
    const events = await prisma.activityEvent.findMany({
      where: {
        teamId: user.teamId,
        createdAt: {
          gte: since,
        },
        ...(typeFilter ? { type: { in: typeFilter } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarKey: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ACTIVITY_LIMIT,
    });

    return NextResponse.json({
      events: events.map(mapActivityEventToDto),
    });
  } catch (error) {
    console.error("[activity-events] failed to load recent events", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
