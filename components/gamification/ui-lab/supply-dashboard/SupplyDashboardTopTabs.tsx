import Link from "next/link";

type SupplyDashboardTab = {
  href: string;
  icon: string;
  label: string;
};

const supplyDashboardTabs: SupplyDashboardTab[] = [
  { label: "我的状态", icon: "⌂", href: "/ui-lab/supply-dashboard" },
  { label: "团队目标", icon: "◎", href: "/ui-lab/supply-dashboard/team-goal" },
  { label: "补给商店", icon: "▤", href: "/ui-lab/supply-dashboard/shop" },
  { label: "任务记录", icon: "▣", href: "/ui-lab/supply-dashboard/task-record" },
];

export function SupplyDashboardTopTabs({ activeLabel }: { activeLabel: string }) {
  return (
    <div className="supply-dashboard-top-tabs" role="tablist" aria-label="补给站分区">
      {supplyDashboardTabs.map((tab) => {
        const isActive = tab.label === activeLabel;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-selected={isActive}
            href={tab.href}
            key={tab.label}
            role="tab"
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
