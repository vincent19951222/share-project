import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildBoardSnapshotForUser } from "@/lib/board-state";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const snapshot = await buildBoardSnapshotForUser(userId);

  if (!snapshot) {
    redirect("/login");
  }

  const initialState: BoardState = {
    ...snapshot,
    logs: [
      {
        id: "seed-1",
        text: "已连接共享战场，当前数据来自服务器快照。",
        type: "system",
        timestamp: new Date(0),
      },
    ],
    activeTab: "punch",
    lastAppliedPollRequestId: 0,
    pendingPunchEpoch: 0,
    latestSettledPunchEpoch: 0,
  };

  return <BoardProvider initialState={initialState}>{children}</BoardProvider>;
}
