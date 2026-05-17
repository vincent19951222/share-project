import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

export default function SupplyDashboardBackpackPage() {
  return <SupplyBackpackScene data={supplyBackpackMock} />;
}
