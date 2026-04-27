# Docs Center Mainline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mainline `/docs` experience with a Profile dropdown entry, hybrid `tab + hash` navigation, and MVP content that ships real changelog and season-rule sections.

**Architecture:** The feature stays fully local to the Next.js app. Static content lives in `content/docs-center/*` and is rendered by a dedicated standalone docs page inside the `(board)` route group. The page uses query params for primary tab state, hash anchors for section deep-links, and a client component tree that stays visually aligned with the product brand while presenting a more editorial reading experience.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Tailwind CSS v4 plus `app/globals.css`, Vitest + jsdom

---

## File Structure

- Create: `app/(board)/docs/page.tsx`
- Create: `components/docs-center/DocsCenter.tsx`
- Create: `components/docs-center/DocsTabs.tsx`
- Create: `components/docs-center/DocsTableOfContents.tsx`
- Create: `components/docs-center/DocsSection.tsx`
- Create: `content/docs-center/types.ts`
- Create: `content/docs-center/changelog.ts`
- Create: `content/docs-center/rules.ts`
- Create: `content/docs-center/help.ts`
- Create: `content/docs-center/faq.ts`
- Create: `__tests__/docs-content.test.ts`
- Create: `__tests__/docs-center.test.tsx`
- Create: `__tests__/docs-route-page.test.tsx`
- Create: `__tests__/docs-center-css.test.ts`
- Modify: `components/navbar/ProfileDropdown.tsx`
- Modify: `__tests__/profile-dropdown.test.tsx`
- Modify: `app/globals.css`

### Task 1: Add Static Docs Content Modules

**Files:**
- Create: `content/docs-center/types.ts`
- Create: `content/docs-center/changelog.ts`
- Create: `content/docs-center/rules.ts`
- Create: `content/docs-center/help.ts`
- Create: `content/docs-center/faq.ts`
- Test: `__tests__/docs-content.test.ts`

- [ ] **Step 1: Write the failing content contract test**

