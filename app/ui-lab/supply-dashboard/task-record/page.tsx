import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import { supplyTaskRecordMock } from "@/components/gamification/ui-lab/supply-task-record/mock-data";

export default function SupplyDashboardTaskRecordPage() {
  return <SupplyTaskRecordScene data={supplyTaskRecordMock} />;
}
