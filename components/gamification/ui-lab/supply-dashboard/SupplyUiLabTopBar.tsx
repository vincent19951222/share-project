import Image from "next/image";
import Link from "next/link";

export type SupplyUiLabResource = {
  id: "coins" | "energy" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type SupplyUiLabProfile = {
  username: string;
  avatar: string;
};

type SupplyUiLabTopBarTabProps = {
  activeLabel: string;
  profile: SupplyUiLabProfile;
  resources: SupplyUiLabResource[];
  variant?: "tabs";
};

type SupplyUiLabTopBarBreadcrumbProps = {
  activeLabel: string;
  brandLabel?: string;
  closeHref: string;
  resources: SupplyUiLabResource[];
  variant: "breadcrumb";
};

type SupplyUiLabTopBarProps = SupplyUiLabTopBarTabProps | SupplyUiLabTopBarBreadcrumbProps;

const supplyUiLabTabs = [
  { id: "status", label: "我的状态", icon: "⌂", href: "/ui-lab/supply-dashboard" },
  { id: "team-goal", label: "团队目标", icon: "◎", href: "/ui-lab/supply-dashboard/team-goal" },
  { id: "shop", label: "补给商店", icon: "▤", href: "/ui-lab/supply-dashboard/shop" },
  { id: "task-record", label: "任务记录", icon: "▣", href: "/ui-lab/supply-dashboard/task-record" },
] as const;

const SUPPLY_UI_LAB_LOGO = "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png";

export function SupplyUiLabTopBar(props: SupplyUiLabTopBarProps) {
  const { activeLabel, resources } = props;
  const isBreadcrumb = props.variant === "breadcrumb";
  const brandLabel = isBreadcrumb ? props.brandLabel ?? "牛马补给站" : "牛马补给站";

  return (
    <header
      className={`supply-ui-lab-topbar${isBreadcrumb ? " supply-ui-lab-topbar--breadcrumb" : ""}`}
      aria-label="牛马补给站导航"
    >
      {isBreadcrumb ? (
        <div className="supply-ui-lab-breadcrumb-brand">
          <Link className="supply-ui-lab-brand" href="/ui-lab/supply-dashboard" aria-label={brandLabel}>
            <Image alt="" height={58} src={SUPPLY_UI_LAB_LOGO} unoptimized width={58} />
            <strong>{brandLabel}</strong>
          </Link>
          <span className="supply-ui-lab-breadcrumb-divider" aria-hidden="true">
            /
          </span>
          <strong className="supply-ui-lab-breadcrumb-current">{activeLabel}</strong>
        </div>
      ) : (
        <>
          <Link className="supply-ui-lab-brand" href="/ui-lab/supply-dashboard" aria-label={brandLabel}>
            <Image alt="" height={58} src={SUPPLY_UI_LAB_LOGO} unoptimized width={58} />
            <strong>{brandLabel}</strong>
          </Link>
          <nav className="supply-ui-lab-tabs" role="tablist" aria-label="补给站分区">
            {supplyUiLabTabs.map((tab) => {
              const isActive = tab.label === activeLabel;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  aria-selected={isActive}
                  className={`supply-ui-lab-topbar-tab supply-ui-lab-topbar-tab--${tab.id}`}
                  href={tab.href}
                  key={tab.id}
                  role="tab"
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
      <div className="supply-ui-lab-statusbar" aria-label="资源状态">
        {resources.map((resource) => (
          <div className={`supply-ui-lab-resource supply-ui-lab-resource--${resource.id}`} key={resource.id}>
            <span aria-hidden="true">{resource.icon}</span>
            <em>{resource.label}</em>
            <strong>{resource.value}</strong>
            {resource.id !== "backpack" ? <b aria-hidden="true">+</b> : null}
          </div>
        ))}
        {isBreadcrumb ? (
          <Link className="supply-ui-lab-close" href={props.closeHref} aria-label={`关闭${activeLabel}并返回大厅`}>
            ×
          </Link>
        ) : (
          <button className="supply-ui-lab-user-menu" type="button" aria-label={`打开 ${props.profile.username} 的用户菜单`}>
            <Image alt="" height={40} src={props.profile.avatar} unoptimized width={40} />
            <span aria-hidden="true">⌄</span>
          </button>
        )}
      </div>
    </header>
  );
}
