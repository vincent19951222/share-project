# Supply UI Lab Draw Pool Static Business Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Supply UI Lab `补给抽卡机` 改成共享 catalog 驱动的静态抽奖模拟页，统一使用 `抽奖券`，展示十连批次保底说明，并让单抽/十连在本地更新余额和结果反馈。

**Architecture:** 抽卡机 mock 只负责把共享 `supply-data` 的资源、银子奖励行和 active catalog 道具映射成页面展示形态；场景组件改为 client component，用本地 state 管理抽奖券余额、最近一次抽卡结果和不足提示。所有交互只做 UI Lab 静态模拟，不调用 API、不写 Prisma、不实现长期累计保底。

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab CSS and primitives.

---

## Scope

本计划对应任务级 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-07-draw-pool-design.md`

它是总计划中任务 7 的聚焦执行计划：

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

## Assumptions

任务 1-6 已完成或正在同一工作树中推进。以下共享文件已经存在并应复用：

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/catalog.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`

当前共享 catalog 使用 `weightLabel` 和 `sourceRewardId` 字段，不使用早期总计划草案里的 `probabilityLabel`。本任务按当前代码形态执行。

工作树可能已有 Dashboard、Backpack 或 Shop 任务的未提交变更。执行本任务时只 stage 和 commit Draw Pool 文件、Draw Pool 测试文件，以及本任务确实修改到的 `app/globals.css` 片段。

不要尝试在本任务中让全局 static business closure guardrail 全部通过。它可能仍会因为 Task Record 或 Team Goal 的后续任务失败。本任务只负责 Draw Pool 自身的旧词汇、长期保底和本地抽卡反馈。

## File Structure

- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`
  - 使用共享 `SupplyUiLabResource`、catalog rarity 和 draw tier 类型。
  - 将 `pity` 替换为 `guarantee`。
  - 新增 `singleDrawResult`、`tenDrawResult`、`emptyDrawMessage`。
  - 给奖池概率行加入稳定 `tier`，支持 `coin 45 / utility 27 / social 24 / rare 4`。
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
  - 导入 `supplyUiLabResources.drawPool`、`SUPPLY_UI_LAB_COIN_REWARD_ROWS`、`supplyUiLabCatalog`。
  - 奖池概率改为 `coin 45 / utility 27 / social 24 / rare 4`。
  - 奖池预览、最近掉落和本地抽卡结果来自共享银子奖励行与共享 catalog。
  - 移除 `补给券`、`保底进度`、`48/70`、长期累计保底数据。
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
  - 添加 `"use client";` 和 `useMemo` / `useState`。
  - 顶部资源和钱包抽奖券余额使用本地 `ticketBalance`。
  - 单抽和十连按钮调用本地 handler，余额不足时禁用并展示解释。
  - 右侧面板从长期保底进度改为 `十连保底说明`。
  - 在最近掉落附近展示 `本次结果` / `本次十连结果`。
- Modify: `app/globals.css`
  - 将 `.supply-draw-pool-pity` 样式改为 `.supply-draw-pool-guarantee`。
  - 添加 `.supply-draw-pool-result` 和禁用按钮样式。
  - 移除只服务长期保底进度的样式断言目标。
- Modify: `__tests__/supply-draw-pool-mock-data.test.ts`
  - 验证共享资源、概率、十连保底说明、结果 fixture、旧词汇移除。
- Modify: `__tests__/supply-draw-pool-scene.test.tsx`
  - 验证页面不再渲染长期保底。
  - 验证单抽/十连本地扣券和结果反馈。
  - 验证余额不足按钮禁用或解释。
- Modify: `__tests__/supply-draw-pool-assets.test.ts`
  - 验证最近掉落和本地结果引用的 catalog/银子图标存在。
- Modify: `__tests__/supply-draw-pool-scene-css.test.ts`
  - 验证 guarantee/result 样式存在，旧 pity 样式不再作为页面依赖。

## Task 1: Update Draw Pool Contract Tests First

**Files:**
- Modify: `__tests__/supply-draw-pool-mock-data.test.ts`
- Modify: `__tests__/supply-draw-pool-scene.test.tsx`
- Modify: `__tests__/supply-draw-pool-assets.test.ts`
- Modify: `__tests__/supply-draw-pool-scene-css.test.ts`

- [ ] **Step 1: Replace the Draw Pool mock data test**

Replace the full contents of `__tests__/supply-draw-pool-mock-data.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import {
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
} from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyUiLabResources } from "@/components/gamification/ui-lab/supply-data/resources";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

