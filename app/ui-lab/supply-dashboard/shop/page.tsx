import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

export default function SupplyDashboardShopPage() {
  return <SupplyShopScene data={supplyShopMock} />;
}
