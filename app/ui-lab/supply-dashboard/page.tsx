import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

export const metadata = {
  title: "牛马补给站 Dashboard UI Lab",
};

export default function SupplyDashboardUiLabPage() {
  return <SupplyDashboardScene data={supplyDashboardMock} />;
}