describe("supply draw pool mock data", () => {
  it("uses shared Phase 2 resources and the approved draw-pool probabilities", () => {
    const serialized = JSON.stringify(supplyDrawPoolMock);

    expect(serialized).not.toMatch(
      /(topbar|wallet|guide|rates|probability|pity|rules|recent|machine)Panel|panelImage/,
    );
    expect(supplyDrawPoolMock.topBar.resources).toBe(supplyUiLabResources.drawPool);
    expect(supplyDrawPoolMock.topBar.resources.map((resource) => resource.label)).toEqual([
      "银子",
      "抽奖券",
      "背包",
    ]);
    expect(supplyDrawPoolMock.wallet.ticketBalance).toBe(18);
    expect(supplyDrawPoolMock.wallet.helper).toBe("今日获取上限：18/30 张抽奖券");
    expect(supplyDrawPoolMock.poolRates.map((rate) => `${rate.tier}:${rate.percent}`)).toEqual([
      "coin:45",
      "utility:27",
      "social:24",
      "rare:4",
    ]);
    expect(serialized).not.toContain("补给券");
    expect(serialized).not.toContain("保底进度");
    expect(serialized).not.toContain("48/70");
  });

  it("models ten-draw batch guarantee and no single-draw guarantee", () => {
    expect(supplyDrawPoolMock.guarantee).toEqual({
      title: "十连保底说明",
      description: "单抽没有保底；十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。",
      eligibleTiers: ["utility", "social", "rare"],
      eligibleTierLabels: ["实用", "社交", "稀有"],
    });
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "single")).toMatchObject({
      drawCount: 1,
      costTicket: 1,
      guaranteeLabel: "单抽无保底",
    });
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "ten")).toMatchObject({
      drawCount: 10,
      costTicket: 10,
      guaranteeLabel: "十连批次保底",
    });
    expect(supplyDrawPoolMock.rules).toEqual([
      "消耗抽奖券进行抽取，随机获得银子、实用道具、社交道具或稀有奖励。",
      "单抽没有保底。",
      "十连批次如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。",
    ]);
  });

  it("derives recent drops and local draw results from shared coin rows and catalog items", () => {
    const catalogIds = supplyUiLabCatalog.map((item) => item.sourceItemId);
    const coinRewardIds = SUPPLY_UI_LAB_COIN_REWARD_ROWS.map((row) => row.rewardId);

    expect(supplyDrawPoolMock.recentDrops).toHaveLength(6);
    expect(supplyDrawPoolMock.recentDrops[0]).toMatchObject({
      id: "coins_120",
      name: "牛马暴富",
      quantityLabel: "银子 x120",
    });
    expect(catalogIds).toContain(supplyDrawPoolMock.recentDrops[1]?.id);
    expect(supplyDrawPoolMock.singleDrawResult).toEqual([
      expect.objectContaining({
        id: "coins_020",
        name: "今日没白来",
        quantityLabel: "银子 x20",
      }),
    ]);
    expect(supplyDrawPoolMock.tenDrawResult).toHaveLength(10);
    expect(supplyDrawPoolMock.tenDrawResult.some((result) => coinRewardIds.includes(result.id))).toBe(true);
    expect(supplyDrawPoolMock.tenDrawResult.some((result) => catalogIds.includes(result.id))).toBe(true);
    expect(
      supplyDrawPoolMock.tenDrawResult.some((result) =>
        ["utility", "social", "rare"].includes(result.tier),
      ),
    ).toBe(true);
  });

  it("keeps draw-pool media isolated while reusing catalog reward art", () => {
    expect(Object.values(supplyDrawPoolAssetPaths.drawPool).every((path) =>
      path.startsWith("/assets/home-scenes/supply/draw-pool/"),
    )).toBe(true);
    expect(supplyDrawPoolAssetPaths.rewardIcons.ticket).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(supplyDrawPoolAssetPaths.rewardIcons.coins).toBe("/gamification/rewards/icons/coins_120.png");
    expect(supplyDrawPoolMock.recentDrops.every((drop) => drop.image.startsWith("/"))).toBe(true);
    expect(supplyDrawPoolMock.singleDrawResult.every((result) => result.image.startsWith("/"))).toBe(true);
    expect(supplyDrawPoolMock.tenDrawResult.every((result) => result.image.startsWith("/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Replace the Draw Pool scene test**

Replace the full contents of `__tests__/supply-draw-pool-scene.test.tsx` with:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyDrawPoolScene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders draw-pool surfaces with Phase 2 vocabulary and no long-term pity", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-scene")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar-image")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-wallet-image")).toBeNull();
    expect(container.querySelector("a.supply-draw-pool-close")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelector("a.supply-draw-pool-back")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.textContent).toContain("当前拥有");
    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("18 张");
    expect(container.textContent).toContain("今日获取上限：18/30 张抽奖券");
    expect(container.textContent).toContain("十连保底说明");
    expect(container.textContent).toContain("单抽没有保底");
    expect(container.textContent).toContain("十连批次如果自然结果没有实用、社交或稀有奖励");
    expect(container.textContent).toContain("最近掉落");
    expect(container.textContent).toContain("牛马暴富");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("保底进度");
    expect(container.textContent).not.toContain("48/70");
  });

  it("uses reusable reward icons and draw-pool-specific media", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDrawPoolAssetPaths.drawPool.machine,
        supplyDrawPoolAssetPaths.drawPool.capsuleBed,
        supplyDrawPoolAssetPaths.drawPool.guideMascot,
        supplyDrawPoolAssetPaths.cowLogo,
        "/gamification/rewards/icons/coins_120.png",
        "/gamification/rewards/icons/task_reroll_coupon.png",
      ]),
    );
  });

  it("shows local single draw result and decrements ticket balance", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const singleDrawButton = container.querySelector<HTMLButtonElement>("button[aria-label*='单抽']");

    expect(singleDrawButton).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-result")).toBeNull();

    await act(async () => {
      singleDrawButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".supply-draw-pool-result")?.textContent).toContain("本次结果");
    expect(container.querySelector(".supply-draw-pool-result")?.textContent).toContain("今日没白来");
    expect(container.querySelector(".supply-draw-pool-result")?.textContent).toContain("银子 x20");
    expect(container.textContent).toContain("剩余 17 张抽奖券");
    expect(container.querySelector(".supply-draw-pool-ticket-count")?.textContent).toContain("17 张");
  });

  it("shows local ten draw result and then disables ten draw when balance is too low", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const tenDrawButton = () => container.querySelector<HTMLButtonElement>("button[aria-label*='十连']");

    await act(async () => {
      tenDrawButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".supply-draw-pool-result")?.textContent).toContain("本次十连结果");
    expect(container.querySelector(".supply-draw-pool-result")?.textContent).toContain("剩余 8 张抽奖券");
    expect(container.querySelectorAll(".supply-draw-pool-result .supply-draw-pool-drop")).toHaveLength(10);
    expect(tenDrawButton()?.disabled).toBe(true);
    expect(tenDrawButton()?.getAttribute("aria-label")).toContain("抽奖券不足");
    expect(container.textContent).toContain("十连还差 2 张抽奖券");
  });

  it("renders side modules with visible controls and text", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-guide-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-rules-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-rates .supply-ui-lab-panel-title")?.textContent).toContain(
      "奖池预览",
    );
    expect(container.querySelector(".supply-draw-pool-probability")?.textContent).toContain("概率公示");
    expect(container.querySelector(".supply-draw-pool-rules a[aria-label='查看规则']")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent a[aria-label='全部记录']")).not.toBeNull();
    expect(container.textContent).toContain("完成任务拿抽奖券，抽银子、道具和福利奖励！");
    expect(container.textContent).toContain("消耗抽奖券进行抽取");
  });
});
```

- [ ] **Step 3: Extend the Draw Pool asset test**

In `__tests__/supply-draw-pool-assets.test.ts`, add this test after `references existing reusable dashboard and reward assets`:

```typescript
it("references existing assets for recent drops and local draw results", () => {
  const resultSources = [
    ...supplyDrawPoolMock.recentDrops.map((drop) => drop.image),
    ...supplyDrawPoolMock.singleDrawResult.map((result) => result.image),
    ...supplyDrawPoolMock.tenDrawResult.map((result) => result.image),
  ];

  for (const src of resultSources) {
    expect(existsSync(publicPath(src)), `${src} should exist`).toBe(true);
  }
});
```

- [ ] **Step 4: Replace the Draw Pool scene CSS test**

Replace the full contents of `__tests__/supply-draw-pool-scene-css.test.ts` with:

```typescript
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

