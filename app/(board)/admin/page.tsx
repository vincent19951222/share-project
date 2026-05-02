import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GamificationConfigObservatory } from "@/components/admin/GamificationConfigObservatory";
import { GamificationOpsDashboard } from "@/components/admin/GamificationOpsDashboard";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";
import { buildGamificationOpsDashboard } from "@/lib/gamification/ops-dashboard";
import { listSeasonsForTeam } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user || !isAdminUser(user)) {
    redirect("/");
  }

  const [seasons, opsSnapshot, configSnapshot] = await Promise.all([
    listSeasonsForTeam(user.teamId),
    buildGamificationOpsDashboard({ teamId: user.teamId }),
    Promise.resolve(buildGamificationConfigObservatorySnapshot()),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <GamificationOpsDashboard initialSnapshot={opsSnapshot} />
      <GamificationConfigObservatory initialSnapshot={configSnapshot} />
      <SeasonAdminPanel initialSeasons={seasons} />
    </div>
  );
}
