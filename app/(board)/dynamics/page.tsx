import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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
      <header className="shrink-0 border-b-2 border-slate-800 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border-2 border-slate-800 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-[0_3px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_0_#1f2937]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回主页
          </Link>
          <span className="font-black text-lg tracking-tighter text-slate-800">
            脱脂牛马
          </span>
        </div>
      </header>
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
