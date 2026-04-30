import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import {
  respondToSocialInvitation,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";

type RespondPayload = {
  invitationId?: unknown;
  responseText?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as RespondPayload | null;

    if (!payload || typeof payload.invitationId !== "string" || !payload.invitationId.trim()) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const response = await respondToSocialInvitation({
      userId,
      invitationId: payload.invitationId,
      responseText: typeof payload.responseText === "string" ? payload.responseText : undefined,
    });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
    }

    return NextResponse.json({
      response,
      snapshot,
    });
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
