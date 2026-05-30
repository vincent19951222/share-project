"use client";

import { useEffect, useState } from "react";
import type { DocsTabId } from "@/content/docs-center/types";

export interface DocsNavItem {
  id: string;
  label: string;
  href: string;
}

export interface DocsNavGroup {
  id: DocsTabId;
  label: string;
  description: string;
  items: DocsNavItem[];
}

interface DocsTabsProps {
  groups: DocsNavGroup[];
  activeTab: DocsTabId;
  activeSection: string;
  onTabChange: (tab: DocsTabId) => void;
  onSectionChange: (tab: DocsTabId, section: string) => void;
}

export function DocsTabs({
  groups,
  activeTab,
  activeSection,
  onTabChange,
  onSectionChange,
}: DocsTabsProps) {
  const [expandedTab, setExpandedTab] = useState<DocsTabId | null>(activeTab);

  useEffect(() => {
    setExpandedTab(activeTab);
  }, [activeTab]);

  function handlePrimaryClick(tab: DocsTabId) {
    if (tab !== activeTab) {
      setExpandedTab(tab);
      onTabChange(tab);
      return;
    }

    setExpandedTab((current) => (current === tab ? null : tab));
  }

  return (
    <nav className="docs-tabs docs-nav-tree" aria-label="文档中心栏目">
      {groups.map((group) => {
        const isActive = activeTab === group.id;
        const isExpanded = expandedTab === group.id;

        return (
          <section
            key={group.id}
            className={isExpanded ? "docs-nav-group docs-nav-group-open" : "docs-nav-group"}
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-pressed={isActive}
              className={isActive ? "docs-nav-primary docs-nav-primary-active" : "docs-nav-primary"}
              onClick={() => handlePrimaryClick(group.id)}
            >
              <span>
                <span className="docs-tab-label">{group.label}</span>
                <span className="docs-tab-description">{group.description}</span>
              </span>
              <span className="docs-nav-chevron" aria-hidden="true">
                {isExpanded ? "−" : "+"}
              </span>
            </button>
            {isExpanded ? (
              <ul className="docs-nav-children">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      aria-current={group.id === activeTab && item.id === activeSection ? "page" : undefined}
                      className="docs-nav-child-link"
                      href={item.href}
                      onClick={(event) => {
                        event.preventDefault();
                        onSectionChange(group.id, item.id);
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