describe("supply draw pool scene CSS", () => {
  it("styles the guarantee and local result panels instead of long-term pity", () => {
    expect(css).toContain(".supply-draw-pool-guarantee");
    expect(css).toContain(".supply-draw-pool-result");
    expect(css).toContain(".supply-draw-pool-ticket-shortage");
    expect(css).toContain(".supply-draw-pool-action:disabled");
    expect(css).not.toContain(".supply-draw-pool-pity");
  });
});
```

- [ ] **Step 5: Run Draw Pool tests and verify failures**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: FAIL because current code still has `pity`, old probabilities, old scene text, no local draw state, and no result/guarantee CSS.

## Task 2: Update Draw Pool Types

**Files:**
- Modify: `components/gamification/ui-lab/supply-draw-pool/types.ts`

- [ ] **Step 1: Replace Draw Pool types**

Replace the full contents of `components/gamification/ui-lab/supply-draw-pool/types.ts` with:

```typescript
import type {
  SupplyUiLabCatalogRarity,
  SupplyUiLabDrawTier,
  SupplyUiLabResource,
} from "../supply-data/types";

export type SupplyDrawPoolActionId = "single" | "ten";
export type SupplyDrawPoolRateTier = "coin" | SupplyUiLabDrawTier;
export type SupplyDrawPoolRarity = SupplyUiLabCatalogRarity;

