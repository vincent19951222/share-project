import { NextRequest, NextResponse } from "next/server";
import {
  buildGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";
import { loadCurrentUser } from "@/lib/session";

function weeklyReportErrorResponse(error: unknown) {
  if (error instanceof WeeklyReportError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "牛马补给周报加载失败", code: "WEEKLY_REPORT_LOAD_FAILED" },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await buildGamificationWeeklyReport({
      teamId: user.teamId,
      weekStartDayKey: request.nextUrl.searchParams.get("weekStart") ?? undefined,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    return weeklyReportErrorResponse(error);
  }
}
