import { NextRequest, NextResponse } from "next/server";
import { endActiveSeasonForTeam, SeasonNotFoundError, SeasonServiceError } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const season = await endActiveSeasonForTeam(user.teamId);
    return NextResponse.json({ season });
  } catch (error) {
    if (error instanceof SeasonNotFoundError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    if (error instanceof SeasonServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