export type SupplyDrawPoolWalletAction = {
  id: "more-tickets" | "tasks";
  label: string;
  tone: "primary" | "secondary";
};

export type SupplyDrawPoolWallet = {
  ticketIcon: string;
  ticketBalance: number;
  dailyEarned: number;
  dailyLimit: number;
  helper: string;
  actions: SupplyDrawPoolWalletAction[];
};

export type SupplyDrawPoolGuide = {
  mascotImage: string;
  message: string;
  actionLabel: string;
};

export type SupplyDrawPoolRate = {
  tier: SupplyDrawPoolRateTier;
  rarity: "银子" | "实用" | "社交" | "稀有";
  percent: number;
  tone: "ssr" | "sr" | "r" | "n";
};

export type SupplyDrawPoolMachineAction = {
  id: SupplyDrawPoolActionId;
  label: string;
  drawCount: number;
  costTicket: number;
  tone: "single" | "ten";
  guaranteeLabel: "单抽无保底" | "十连批次保底";
};

export type SupplyDrawPoolMachine = {
  title: string;
  emblemImage: string;
  skipAnimation: boolean;
  actions: SupplyDrawPoolMachineAction[];
};

export type SupplyDrawPoolGuarantee = {
  title: "十连保底说明";
  description: string;
  eligibleTiers: SupplyUiLabDrawTier[];
  eligibleTierLabels: Array<"实用" | "社交" | "稀有">;
};

export type SupplyDrawPoolRewardRow = {
  id: string;
  tier: SupplyDrawPoolRateTier;
  rarity: SupplyDrawPoolRarity;
  name: string;
  quantityLabel: string;
  image: string;
};

export type SupplyDrawPoolPreview = {
  media: {
    background: string;
    machine: string;
    capsuleBed: string;
    guideMascot: string;
    wristband: string;
    runningShoe: string;
  };
  topBar: {
    resources: SupplyUiLabResource[];
    closeHref: string;
  };
  wallet: SupplyDrawPoolWallet;
  guide: SupplyDrawPoolGuide;
  poolRates: SupplyDrawPoolRate[];
  machine: SupplyDrawPoolMachine;
  guarantee: SupplyDrawPoolGuarantee;
  recentDrops: SupplyDrawPoolRewardRow[];
  singleDrawResult: SupplyDrawPoolRewardRow[];
  tenDrawResult: SupplyDrawPoolRewardRow[];
  emptyDrawMessage: string;
  rules: string[];
  probabilityHref: string;
  recordsHref: string;
  backHref: string;
};
```

- [ ] **Step 2: Run TypeScript-facing Draw Pool tests and verify type errors move to data/scene**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx
```

