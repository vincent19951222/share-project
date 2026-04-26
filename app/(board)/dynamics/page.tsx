import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar/Navbar";
import { TeamDynamicsPage } from "@/components/team-dynamics/TeamDynamicsPage";
import { listTeamDynamicsForUser } from "@/lib/team-dynamics-service";
import { loadCurrentUser } from "@/lib/session";

export default async function DynamicsPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user) {
    redirect("/login");
  }

  const initial = await listTeamDynamicsForUser({
    userId: user.id,
    view: "page",
    unreadOnly: false,
    type: "ALL",
    limit: 50,
    cursor: null,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Navbar />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <TeamDynamicsPage
          initialItems={initial.items}
          initialUnreadCount={initial.unreadCount}
          initialNextCursor={initial.nextCursor}
        />
      </div>
    </div>
  );
}
