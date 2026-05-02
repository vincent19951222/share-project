import { NextResponse, type NextRequest } from "next/server";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = buildGamificationConfigObservatorySnapshot();

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