Expected: FAIL because `mock-data.ts` and `SupplyDrawPoolScene.tsx` still reference removed `pity` fields.

## Task 3: Update Draw Pool Mock Data From Shared Catalog

**Files:**
- Modify: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`

- [ ] **Step 1: Replace imports and add shared-data helpers**

At the top of `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`, replace the current import block with:

```typescript
import {
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "../supply-data/catalog";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyUiLabCatalogItem, SupplyUiLabCoinRewardRow } from "../supply-data/types";
import type { SupplyDrawPoolPreview, SupplyDrawPoolRewardRow } from "./types";
```

After `supplyDrawPoolAssetPaths`, add:

```typescript
const coinRewardToDrawRow = (row: SupplyUiLabCoinRewardRow): SupplyDrawPoolRewardRow => ({
  id: row.rewardId,
  tier: "coin",
  rarity: "N",
  name: row.name,
  quantityLabel: `银子 x${row.amount}`,
  image: row.image,
});

const catalogItemToDrawRow = (item: SupplyUiLabCatalogItem): SupplyDrawPoolRewardRow => ({
  id: item.sourceItemId,
  tier: item.drawPool.tier,
  rarity: item.rarity,
  name: item.name,
  quantityLabel: "x1",
  image: item.media.image,
});

const coinRows = SUPPLY_UI_LAB_COIN_REWARD_ROWS.map(coinRewardToDrawRow);

const catalogRows = supplyUiLabCatalog.map(catalogItemToDrawRow);
```

- [ ] **Step 2: Replace the mock object with shared-data-backed values**

Inside `supplyDrawPoolMock`, make these exact field changes:

```typescript
topBar: {
  resources: supplyUiLabResources.drawPool,
  closeHref: "/ui-lab/supply-dashboard",
},
wallet: {
  ticketIcon: supplyDrawPoolAssetPaths.rewardIcons.ticket,
  ticketBalance: 18,
  dailyEarned: 18,
  dailyLimit: 30,
  helper: "今日获取上限：18/30 张抽奖券",
  actions: [
    { id: "more-tickets", label: "获取更多抽奖券", tone: "primary" },
    { id: "tasks", label: "前往任务", tone: "secondary" },
  ],
},
guide: {
  mascotImage: supplyDrawPoolAssetPaths.drawPool.guideMascot,
  message: "完成任务拿抽奖券，抽银子、道具和福利奖励！",
  actionLabel: "去完成",
},
poolRates: [
  { tier: "coin", rarity: "银子", percent: 45, tone: "n" },
  { tier: "utility", rarity: "实用", percent: 27, tone: "r" },
  { tier: "social", rarity: "社交", percent: 24, tone: "sr" },
  { tier: "rare", rarity: "稀有", percent: 4, tone: "ssr" },
],
machine: {
  title: "补给抽卡机",
  emblemImage: supplyDrawPoolAssetPaths.cowLogo,
  skipAnimation: false,
  actions: [
    { id: "single", label: "单抽", drawCount: 1, costTicket: 1, tone: "single", guaranteeLabel: "单抽无保底" },
    { id: "ten", label: "十连", drawCount: 10, costTicket: 10, tone: "ten", guaranteeLabel: "十连批次保底" },
  ],
},
guarantee: {
  title: "十连保底说明",
  description: "单抽没有保底；十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。",
  eligibleTiers: ["utility", "social", "rare"],
  eligibleTierLabels: ["实用", "社交", "稀有"],
},
recentDrops: [
  coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[5]),
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.double_niuma_coupon),
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.team_broadcast_coupon),
  coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[2]),
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.luckin_coffee_coupon),
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.drink_water_ping),
],
singleDrawResult: [coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[2])],
tenDrawResult: [
  coinRows[0],
  coinRows[1],
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.drink_water_ping),
  coinRows[2],
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.walk_ping),
  coinRows[3],
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.task_reroll_coupon),
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.team_broadcast_coupon),
  coinRows[4],
  catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.luckin_coffee_coupon),
],
emptyDrawMessage: "抽奖券不足，先完成任务获取更多抽奖券。",
rules: [
  "消耗抽奖券进行抽取，随机获得银子、实用道具、社交道具或稀有奖励。",
  "单抽没有保底。",
  "十连批次如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。",
],
```

Remove the old `pity` object entirely.

- [ ] **Step 3: Keep helper arrays used**

If TypeScript reports `catalogRows` as unused after the previous step, replace the `recentDrops` first two catalog conversions with shared array lookups that preserve the same output:

```typescript
recentDrops: [
  coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[5]),
  catalogRows.find((row) => row.id === "double_niuma_coupon")!,
  catalogRows.find((row) => row.id === "team_broadcast_coupon")!,
  coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[2]),
  catalogRows.find((row) => row.id === "luckin_coffee_coupon")!,
  catalogRows.find((row) => row.id === "drink_water_ping")!,
],
```

- [ ] **Step 4: Run the mock data test**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts
```

