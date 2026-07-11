import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildBoardSnapshotForUser } from "@/lib/board-state";
import { parseCreateTrainingPlanInput } from "@/lib/training-plan/domain";
import {
  ActiveTrainingPlanExistsError,
  TrainingTemplateNotFoundError,
  createTrainingPlanForUser,
} from "@/lib/training-plan/service";

export async function POST(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseCreateTrainingPlanInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const now = new Date();
    await createTrainingPlanForUser({ userId, input: parsed.value, now });
    const snapshot = await buildBoardSnapshotForUser(userId, now);
    if (!snapshot) {
      return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
    }
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof ActiveTrainingPlanExistsError) {
      return NextResponse.json({ error: "active-plan-exists" }, { status: 409 });
    }
    if (error instanceof TrainingTemplateNotFoundError) {
      return NextResponse.json({ error: "training-template-not-found" }, { status: 422 });
    }
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
