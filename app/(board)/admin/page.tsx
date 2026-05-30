import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { GamificationConfigObservatory } from "@/components/admin/GamificationConfigObservatory";
import { GamificationOpsDashboard } from "@/components/admin/GamificationOpsDashboard";
import { AdminMakeupPunchPanel } from "@/components/admin/AdminMakeupPunchPanel";
import { AdminReleaseBenefitPanel } from "@/components/admin/AdminReleaseBenefitPanel";
import { SeasonAdminPanel } from "@/components/admin/SeasonAdminPanel";
import { buildGamificationConfigObservatorySnapshot } from "@/lib/gamification/config-observatory";
import { buildGamificationOpsDashboard } from "@/lib/gamification/ops-dashboard";
import { prisma } from "@/lib/prisma";
import { listSeasonsForTeam } from "@/lib/season-service";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user || !isAdminUser(user)) {
    redirect("/");
  }

  const [seasons, opsSnapshot, configSnapshot, teamMembers] = await Promise.all([
    listSeasonsForTeam(user.teamId),
    buildGamificationOpsDashboard({ teamId: user.teamId }),
    Promise.resolve(buildGamificationConfigObservatorySnapshot()),
    prisma.user.findMany({
      where: { teamId: user.teamId },
      select: {
        id: true,
        username: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <AdminPageShell
      opsPanel={<GamificationOpsDashboard initialSnapshot={opsSnapshot} />}
      configPanel={<GamificationConfigObservatory initialSnapshot={configSnapshot} />}
      benefitPanel={<AdminReleaseBenefitPanel memberCount={teamMembers.length} />}
      makeupPanel={
        <AdminMakeupPunchPanel
          members={teamMembers.map((member) => ({
            id: member.id,
            name: member.username,
          }))}
        />
      }
      seasonPanel={<SeasonAdminPanel initialSeasons={seasons} />}
    />
  );
}
