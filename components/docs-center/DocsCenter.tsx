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
import { DocsTabs, type DocsNavGroup, type DocsNavItem } from "./DocsTabs";
import { GamificationDocsSection } from "./GamificationDocsSection";

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
  initialSection?: string;
}

function buildSectionHref(pathname: string, tab: DocsTabId, section: string) {
  return `${pathname}?tab=${tab}&section=${section}`;
}

function getNavItemsForTab(tab: DocsTabId): DocsNavItem[] {
  const sections = getSectionsForTab(tab);

  if (tab !== "rules") {
    return sections.map((section) => ({ id: section.id, label: section.title, href: "" }));
  }

  return [
    ...sections.map((section) => ({ id: section.id, label: section.title, href: "" })),
    { id: "supply-station-overview", label: "补给站速览", href: "" },
    { id: "supply-station-rules", label: "补给站规则地图", href: "" },
    { id: "supply-station-task-cards", label: "四维任务卡池", href: "" },
    { id: "supply-station-probability", label: "抽奖概率说明", href: "" },
    { id: "supply-station-help", label: "日常流程", href: "" },
    { id: "supply-station-faq", label: "补给站 FAQ", href: "" },
    { id: "supply-station-changelog", label: "规则更新", href: "" },
  ];
}

function buildNavGroups(pathname: string): DocsNavGroup[] {
  return docsTabs.map((tab) => {
    return {
      ...tab,
      items: getNavItemsForTab(tab.id).map((item) => ({
        ...item,
        href: buildSectionHref(pathname, tab.id, item.id),
      })),
    };
  });
}

function getDefaultSection(tab: DocsTabId) {
  return getNavItemsForTab(tab)[0]?.id ?? "";
}

function resolveSection(tab: DocsTabId, section: string | undefined) {
  const items = getNavItemsForTab(tab);
  return items.some((item) => item.id === section) ? section! : getDefaultSection(tab);
}

function getSelectedSection(tab: DocsTabId, sectionId: string) {
  return getSectionsForTab(tab).find((section) => section.id === sectionId);
}

export function DocsCenter({ initialTab, initialSection }: DocsCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? "/docs";
  const [activeTab, setActiveTab] = useState<DocsTabId>(initialTab);
  const [activeSection, setActiveSection] = useState(resolveSection(initialTab, initialSection));

  useEffect(() => {
    setActiveTab(initialTab);
    setActiveSection(resolveSection(initialTab, initialSection));
  }, [initialSection, initialTab]);

  const activeTabMeta = docsTabs.find((tab) => tab.id === activeTab) ?? docsTabs[0];
  const selectedSection = getSelectedSection(activeTabMeta.id, activeSection);
  const navGroups = buildNavGroups(safePathname);
  const updatedAt = docsChangelog[0]?.date ?? "2026-04-27";

  function handleTabChange(tab: DocsTabId) {
    const section = getDefaultSection(tab);
    setActiveTab(tab);
    setActiveSection(section);
    router.replace(buildSectionHref(safePathname, tab, section), { scroll: false });
  }

  function handleSectionChange(tab: DocsTabId, section: string) {
    const nextSection = resolveSection(tab, section);
    setActiveTab(tab);
    setActiveSection(nextSection);
    router.replace(buildSectionHref(safePathname, tab, nextSection), { scroll: false });
  }

  return (
    <section className="docs-center-shell">
      <header className="docs-center-header">
        <a className="docs-back-link" href="/">
          返回主面板
        </a>
        <div className="docs-center-title-row">
          <div className="docs-center-heading">
            <p className="docs-center-kicker">脱脂牛马官方手册</p>
            <h1 className="docs-center-title">文档中心</h1>
            <p className="docs-center-intro">
              参考标准产品文档的结构，把更新、规则、流程和 FAQ 分层收纳；先扫目录，再进细节。
            </p>
          </div>
          <div className="docs-center-status" aria-label="文档状态">
            <span>最近更新</span>
            <strong>
              <time dateTime={updatedAt}>{updatedAt}</time>
            </strong>
            <p>当前栏目：{activeTabMeta.label}</p>
          </div>
        </div>
      </header>

      <div className="docs-center-body">
        <aside className="docs-center-sidebar" aria-label="文档导航">
          <div className="docs-sidebar-block">
            <p className="docs-sidebar-label">文档导航</p>
            <DocsTabs
              activeSection={activeSection}
              activeTab={activeTabMeta.id}
              groups={navGroups}
              onSectionChange={handleSectionChange}
              onTabChange={handleTabChange}
            />
          </div>
        </aside>

        <main className="docs-center-content" id="docs-center-content">
          {selectedSection ? <DocsSection section={selectedSection} /> : null}
          {activeTabMeta.id === "rules" && !selectedSection ? (
            <GamificationDocsSection sectionId={activeSection} />
          ) : null}
        </main>
      </div>
    </section>
  );
}
