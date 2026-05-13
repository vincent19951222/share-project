import { SupplyTeamGoalScene } from "@/components/gamification/ui-lab/supply-team-goal/SupplyTeamGoalScene";
import { supplyTeamGoalMock } from "@/components/gamification/ui-lab/supply-team-goal/mock-data";

export default function SupplyDashboardTeamGoalPage() {
  return <SupplyTeamGoalScene data={supplyTeamGoalMock} />;
}
