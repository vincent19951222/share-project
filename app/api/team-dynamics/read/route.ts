import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import {
  markAllTeamDynamicsRead,
  markTeamDynamicRead,
} from "@/lib/team-dynamics-service";

type MarkReadBody =
  | {
      mode?: "single";
      id?: string;
    }
  | {
      mode?: "all";
    }
  | null;

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as MarkReadBody;

    if (!body?.mode) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.mode === "single") {
      if (!("id" in body) || typeof body.id !== "string" || body.id.trim() === "") {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }

      await markTeamDynamicRead({
        userId: user.id,
        teamDynamicId: body.id,
      });

      return NextResponse.json({ ok: true });
    }

    await markAllTeamDynamicsRead({
      userId: user.id,
      teamId: user.teamId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[team-dynamics] mark-read failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
