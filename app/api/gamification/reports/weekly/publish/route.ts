import { NextRequest, NextResponse } from "next/server";
import {
  publishGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function weeklyReportErrorResponse(error: unknown) {
  if (error instanceof WeeklyReportError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "牛马补给周报发布失败", code: "WEEKLY_REPORT_PUBLISH_FAILED" },
    { status: 500 },
  );
}

async function readPublishBody(request: NextRequest) {
  try {
    return (await request.json()) as {
      weekStartDayKey?: unknown;
      sendEnterpriseWechat?: unknown;
    };
  } catch {
    return {};
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

    const body = await readPublishBody(request);
    const result = await publishGamificationWeeklyReport({
      teamId: user.teamId,
      publisherUserId: user.id,
      weekStartDayKey:
        typeof body.weekStartDayKey === "string" ? body.weekStartDayKey : "",
      sendEnterpriseWechat: body.sendEnterpriseWechat === true,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return weeklyReportErrorResponse(error);
  }
}
