import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import {
  createSocialInvitation,
  isSocialInvitationType,
  SocialInvitationError,
} from "@/lib/social-invitations";

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      type?: string;
      recipientUserId?: string | null;
      message?: string;
    };

    if (!body.type || !isSocialInvitationType(body.type) || !body.message?.trim()) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const invitation = await createSocialInvitation({
      senderUserId: user.id,
      type: body.type,
      recipientUserId: body.recipientUserId ?? null,
      message: body.message,
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
