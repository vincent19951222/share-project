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
  const safePathname = pathname ?? "/docs";
  const [activeTab, setActiveTab] = useState<DocsTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeTabMeta = docsTabs.find((tab) => tab.id === activeTab) ?? docsTabs[0];
  const sections = getSectionsForTab(activeTabMeta.id);
  const updatedAt = docsChangelog[0]?.date ?? "2026-04-27";

  function handleTabChange(tab: DocsTabId) {
    setActiveTab(tab);
    router.replace(`${safePathname}?tab=${tab}`, { scroll: false });
  }

  return (
    <section className="docs-center-shell">
      <div className="docs-center-header">
        <a className="docs-back-link" href="/">
          返回主面板
        </a>
        <div className="docs-center-title-row">
          <div className="docs-center-heading">
            <h1 className="docs-center-title">文档中心</h1>
            <p className="docs-center-intro">
              集中查看更新日志、赛季规则、使用说明和常见问题，减少重复解释和口径分散。
            </p>
            <p className="docs-center-meta">
              最近更新：<time dateTime={updatedAt}>{updatedAt}</time>
            </p>
          </div>
        </div>
      </div>

      <DocsTabs tabs={docsTabs} activeTab={activeTabMeta.id} onTabChange={handleTabChange} />

      <div className="docs-center-body">
        <aside className="docs-center-sidebar">
          <div className="docs-current-tab">
            <p className="docs-current-label">当前栏目</p>
            <p className="docs-current-title">{activeTabMeta.label}</p>
            <p className="docs-current-description">{activeTabMeta.description}</p>
          </div>
          <DocsTableOfContents
            hrefBase={buildTocHrefBase(safePathname, activeTabMeta.id)}
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