```ts
import { describe, expect, it } from "vitest";
import { docsChangelog } from "@/content/docs-center/changelog";
import { docsFaq } from "@/content/docs-center/faq";
import { docsHelp } from "@/content/docs-center/help";
import { docsRules } from "@/content/docs-center/rules";
import { docsTabs } from "@/content/docs-center/types";

describe("docs center content", () => {
  it("ships the four tabs, reverse-chronological changelog, and real rule copy", () => {
    expect(docsTabs.map((tab) => tab.id)).toEqual([
      "changelog",
      "rules",
      "help",
      "faq",
    ]);

    expect(docsChangelog.map((entry) => entry.date)).toEqual([
      "2026-04-27",
      "2026-04-26",
      "2026-04-23",
      "2026-04-22",
    ]);

    expect(docsRules.map((section) => section.id)).toEqual([
      "balance",
      "vault",
      "season-progress",
      "season-lifecycle",
    ]);

    expect(docsRules[0]?.bullets.length).toBeGreaterThan(1);
    expect(docsHelp.length).toBeGreaterThanOrEqual(3);
    expect(docsFaq.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run the content test to confirm it fails**

Run: `npm test -- __tests__/docs-content.test.ts`

Expected: FAIL with module resolution errors for `@/content/docs-center/*`

- [ ] **Step 3: Add the docs content types and MVP content modules**

```ts
// content/docs-center/types.ts
export type DocsTab = "changelog" | "rules" | "help" | "faq";

export interface DocsTabDefinition {
  id: DocsTab;
  label: string;
  description: string;
}

export interface DocsChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
  tags?: string[];
}

export interface DocsContentSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  note?: string;
}

export const docsTabs: DocsTabDefinition[] = [
  {
    id: "changelog",
    label: "更新日志",
    description: "最近做了什么调整，老用户先看这里。",
  },
  {
    id: "rules",
    label: "赛季规则",
    description: "统一解释赛季、金库、收入和冲刺条。",
  },
  {
    id: "help",
    label: "使用说明",
    description: "第一次上手和常见流程，集中看这一栏。",
  },
  {
    id: "faq",
    label: "常见问题",
    description: "把最容易被问到的误解直接讲清楚。",
  },
];
```

```ts
// content/docs-center/changelog.ts
import type { DocsChangelogEntry } from "./types";

export const docsChangelog: DocsChangelogEntry[] = [
  {
    id: "docs-center-launch",
    date: "2026-04-27",
    title: "文档中心上线",
    summary: "把更新记录、赛季规则、基础帮助和 FAQ 集中到一个入口里。",
    bullets: [
      "Profile 下拉新增文档中心入口。",
      "首版提供混合式目录结构，支持按栏目查看和按锚点直达。",
      "更新日志和赛季规则先做真实内容，帮助与 FAQ 先提供基础解释。",
    ],
    tags: ["docs", "mvp"],
  },
  {
    id: "team-dynamics-page",
    date: "2026-04-26",
    title: "团队动态页补齐主线入口",
    summary: "最近发生了什么，现在有单独的时间线页可以回看。",
    bullets: [
      "支持独立页面查看团队动态。",
      "未读和筛选逻辑做了单页体验收口。",
      "团队事件和产品说明内容开始正式分层。",
    ],
    tags: ["dynamics"],
  },
  {
    id: "calendar-and-coffee",
    date: "2026-04-23",
    title: "牛马日历和续命咖啡进入主面板",
    summary: "打卡不再只是一张表，开始有节奏和生活感。",
    bullets: [
      "新增月度视角的日历页。",
      "新增续命咖啡记录和轻量统计。",
      "移动端样式补齐，保持主面板可读性。",
    ],
    tags: ["calendar", "coffee"],
  },
  {
    id: "season-economy-foundation",
    date: "2026-04-22",
    title: "赛季与资产体系基础落地",
    summary: "个人银子、赛季收入、牛马金库和冲刺条开始有统一口径。",
    bullets: [
      "长期资产和赛季贡献拆开显示。",
      "赛季冲刺条与目标槽位绑定。",
      "后续所有规则说明都以这套口径为准。",
    ],
    tags: ["season", "economy"],
  },
];
```

```ts
// content/docs-center/rules.ts
import type { DocsContentSection } from "./types";

export const docsRules: DocsContentSection[] = [
  {
    id: "balance",
    title: "我的银子",
    summary: "这是你的长期个人资产，不是赛季内临时分数，也不是公共钱包。",
    bullets: [
      "有效健身打卡会给你增加银子。",
      "没有开启赛季时，你依然可以继续累计自己的银子。",
      "银子代表的是你长期拿到过多少，而不是团队当前可用余额。",
    ],
  },
  {
    id: "vault",
    title: "牛马金库",
    summary: "牛马金库代表团队累计贡献进度，不等于任何单个成员的可支配资产。",
    bullets: [
      "金库主要用来表达团队一起推进了多少。",
      "它和个人银子不是同一个口径，不能互相替代。",
      "看到金库上涨，意味着团队在一起把赛季往前推。",
    ],
  },
  {
    id: "season-progress",
    title: "赛季收入与冲刺条",
    summary: "赛季收入看的是本赛季内的贡献，冲刺条看的是团队距离当前目标还有多远。",
    bullets: [
      "你本赛季做出的有效贡献会进入赛季收入统计。",
      "团队所有成员的赛季贡献会一起推动冲刺条。",
      "冲刺条满格后，说明当前赛季目标已经达成，不代表你的长期银子会被清空。",
    ],
  },
  {
    id: "season-lifecycle",
    title: "赛季开始 / 结束逻辑",
    summary: "赛季由管理员控制开启和切换，赛季结束只影响赛季维度，不影响你已经拿到的长期资产。",
    bullets: [
      "管理员可以创建、启动和切换赛季。",
      "赛季结束后，本赛季收入会停留在归档语境里，但你的银子仍然保留。",
      "如果当前没有赛季，主面板会继续保留基础打卡和资产累计能力。",
    ],
    note: "规则页只解释产品口径，不直接暴露数据库字段和内部实现。",
  },
];
```

```ts
// content/docs-center/help.ts
import type { DocsContentSection } from "./types";

export const docsHelp: DocsContentSection[] = [
  {
    id: "punch-workflow",
    title: "怎么完成健身打卡",
    summary: "进入主面板后，在健身打卡页完成当天打卡。",
    bullets: [
      "每个自然日只看当天是否完成有效打卡。",
      "完成后会同步影响你的连续打卡、奖励和团队进度。",
      "如果你没有看到变化，先检查是不是同一天内重复操作。",
    ],
  },
  {
    id: "assets-and-season",
    title: "怎么看个人资产和赛季状态",
    summary: "个人资产和赛季信息主要收在 Profile 下拉与主面板头部区域。",
    bullets: [
      "Profile 下拉更适合看你自己的长期资产、连签和下一次奖励。",
      "主面板头部更适合看团队赛季进度和当前目标。",
      "这两个区域回答的是不同问题，不要把长期资产和赛季进度混成一项。",
    ],
  },
  {
    id: "season-admin",
    title: "管理员怎么管理赛季",
    summary: "管理员通过赛季设置页维护赛季的开启、切换和目标。",
    bullets: [
      "管理员入口在 Profile 下拉里的赛季设置。",
      "赛季配置会直接影响冲刺条和赛季收入的解释口径。",
      "普通成员不需要进入管理页，也能正常完成打卡和查看进度。",
    ],
  },
];
```

```ts
// content/docs-center/faq.ts
import type { DocsContentSection } from "./types";

export const docsFaq: DocsContentSection[] = [
  {
    id: "progress-not-moving",
    title: "为什么今天打卡了，但冲刺条没再涨？",
    summary: "最常见的原因是今天这次操作没有形成新的赛季贡献。",
    bullets: [
      "同一天重复操作通常不会无限叠加。",
      "如果当前没有赛季，系统会保留基础资产累计，但不会推动不存在的赛季目标。",
      "先看赛季状态，再判断是不是产品异常。",
    ],
  },
  {
    id: "no-season-still-earned",
    title: "为什么没有赛季，也还能拿到银子？",
    summary: "因为银子是长期个人资产，不依赖赛季是否开启。",
    bullets: [
      "赛季控制的是阶段性目标和当期贡献口径。",
      "长期资产累计不会因为暂时没有赛季而停掉。",
    ],
  },
  {
    id: "vault-vs-wallet",
    title: "牛马金库是不是公共钱包？",
    summary: "不是。它更像团队累计贡献的可视化表达。",
    bullets: [
      "金库上涨不等于团队成员能从里面各自提现吗。",
      "个人银子和金库回答的是两个完全不同的问题。",
    ],
  },
  {
    id: "why-profile-entry",
    title: "为什么文档中心放在下拉里，不放主导航？",
    summary: "因为它是说明型内容中心，不是高频主工作台。",
    bullets: [
      "主导航优先留给每天高频切换的工作场景。",
      "文档中心更适合在需要补课、查规则或回看更新时进入。",
    ],
  },
];
```

- [ ] **Step 4: Run the content test and confirm it passes**

Run: `npm test -- __tests__/docs-content.test.ts`

Expected: PASS with 1 test file and 1 test passed

- [ ] **Step 5: Commit the content foundation**

```bash
git add __tests__/docs-content.test.ts content/docs-center/types.ts content/docs-center/changelog.ts content/docs-center/rules.ts content/docs-center/help.ts content/docs-center/faq.ts
git commit -m "feat: add docs center content modules"
```

### Task 2: Build The Docs Center Client Components

**Files:**
- Create: `components/docs-center/DocsCenter.tsx`
- Create: `components/docs-center/DocsTabs.tsx`
- Create: `components/docs-center/DocsTableOfContents.tsx`
- Create: `components/docs-center/DocsSection.tsx`
- Test: `__tests__/docs-center.test.tsx`

- [ ] **Step 1: Write the failing client-component test**

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocsCenter } from "@/components/docs-center/DocsCenter";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/docs",
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("DocsCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    replaceMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the rules tab with a deep-linkable table of contents and query navigation", async () => {
    await act(async () => {
      root.render(<DocsCenter initialTab="rules" />);
    });

    expect(container.textContent).toContain("文档中心");
    expect(container.textContent).toContain("赛季规则");
    expect(container.querySelector('a[href="/docs?tab=rules#vault"]')).not.toBeNull();
    expect(container.textContent).toContain("牛马金库");

    const faqButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("常见问题"),
    );

    expect(faqButton).toBeDefined();

    await act(async () => {
      faqButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(replaceMock).toHaveBeenCalledWith("/docs?tab=faq", { scroll: false });
  });
});
```

- [ ] **Step 2: Run the client-component test to confirm it fails**

Run: `npm test -- __tests__/docs-center.test.tsx`

Expected: FAIL with `Cannot find module '@/components/docs-center/DocsCenter'`

- [ ] **Step 3: Implement the docs center client components**

```tsx
// components/docs-center/DocsTabs.tsx
import type { DocsTab, DocsTabDefinition } from "@/content/docs-center/types";

export function DocsTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: DocsTabDefinition[];
  activeTab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
}) {
  return (
    <div className="docs-tabs" role="tablist" aria-label="文档中心栏目">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`docs-tab ${activeTab === tab.id ? "docs-tab-active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="docs-tab-label">{tab.label}</span>
          <span className="docs-tab-description">{tab.description}</span>
        </button>
      ))}
    </div>
  );
}
```

```tsx
// components/docs-center/DocsTableOfContents.tsx
export interface DocsTocItem {
  id: string;
  label: string;
}

export function DocsTableOfContents({
  tab,
  items,
}: {
  tab: string;
  items: DocsTocItem[];
}) {
  return (
    <nav className="docs-toc" aria-label="当前栏目目录">
      <p className="docs-toc-eyebrow">本页索引</p>
      <ul className="docs-toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a className="docs-toc-link" href={`/docs?tab=${tab}#${item.id}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

```tsx
// components/docs-center/DocsSection.tsx
import type { DocsContentSection } from "@/content/docs-center/types";

export function DocsSection({ section }: { section: DocsContentSection }) {
  return (
    <article id={section.id} className="docs-section">
      <div className="docs-section-kicker">SECTION</div>
      <h2 className="docs-section-title">{section.title}</h2>
      <p className="docs-section-summary">{section.summary}</p>
      <ul className="docs-section-list">
        {section.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {section.note ? <p className="docs-section-note">{section.note}</p> : null}
    </article>
  );
}
```

```tsx
// components/docs-center/DocsCenter.tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { docsChangelog } from "@/content/docs-center/changelog";
import { docsFaq } from "@/content/docs-center/faq";
import { docsHelp } from "@/content/docs-center/help";
import { docsRules } from "@/content/docs-center/rules";
import { docsTabs, type DocsContentSection, type DocsTab } from "@/content/docs-center/types";
import { DocsSection } from "./DocsSection";
import { DocsTableOfContents } from "./DocsTableOfContents";
import { DocsTabs } from "./DocsTabs";

function getSectionsForTab(tab: DocsTab): DocsContentSection[] {
  if (tab === "rules") return docsRules;
  if (tab === "help") return docsHelp;
  if (tab === "faq") return docsFaq;

  return docsChangelog.map((entry) => ({
    id: entry.id,
    title: entry.title,
    summary: `${entry.date} · ${entry.summary}`,
    bullets: entry.bullets,
    note: entry.tags?.length ? `标签：${entry.tags.join(" / ")}` : undefined,
  }));
}

export function DocsCenter({ initialTab }: { initialTab: DocsTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<DocsTab>(initialTab);

  const activeTabMeta = docsTabs.find((tab) => tab.id === activeTab) ?? docsTabs[0];
  const sections = getSectionsForTab(activeTab);
  const updatedAt = docsChangelog[0]?.date ?? "2026-04-27";

  function handleTabChange(tab: DocsTab) {
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

      <DocsTabs tabs={docsTabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="docs-center-body">
        <aside className="docs-center-sidebar">
          <p className="docs-current-tab">{activeTabMeta.label}</p>
          <p className="docs-current-description">{activeTabMeta.description}</p>
          <DocsTableOfContents
            tab={activeTab}
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
```

- [ ] **Step 4: Run the client-component test and confirm it passes**

Run: `npm test -- __tests__/docs-center.test.tsx`

Expected: PASS with the docs client component rendering and query replacement verified

- [ ] **Step 5: Commit the docs center client components**

```bash
git add __tests__/docs-center.test.tsx components/docs-center/DocsCenter.tsx components/docs-center/DocsTabs.tsx components/docs-center/DocsTableOfContents.tsx components/docs-center/DocsSection.tsx
git commit -m "feat: build docs center client shell"
```

### Task 3: Wire The Standalone Route And Profile Entry

**Files:**
- Create: `app/(board)/docs/page.tsx`
- Create: `__tests__/docs-route-page.test.tsx`
- Modify: `components/navbar/ProfileDropdown.tsx`
- Modify: `__tests__/profile-dropdown.test.tsx`

- [ ] **Step 1: Write the failing route and dropdown tests**

```tsx
// __tests__/docs-route-page.test.tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocsPage from "@/app/(board)/docs/page";

vi.mock("@/components/docs-center/DocsCenter", () => ({
  DocsCenter: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="docs-center">docs center: {initialTab}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("DocsPage route", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("normalizes unknown query tabs and renders the standalone docs shell", async () => {
    const element = await DocsPage({
      searchParams: Promise.resolve({ tab: "unknown" }),
    });

    await act(async () => {
      root.render(element);
    });

    expect(container.querySelector('[data-testid="docs-center"]')?.textContent).toContain(
      "changelog",
    );
    expect(container.textContent).not.toContain("shared navbar");
  });
});
```

```tsx
// __tests__/profile-dropdown.test.tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileDropdown } from "@/components/navbar/ProfileDropdown";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const initialState: BoardState = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[false]],
  teamVaultTotal: 0,
  currentUser: {
    assetBalance: 3450,
    currentStreak: 12,
    nextReward: 40,
    seasonIncome: 0,
    isAdmin: true,
  },
  today: 1,
  totalDays: 1,
  currentUserId: "user-1",
  logs: [],
  activeTab: "punch",
};

describe("ProfileDropdown", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("shows docs center beside the existing account actions", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ProfileDropdown onDismiss={() => {}} onEditProfile={() => {}} />
        </BoardProvider>,
      );
    });

    const docsLink = container.querySelector('a[href="/docs"]');

    expect(docsLink).not.toBeNull();
    expect(docsLink?.textContent).toContain("文档中心");
  });
});
```

- [ ] **Step 2: Run the route and dropdown tests to confirm they fail**

Run: `npm test -- __tests__/docs-route-page.test.tsx __tests__/profile-dropdown.test.tsx`

Expected: FAIL because `/docs` route does not exist and the dropdown has no docs link yet

- [ ] **Step 3: Implement the standalone route and wire the Profile dropdown entry**

```tsx
// app/(board)/docs/page.tsx
import { DocsCenter } from "@/components/docs-center/DocsCenter";
import type { DocsTab } from "@/content/docs-center/types";

const validTabs: DocsTab[] = ["changelog", "rules", "help", "faq"];

function resolveDocsTab(value: string | string[] | undefined): DocsTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return validTabs.includes(candidate as DocsTab) ? (candidate as DocsTab) : "changelog";
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialTab = resolveDocsTab(params.tab);

  return (
    <div className="p-4 sm:p-6">
      <DocsCenter initialTab={initialTab} />
    </div>
  );
}
```

```tsx
// components/navbar/ProfileDropdown.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ProfileDropdownProps {
  onDismiss: () => void;
  onEditProfile: () => void;
}

export function ProfileDropdown({ onDismiss, onEditProfile }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { state } = useBoard();
  const currentUser = state.currentUser;
  const assetBalance = currentUser?.assetBalance ?? 0;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.classList.add("show");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onDismiss} />
      <div
        ref={ref}
        className="dropdown-menu flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sub">我的银子</span>
            <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
              <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
              {assetBalance.toLocaleString("zh-CN")}
            </div>
            <span className="mt-1 text-xs font-medium text-sub">
              个人长期累计资产，不是团队公共钱包。
            </span>
          </div>
        </div>
        <div className="p-5 border-t-2 border-slate-100 bg-slate-50 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <div className="flex flex-col">
              <span>连签</span>
              <span className="text-xs font-medium text-sub">连续有效健身打卡</span>
            </div>
            <span className="text-slate-700">{currentUser?.currentStreak ?? 0} 天</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <div className="flex flex-col">
              <span>下次奖励</span>
              <span className="text-xs font-medium text-sub">下一次有效打卡可得</span>
            </div>
            <span className="text-slate-700">{currentUser?.nextReward ?? 0} 银子</span>
          </div>
          <Link
            href="/docs"
            className="mt-2 w-full py-2 text-center text-sm font-bold text-slate-800 bg-white border-2 border-slate-300 rounded-xl hover:border-slate-800 transition-colors"
          >
            文档中心
          </Link>
          {currentUser?.isAdmin ? (
            <Link
              href="/admin"
              className="w-full py-2 text-center text-sm font-bold text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
            >
              赛季设置
            </Link>
          ) : null}
          <button
            onClick={onEditProfile}
            className="w-full py-2 text-sm font-bold text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
          >
            编辑资料
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm font-bold text-red-500 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the route and dropdown tests and confirm they pass**

Run: `npm test -- __tests__/docs-route-page.test.tsx __tests__/profile-dropdown.test.tsx`

Expected: PASS with the standalone docs route and dropdown entry verified

- [ ] **Step 5: Commit the route integration**

```bash
git add "app/(board)/docs/page.tsx" __tests__/docs-route-page.test.tsx components/navbar/ProfileDropdown.tsx __tests__/profile-dropdown.test.tsx
git commit -m "feat: add docs center route and entry"
```

### Task 4: Add Editorial Styling And Final Verification

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/docs-center-css.test.ts`

- [ ] **Step 1: Write the failing styling and responsive test**

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("docs center CSS", () => {
  it("adds the editorial docs center shell and responsive tab treatment", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain(".docs-center-shell");
    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*border:\s*4px solid #1f2937/);
    expect(css).toMatch(/\.docs-center-header\s*\{[\s\S]*background:/);
    expect(css).toMatch(/\.docs-tab-active[\s\S]*background-color:\s*#fde047/);
    expect(css).toMatch(/\.docs-toc-link[\s\S]*text-transform:\s*uppercase/);
    expect(css).toMatch(/@media \(max-width:\s*960px\)[\s\S]*\.docs-center-body\s*\{[\s\S]*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-tabs\s*\{[\s\S]*overflow-x:\s*auto/);
  });
});
```

- [ ] **Step 2: Run the styling test to confirm it fails**

Run: `npm test -- __tests__/docs-center-css.test.ts`

Expected: FAIL because the docs center CSS hooks do not exist yet

- [ ] **Step 3: Add the editorial styling hooks and final polish**

```css
/* app/globals.css */
.docs-center-shell {
  border: 4px solid #1f2937;
  border-radius: 2rem;
  background: linear-gradient(180deg, #fffdf5 0%, #fffaf0 100%);
  box-shadow: 0 10px 0 0 #1f2937;
  overflow: hidden;
}

.docs-center-header {
  padding: 1.5rem;
  border-bottom: 3px solid #1f2937;
  background:
    linear-gradient(135deg, rgba(253, 224, 71, 0.18), transparent 55%),
    linear-gradient(180deg, #fff8dc, #fffdf5);
}

.docs-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

.docs-center-kicker {
  margin-top: 0.85rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: #92400e;
}

.docs-center-title-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.docs-center-title {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 0.95;
  font-weight: 900;
  color: #111827;
}

.docs-center-intro {
  margin-top: 0.75rem;
  max-width: 42rem;
  font-size: 0.98rem;
  font-weight: 700;
  color: #475569;
}

.docs-center-stamp {
  flex-shrink: 0;
  border: 3px solid #1f2937;
  border-radius: 1.25rem;
  padding: 0.85rem 1rem;
  background-color: #fde68a;
  color: #111827;
  box-shadow: 0 4px 0 0 #1f2937;
}

.docs-center-stamp-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #78350f;
}

.docs-tabs {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid #e2e8f0;
  background-color: rgba(255, 255, 255, 0.82);
}

.docs-tab {
  min-width: 13rem;
  border: 2px solid #cbd5e1;
  border-radius: 1.25rem;
  padding: 0.85rem 1rem;
  text-align: left;
  background-color: #fffdf5;
  transition: transform 180ms ease, border-color 180ms ease;
}

.docs-tab:hover {
  transform: translateY(-1px);
  border-color: #1f2937;
}

.docs-tab-active {
  border-color: #1f2937;
  background-color: #fde047;
  box-shadow: 0 4px 0 0 #1f2937;
}

.docs-tab-label {
  display: block;
  font-size: 1rem;
  font-weight: 900;
  color: #111827;
}

.docs-tab-description {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.docs-center-body {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
  gap: 0;
}

.docs-center-sidebar {
  padding: 1.5rem;
  border-right: 2px solid #e2e8f0;
  background:
    linear-gradient(180deg, rgba(253, 224, 71, 0.12), transparent 18%),
    #fffef8;
}

.docs-current-tab {
  font-size: 1.4rem;
  font-weight: 900;
  color: #111827;
}

.docs-current-description {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
}

.docs-toc {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 2px dashed #cbd5e1;
}

.docs-toc-eyebrow {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #92400e;
}

.docs-toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.docs-toc-link {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #334155;
}

.docs-center-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.docs-section {
  border: 3px solid #1f2937;
  border-radius: 1.5rem;
  padding: 1.25rem;
  background-color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 5px 0 0 #1f2937;
  scroll-margin-top: 1.5rem;
}

.docs-section-kicker {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #92400e;
}

.docs-section-title {
  margin-top: 0.35rem;
  font-size: clamp(1.4rem, 2.2vw, 2rem);
  line-height: 1;
  font-weight: 900;
  color: #111827;
}

.docs-section-summary {
  margin-top: 0.75rem;
  font-size: 0.96rem;
  font-weight: 700;
  color: #475569;
}

.docs-section-list {
  margin-top: 0.9rem;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #1f2937;
}

.docs-section-note {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background-color: #fef3c7;
  font-size: 0.82rem;
  font-weight: 700;
  color: #78350f;
}

@media (max-width: 960px) {
  .docs-center-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .docs-center-body {
    grid-template-columns: 1fr;
  }

  .docs-center-sidebar {
    border-right: 0;
    border-bottom: 2px solid #e2e8f0;
  }
}

@media (max-width: 760px) {
  .docs-tabs {
    overflow-x: auto;
    padding: 0.9rem 1rem;
  }

  .docs-tab {
    min-width: 11.5rem;
  }

  .docs-center-header,
  .docs-center-sidebar,
  .docs-center-content {
    padding: 1rem;
  }
}
```

- [ ] **Step 4: Run the styling test and the focused docs suite**

Run: `npm test -- __tests__/docs-center-css.test.ts __tests__/docs-content.test.ts __tests__/docs-center.test.tsx __tests__/docs-route-page.test.tsx __tests__/profile-dropdown.test.tsx`

Expected: PASS with all focused docs-center tests green

- [ ] **Step 5: Commit the styling and verification pass**

```bash
git add app/globals.css __tests__/docs-center-css.test.ts
git commit -m "style: polish docs center editorial layout"
```

## Final Verification

- [ ] Run: `npm test -- __tests__/docs-content.test.ts __tests__/docs-center.test.tsx __tests__/docs-route-page.test.tsx __tests__/profile-dropdown.test.tsx __tests__/docs-center-css.test.ts`
Expected: PASS

- [ ] Run: `npm run lint`
Expected: PASS with no TypeScript errors

- [ ] Run: `npm test`
Expected: PASS for the full Vitest suite
