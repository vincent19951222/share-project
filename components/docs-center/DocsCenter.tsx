"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { docsChangelog } from "@/content/docs-center/changelog";
import { docsFaq } from "@/content/docs-center/faq";
import { docsHelp } from "@/content/docs-center/help";
import { docsRules } from "@/content/docs-center/rules";
import { docsTabs } from "@/content/docs-center/tabs";
import type { DocsSection as DocsSectionContent, DocsTabId } from "@/content/docs-center/types";
import { DocsSection } from "./DocsSection";
import { DocsTableOfContents, type DocsTocHrefBase } from "./DocsTableOfContents";
import { DocsTabs } from "./DocsTabs";

function getSectionsForTab(tab: DocsTabId): DocsSectionContent[] {
  if (tab === "rules") {
    return docsRules;
  }

  if (tab === "help") {
    return docsHelp;
  }

  if (tab === "faq") {
    return docsFaq;
  }

  return docsChangelog.map((entry) => ({
    id: entry.id,
    title: entry.title,
    summary: `${entry.date} · ${entry.summary}`,
    bullets: entry.bullets,
    note: entry.tags?.length ? `标签：${entry.tags.join(" / ")}` : undefined,
  }));
}

interface DocsCenterProps {
  initialTab: DocsTabId;
}

function buildTocHrefBase(pathname: string, tab: DocsTabId): DocsTocHrefBase {
  return `${pathname}?tab=${tab}`;
}

export function DocsCenter({ initialTab }: DocsCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<DocsTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeTabMeta = docsTabs.find((tab) => tab.id === activeTab) ?? docsTabs[0];
  const sections = getSectionsForTab(activeTabMeta.id);
  const updatedAt = docsChangelog[0]?.date ?? "2026-04-27";

  function handleTabChange(tab: DocsTabId) {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }

  return (
    <section className="docs-center-shell">
      <div className="docs-center-header">
        <a className="docs-back-link" href="/">
          返回主面板
        </a>
        <p className="docs-center-kicker">EDITORIAL MANUAL</p>
        <div className="docs-center-title-row">
          <div>
            <h1 className="docs-center-title">文档中心</h1>
            <p className="docs-center-intro">承接规则、说明、更新记录，减少口径分散和重复解释。</p>
          </div>
          <div className="docs-center-stamp">
            <span className="docs-center-stamp-label">最近更新</span>
            <strong>{updatedAt}</strong>
          </div>
        </div>
      </div>

      <DocsTabs tabs={docsTabs} activeTab={activeTabMeta.id} onTabChange={handleTabChange} />

      <div className="docs-center-body">
        <aside className="docs-center-sidebar">
          <p className="docs-current-tab">{activeTabMeta.label}</p>
          <p className="docs-current-description">{activeTabMeta.description}</p>
          <DocsTableOfContents
            hrefBase={buildTocHrefBase(pathname, activeTabMeta.id)}
            items={sections.map((section) => ({ id: section.id, label: section.title }))}
          />
        </aside>

        <div className="docs-center-content">
          {sections.map((section) => (
            <DocsSection key={section.id} section={section} />
          ))}
        </div>
      </div>
    </section>
  );
}
