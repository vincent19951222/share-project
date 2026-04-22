import { NextRequest, NextResponse } from "next/server";
import { createSeasonForTeam, listSeasonsForTeam, SeasonServiceError } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function handleSeasonServiceError(error: unknown) {
  if (error instanceof SeasonServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const seasons = await listSeasonsForTeam(user.teamId);
    return NextResponse.json({ seasons });
  } catch (error) {
    return handleSeasonServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { goalName, targetSlots } = body as {
      goalName?: unknown;
      targetSlots?: unknown;
    };

    const season = await createSeasonForTeam(user.teamId, { goalName, targetSlots });
    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    if (error instanceof SeasonServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
