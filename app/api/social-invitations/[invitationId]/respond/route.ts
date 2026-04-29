import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import {
  respondToSocialInvitation,
  SocialInvitationError,
} from "@/lib/social-invitations";

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

async function resolveParams(context: RouteContext) {
  return await context.params;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await loadCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await resolveParams(context);
    const body = (await request.json()) as { responseText?: string };

    const result = await respondToSocialInvitation({
      invitationId,
      responderUserId: user.id,
      responseText: body.responseText ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
