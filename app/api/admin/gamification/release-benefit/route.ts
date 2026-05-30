import { NextResponse, type NextRequest } from "next/server";
import {
  grantReleaseBenefit,
  ReleaseBenefitError,
} from "@/lib/gamification/release-benefit";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function readStringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await loadCurrentUser(request.cookies);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const grantKey = readStringField(body as Record<string, unknown>, "grantKey");
    const message = readStringField(body as Record<string, unknown>, "message");

    if (!grantKey) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await grantReleaseBenefit({
      adminUserId: admin.id,
      adminUsername: admin.username,
      teamId: admin.teamId,
      grantKey,
      message,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReleaseBenefitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
