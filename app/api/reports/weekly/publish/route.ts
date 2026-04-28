import { NextRequest, NextResponse } from "next/server";
import {
  publishWeeklyReportDraftWithStatus,
  WeeklyReportServiceError,
} from "@/lib/weekly-report-service";
import { pushWeeklyReportDynamicToWeWork, type WeWorkPushResult } from "@/lib/wework-webhook";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function handleWeeklyReportServiceError(error: unknown) {
  if (error instanceof WeeklyReportServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const { dynamic, created } = await publishWeeklyReportDraftWithStatus({ userId: user.id });
    const weworkPush: WeWorkPushResult = created
      ? await pushWeeklyReportDynamicToWeWork({ dynamic })
      : { status: "skipped", reason: "already-published" };

    return NextResponse.json({ dynamic, weworkPush });
  } catch (error) {
    return handleWeeklyReportServiceError(error);
  }
}