Expected: PASS.

## Task 4: Convert Draw Pool Scene To Local Draw State

**Files:**
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`

- [ ] **Step 1: Add client component imports**

At the top of `SupplyDrawPoolScene.tsx`, add `"use client";` and import React state:

```typescript
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
```

Remove `SupplyUiLabProgress` from the primitive import list if it is no longer used after the wallet panel is adjusted.

- [ ] **Step 2: Make topbar and wallet accept local ticket balance**

Change function signatures:

```typescript
function DrawPoolTopBar({ data, ticketBalance }: { data: SupplyDrawPoolPreview; ticketBalance: number }) {
```

Inside the resource loop, render the live ticket count:

```tsx
<strong>{resource.id === "ticket" ? ticketBalance : resource.value}</strong>
```

Change wallet signature:

```typescript
function TicketWalletPanel({
  data,
  ticketBalance,
}: {
  data: SupplyDrawPoolPreview;
  ticketBalance: number;
}) {
```

Inside `.supply-draw-pool-ticket-count`, render:

```tsx
<strong>{ticketBalance} 张</strong>
```

Keep `SupplyUiLabProgress current={data.wallet.dailyEarned} label="今日获取上限" max={data.wallet.dailyLimit}` in place; it still models earned ticket cap, not draw balance.

- [ ] **Step 3: Update pool rates to use tier keys**

In `PoolPreviewPanel`, replace key and aria labels:

```tsx
<li
  aria-label={`${rate.rarity} 掉落概率 ${rate.percent}%`}
  className={`supply-draw-pool-rate supply-draw-pool-rate--${rate.tone}`}
  key={rate.tier}
>
```

- [ ] **Step 4: Wire machine actions**

Change the `DrawMachineStage` signature:

```typescript
function DrawMachineStage({
  data,
  onDraw,
  ticketBalance,
}: {
  data: SupplyDrawPoolPreview;
  onDraw: (drawCount: number) => void;
  ticketBalance: number;
}) {
```

Inside `data.machine.actions.map`, compute shortage before returning the button:

```tsx
{data.machine.actions.map((action) => {
  const shortage = Math.max(0, action.costTicket - ticketBalance);
  const disabled = shortage > 0;

  return (
    <SupplyUiLabActionButton
      ariaLabel={`${action.label} x${action.drawCount}，消耗抽奖券 x${action.costTicket}，${action.guaranteeLabel}${
        disabled ? `，抽奖券不足，还差 ${shortage} 张` : ""
      }`}
      className={`supply-draw-pool-action supply-draw-pool-action--${action.tone}`}
      disabled={disabled}
      key={action.id}
      onClick={() => onDraw(action.drawCount)}
    >
      <strong>
        {action.label} x{action.drawCount}
      </strong>
      <em>x{action.costTicket}</em>
      <span>{action.guaranteeLabel}</span>
    </SupplyUiLabActionButton>
  );
})}
```

After the controls, add the shortage explanation:

```tsx
{data.machine.actions.some((action) => action.id === "ten" && ticketBalance < action.costTicket) ? (
  <p className="supply-draw-pool-ticket-shortage">
    十连还差 {Math.max(0, 10 - ticketBalance)} 张抽奖券
  </p>
) : null}
```

- [ ] **Step 5: Replace the long-term pity rail with guarantee**

In `DrawInfoRail`, replace the `SupplyUiLabPixelPanel` with class `supply-draw-pool-pity` with:

```tsx
<SupplyUiLabPixelPanel
  ariaLabel={data.guarantee.title}
  className="supply-draw-pool-guarantee"
  title={data.guarantee.title}
>
  <p>{data.guarantee.description}</p>
  <ul>
    {data.guarantee.eligibleTierLabels.map((tierLabel) => (
      <li key={tierLabel}>{tierLabel}</li>
    ))}
  </ul>
</SupplyUiLabPixelPanel>
```

- [ ] **Step 6: Add a reusable reward-row renderer and result panel**

Before `RecentDropsPanel`, add:

```typescript
function DrawRewardList({ rewards }: { rewards: SupplyDrawPoolPreview["recentDrops"] }) {
  return (
    <ul className="supply-draw-pool-drop-list">
      {rewards.map((drop) => (
        <li className={`supply-draw-pool-drop supply-draw-pool-drop--${drop.rarity.toLowerCase()}`} key={drop.id}>
          <SupplyUiLabStatusBadge tone={drop.rarity === "SSR" ? "warning" : "muted"}>
            {drop.rarity}
          </SupplyUiLabStatusBadge>
          <Image alt="" height={84} src={drop.image} unoptimized width={84} />
          <strong>{drop.quantityLabel}</strong>
          <p>{drop.name}</p>
        </li>
      ))}
    </ul>
  );
}

function DrawResultPanel({
  resultLabel,
  results,
  ticketBalance,
}: {
  resultLabel: string | null;
  results: SupplyDrawPoolPreview["singleDrawResult"];
  ticketBalance: number;
}) {
  if (!resultLabel) {
    return null;
  }

  return (
    <SupplyUiLabPixelPanel ariaLabel={resultLabel} className="supply-draw-pool-result" title={resultLabel}>
      <p>剩余 {ticketBalance} 张抽奖券</p>
      <DrawRewardList rewards={results} />
    </SupplyUiLabPixelPanel>
  );
}
```

Change `RecentDropsPanel` so it uses `DrawRewardList`:

```tsx
<DrawRewardList rewards={data.recentDrops} />
```

- [ ] **Step 7: Add local draw state to the exported scene**

Inside `SupplyDrawPoolScene`, before `return`, add:

```typescript
const [ticketBalance, setTicketBalance] = useState(data.wallet.ticketBalance);
const [resultLabel, setResultLabel] = useState<string | null>(null);
const [drawResults, setDrawResults] = useState(data.singleDrawResult);
const emptyDrawMessage = useMemo(() => data.emptyDrawMessage, [data.emptyDrawMessage]);

function handleDraw(drawCount: number) {
  if (ticketBalance < drawCount) {
    setResultLabel(emptyDrawMessage);
    return;
  }

  setTicketBalance((current) => current - drawCount);
  setDrawResults(drawCount === 10 ? data.tenDrawResult : data.singleDrawResult);
  setResultLabel(drawCount === 10 ? "本次十连结果" : "本次结果");
}
```

Update child calls:

```tsx
<DrawPoolTopBar data={data} ticketBalance={ticketBalance} />
```

```tsx
<TicketWalletPanel data={data} ticketBalance={ticketBalance} />
```

```tsx
<DrawMachineStage data={data} onDraw={handleDraw} ticketBalance={ticketBalance} />
<DrawResultPanel resultLabel={resultLabel} results={drawResults} ticketBalance={ticketBalance} />
<RecentDropsPanel data={data} />
```

- [ ] **Step 8: Run the scene test**

Run:

```bash
npm test -- __tests__/supply-draw-pool-scene.test.tsx
```

Expected: PASS.

## Task 5: Update Draw Pool CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `__tests__/supply-draw-pool-scene-css.test.ts`

- [ ] **Step 1: Replace pity selectors with guarantee/result selectors**

In `app/globals.css`, replace the draw-pool selector groups that include `.supply-draw-pool-pity` with `.supply-draw-pool-guarantee` and `.supply-draw-pool-result` where panel styling is shared.

Use this concrete selector set:

```css
.supply-draw-pool-wallet,
.supply-draw-pool-guide,
.supply-draw-pool-rates,
.supply-draw-pool-guarantee,
.supply-draw-pool-rules,
.supply-draw-pool-result,
.supply-draw-pool-recent {
  position: relative;
}
```

Replace `.supply-draw-pool-pity .supply-ui-lab-panel-title` with:

```css
.supply-draw-pool-guarantee .supply-ui-lab-panel-title,
.supply-draw-pool-result .supply-ui-lab-panel-title {
  color: #1f2937;
}
```

- [ ] **Step 2: Add guarantee and result styles**

Add this CSS near the existing draw-pool right rail styles:

```css
.supply-draw-pool-guarantee,
.supply-draw-pool-rules {
  border-color: #111827;
}

.supply-draw-pool-guarantee p {
  margin: 0;
  color: #1f2937;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.55;
}

.supply-draw-pool-guarantee ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.supply-draw-pool-guarantee li {
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fde047;
  padding: 0.22rem 0.55rem;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 900;
}

.supply-draw-pool-result {
  margin-top: 1rem;
}

.supply-draw-pool-result > p {
  margin: 0 0 0.8rem;
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 900;
}

.supply-draw-pool-result .supply-draw-pool-drop-list {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.supply-draw-pool-ticket-shortage {
  margin: 0.6rem auto 0;
  width: fit-content;
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fff7ed;
  padding: 0.28rem 0.75rem;
  color: #9a3412;
  font-size: 0.8rem;
  font-weight: 900;
}

.supply-draw-pool-action:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  transform: none;
}
```

Delete the old blocks that target:

```css
.supply-draw-pool-pity
.supply-draw-pool-pity p
.supply-draw-pool-pity p strong
.supply-draw-pool-pity p span
.supply-draw-pool-pity img
.supply-draw-pool-pity .supply-ui-lab-progress
.supply-draw-pool-pity .supply-ui-lab-progress-label
.supply-draw-pool-pity .supply-ui-lab-progress [role="progressbar"]
```

- [ ] **Step 3: Run the CSS test**

Run:

```bash
npm test -- __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: PASS.

## Task 6: Focused Verification And Commit

**Files:**
- Verify only.
- Commit only task 7 files.

- [ ] **Step 1: Run all Draw Pool tests**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the shared catalog guardrail**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint only if the focused tests pass**

Run:

```bash
npm run lint
```

Expected: PASS or existing unrelated lint failures only. If unrelated failures exist, record the exact file names and do not change unrelated files.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff -- components/gamification/ui-lab/supply-draw-pool __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene-css.test.ts app/globals.css
```

Expected:

- No `补给券` in Draw Pool data or rendered scene tests.
- No `保底进度`, `48/70`, or `.supply-draw-pool-pity`.
- `pity` removed from Draw Pool types and mock.
- `guarantee`, `singleDrawResult`, and `tenDrawResult` present.
- Scene uses local `ticketBalance` state and does not call API routes.

- [ ] **Step 5: Commit Task 7**

Stage only task 7 files:

```bash
git add components/gamification/ui-lab/supply-draw-pool/types.ts components/gamification/ui-lab/supply-draw-pool/mock-data.ts components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx app/globals.css __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene-css.test.ts
```

Commit:

```bash
git commit -m "feat: close supply draw pool mock rules"
```

Expected: commit succeeds and does not include Dashboard, Backpack, Shop, Task Record, or Team Goal changes.

## Self-Review Checklist

- Spec coverage:
  - `抽奖券` replaces `补给券`.
  - Long-term pity and `48/70` are removed.
  - Right rail is `十连保底说明`.
  - Single draw explicitly has no guarantee.
  - Ten-draw batch guarantee is documented.
  - Single draw and ten draw update local ticket balance.
  - Insufficient ticket state disables or explains unavailable draw actions.
  - Pool preview and recent drops use shared catalog and coin rows.
- Vague-wording scan:
  - No forbidden filler wording or vague “add tests” steps.
- Type consistency:
  - `SupplyDrawPoolRate.tier` matches test expectations.
  - `SupplyDrawPoolGuarantee` replaces all `pity` usage.
  - `SupplyDrawPoolRewardRow` is reused for recent drops and local results.
