import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

export const metadata = {
  title: "抽卡池 UI Lab",
};

export default function SupplyDashboardDrawPoolPage() {
  return <SupplyDrawPoolScene data={supplyDrawPoolMock} />;
}
