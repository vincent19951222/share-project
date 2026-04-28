import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentWeeklyReportDraft,
  upsertWeeklyReportDraft,
  WeeklyReportServiceError,
} from "@/lib/weekly-report-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function handleWeeklyReportServiceError(error: unknown) {
  if (error instanceof WeeklyReportServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function requireAdminRequest(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdminRequest(request);
    if (user instanceof NextResponse) {
      return user;
    }

    const draft = await getCurrentWeeklyReportDraft({ userId: user.id });
    return NextResponse.json({ draft });
  } catch (error) {
    return handleWeeklyReportServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminRequest(request);
    if (user instanceof NextResponse) {
      return user;
    }

    const draft = await upsertWeeklyReportDraft({ userId: user.id });
    return NextResponse.json({ draft });
  } catch (error) {
    return handleWeeklyReportServiceError(error);
  }
}
