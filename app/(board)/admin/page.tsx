import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";
import { listSeasonsForTeam } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user || !isAdminUser(user)) {
    redirect("/");
  }

  const seasons = await listSeasonsForTeam(user.teamId);

  return (
    <div className="p-4">
      <SeasonAdminPanel initialSeasons={seasons} />
    </div>
  );
}
