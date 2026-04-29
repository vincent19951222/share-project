import { NextRequest, NextResponse } from "next/server";
import {
  publishWeeklyReportDraftWithStatus,
  WeeklyReportServiceError,
} from "@/lib/weekly-report-service";
import {
  sendEnterpriseWechatMessage,
  type EnterpriseWechatSendResult,
} from "@/lib/integrations/enterprise-wechat";
import { isAdminUser, loadCurrentUser } from "@/lib/session";
import { buildWeeklyReportWeWorkMarkdown } from "@/lib/wework-webhook";

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
    const weworkPush:
      | EnterpriseWechatSendResult
      | {
          ok: false;
          status: "SKIPPED";
          reason: "ALREADY_PUBLISHED";
        }
      | {
          ok: false;
          status: "FAILED";
          reason: "UNEXPECTED_ERROR";
          errorMessage: string;
        } = created
      ? await (async () => {
          try {
            return await sendEnterpriseWechatMessage({
              teamId: dynamic.teamId,
              purpose: "WEEKLY_REPORT",
              targetType: "TeamDynamic",
              targetId: dynamic.id,
              message: {
                type: "markdown",
                content: buildWeeklyReportWeWorkMarkdown(dynamic),
              },
            });
          } catch (error) {
            return {
              ok: false as const,
              status: "FAILED" as const,
              reason: "UNEXPECTED_ERROR" as const,
              errorMessage: error instanceof Error ? error.message : "Unexpected sender failure",
            };
          }
        })()
      : { ok: false, status: "SKIPPED", reason: "ALREADY_PUBLISHED" };

    return NextResponse.json({ dynamic, weworkPush });
  } catch (error) {
    return handleWeeklyReportServiceError(error);
  }
}
