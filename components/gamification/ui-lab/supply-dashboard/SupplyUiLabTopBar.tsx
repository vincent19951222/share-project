import Image from "next/image";
import Link from "next/link";

export type SupplyUiLabResource = {
  id: "coins" | "energy" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
  iconImage?: string;
};

export type SupplyUiLabProfile = {
  username: string;
  avatar: string;
};

export type SupplyUiLabTopBarTabId = "status" | "shop" | "task-record";

type SupplyUiLabTopBarTabProps = {
  activeLabel: string;
  onSelectTab?: (tabId: SupplyUiLabTopBarTabId) => void;
  profile: SupplyUiLabProfile;
  returnAction?: {
    label: string;
    onClick: () => void;
  };
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
  { id: "status", label: "我的状态", icon: "⌂", href: "/dashboard/status" },
  { id: "shop", label: "补给商店", icon: "▤", href: "/dashboard/store" },
  { id: "task-record", label: "任务记录", icon: "▣", href: "/dashboard/quest" },
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
          <Link className="supply-ui-lab-brand" href="/dashboard/status" aria-label={brandLabel}>
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
          <Link className="supply-ui-lab-brand" href="/dashboard/status" aria-label={brandLabel}>
            <Image alt="" height={58} src={SUPPLY_UI_LAB_LOGO} unoptimized width={58} />
            <strong>{brandLabel}</strong>
          </Link>
          <div className="supply-ui-lab-nav-cluster">
            {props.returnAction ? (
              <button className="supply-ui-lab-return-action" onClick={props.returnAction.onClick} type="button">
                <span aria-hidden="true">←</span>
                {props.returnAction.label}
              </button>
            ) : null}
            <nav className="supply-ui-lab-tabs" role="tablist" aria-label="补给站分区">
              {supplyUiLabTabs.map((tab) => {
                const isActive = tab.label === activeLabel;

                const className = `supply-ui-lab-topbar-tab supply-ui-lab-topbar-tab--${tab.id}`;

                if (props.onSelectTab) {
                  return (
                    <button
                      aria-current={isActive ? "page" : undefined}
                      aria-selected={isActive}
                      className={className}
                      key={tab.id}
                      onClick={() => props.onSelectTab?.(tab.id)}
                      role="tab"
                      type="button"
                    >
                      <span aria-hidden="true">{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                }

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    aria-selected={isActive}
                    className={className}
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
          </div>
          <strong className="supply-ui-lab-current-page">{activeLabel}</strong>
        </>
      )}
      <div className="supply-ui-lab-resource-strip">
        <div className="supply-ui-lab-statusbar" aria-label="资源状态">
          {resources.map((resource) => (
            <div className={`supply-ui-lab-resource supply-ui-lab-resource--${resource.id}`} key={resource.id}>
              <span aria-hidden="true">
                {resource.iconImage ? (
                  <Image alt="" height={44} src={resource.iconImage} unoptimized width={44} />
                ) : (
                  resource.icon
                )}
              </span>
              <em>{resource.label}</em>
              <strong>{resource.value}</strong>
            </div>
          ))}
          {isBreadcrumb ? (
            <Link className="supply-ui-lab-close" href={props.closeHref} aria-label={`关闭${activeLabel}并返回大厅`}>
              ×
            </Link>
          ) : (
            <div className="supply-ui-lab-user-profile" aria-label={`${props.profile.username} 的用户头像`}>
              <Image alt="" height={40} src={props.profile.avatar} unoptimized width={40} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
