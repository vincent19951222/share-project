import { NextRequest, NextResponse } from "next/server";
import {
  formatEnterpriseWechatText,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

async function readBody(request: NextRequest): Promise<{ message?: unknown } | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as { message?: unknown }) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await readBody(request);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const result = await sendEnterpriseWechatMessage({
    teamId: user.teamId,
    purpose: "MANUAL_TEST",
    targetType: "AdminUser",
    targetId: user.id,
    message: formatEnterpriseWechatText({
      title: "Enterprise WeChat webhook test",
      lines: [message],
      footer: "If this message appears, the group robot is reachable.",
    }),
  });

  return NextResponse.json({ result });
}
