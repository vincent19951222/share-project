import type { DocsTabDefinition, DocsTabId } from "@/content/docs-center/types";

interface DocsTabsProps {
  tabs: DocsTabDefinition[];
  activeTab: DocsTabId;
  onTabChange: (tab: DocsTabId) => void;
}

export function DocsTabs({ tabs, activeTab, onTabChange }: DocsTabsProps) {
  return (
    <div className="docs-tabs" aria-label="文档中心栏目">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? "docs-tab docs-tab-active" : "docs-tab"}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="docs-tab-label">{tab.label}</span>
            <span className="docs-tab-description">{tab.description}</span>
          </button>
        );
      })}
    </div>
  );
}
