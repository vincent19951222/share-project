import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import { normalizeTeamDynamicsQuery } from "@/lib/team-dynamics";
import { listTeamDynamicsForUser } from "@/lib/team-dynamics-service";

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = normalizeTeamDynamicsQuery(request.nextUrl.searchParams);
    const result = await listTeamDynamicsForUser({
      userId: user.id,
      ...query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[team-dynamics] list failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
