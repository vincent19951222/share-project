import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: { include: { users: { include: { punchRecords: true } } } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const team = user.team;
  const members = team.users.map((u) => ({
    id: u.id,
    name: u.username,
    avatarKey: u.avatarKey,
  }));

  const today = 18;
  const totalDays = 30;

  const gridData: (boolean | null)[][] = team.users.map((teamUser) => {
    const row: (boolean | null)[] = [];
    for (let day = 1; day <= totalDays; day++) {
      if (day <= today) {
        const record = teamUser.punchRecords.find((r) => r.dayIndex === day);
        row.push(record ? record.punched : false);
      } else {
        row.push(null);
      }
    }
    return row;
  });

  const teamCoins = team.users.reduce((sum, u) => sum + u.coins, 0);

  const initialState: BoardState = {
    members,
    gridData,
    teamCoins,
    targetCoins: 2000,
    today,
    totalDays,
    logs: [
      {
        id: "seed-1",
        text: "WebSocket Connection Established. [Realtime Engine Active]",
        type: "system",
        timestamp: new Date(0),
      },
    ],
    activeTab: "punch",
    currentUserId: user.id,
  };

  return <BoardProvider initialState={initialState}>{children}</BoardProvider>;
}
