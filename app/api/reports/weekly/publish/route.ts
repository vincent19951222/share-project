import { NextRequest, NextResponse } from "next/server";
import { publishWeeklyReportDraft, WeeklyReportServiceError } from "@/lib/weekly-report-service";
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

    const dynamic = await publishWeeklyReportDraft({ userId: user.id });
    return NextResponse.json({ dynamic });
  } catch (error) {
    return handleWeeklyReportServiceError(error);
  }
}
