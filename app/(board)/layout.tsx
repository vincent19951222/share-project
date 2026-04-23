import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseCookieValue } from "@/lib/auth";
import { buildBoardSnapshotForUser } from "@/lib/board-state";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = parseCookieValue(cookieStore.get("userId")?.value);

  if (!userId) {
    redirect("/login");
  }

  const snapshot = await buildBoardSnapshotForUser(userId);

  if (!snapshot) {
    redirect("/login");
  }

  const initialState: BoardState = {
    ...snapshot,
    logs: [],
    activeTab: "punch",
    lastAppliedPollRequestId: 0,
    pendingPunchEpoch: 0,
    latestSettledPunchEpoch: 0,
  };

  return <BoardProvider initialState={initialState}>{children}</BoardProvider>;
}
