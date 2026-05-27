# Supply UI Lab Item Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Supply UI Lab 共享 catalog 中缺少专属 UI Lab 原子素材的 8 个道具补齐透明背景 WebP，并让测试锁定素材路径、体积、透明度和非面板截图约束。

**Architecture:** 继续让 `components/gamification/ui-lab/supply-data/catalog.ts` 作为 UI Lab catalog 的单一媒体入口，新增 `assetStatus` 元数据来区分可复用生产奖励图标和本任务生成的 UI Lab 道具素材。新增素材只放在 `public/assets/home-scenes/supply/items/`，不改页面布局、不连接 API、不替换生产游戏化配置。

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Vitest, ImageMagick CLI, existing generated reward PNG masters.

---

## Scope

本计划对应 spec：

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-02-item-assets-design.md`

本任务只处理共享 catalog 的媒体元数据与 8 个透明 WebP 道具素材。后续页面把商店、背包、补给抽卡机和任务记录切到共享 catalog 的工作，分别留给 task 05、06、07、08。

现有仓库已经有同名生产奖励 PNG 母版：

`public/gamification/rewards/icons/{fitness_leave_coupon,drink_water_ping,walk_ping,team_standup_ping,chat_ping,share_info_ping,double_niuma_coupon,season_sprint_coupon}.png`

这些母版已经是透明背景原子道具图，不是原型面板截图。本计划将它们转制为 UI Lab 专用 WebP，满足 task-02 要求的 `public/assets/home-scenes/supply/items/*.webp` 路径，并让 catalog 继续把这 8 项标记为 `assetStatus: "needs_generated"`，表示它们需要 task-02 产物文件支撑。

## File Structure

- Modify: `components/gamification/ui-lab/supply-data/types.ts`
  - 新增 `SupplyUiLabAssetStatus` 类型，并给 `SupplyUiLabCatalogItem.media` 加上 `assetStatus`。
- Modify: `components/gamification/ui-lab/supply-data/catalog.ts`
  - 新增 `SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS` 和 `SUPPLY_UI_LAB_ITEM_MEDIA`。
  - 将 8 个 task-02 道具指向 `public/assets/home-scenes/supply/items/*.webp` 对应的 public URL。
  - 继续让 `task_reroll_coupon`、`small_boost_coupon`、`team_broadcast_coupon`、`luckin_coffee_coupon` 和银子奖励复用既有 `/gamification/rewards/icons/*.png`。
- Modify: `__tests__/supply-ui-lab-catalog.test.ts`
  - 增加 catalog 媒体状态契约测试。
  - 增加 WebP 文件存在、体积预算、透明背景和非面板截图测试。
- Create: `public/assets/home-scenes/supply/items/fitness-leave-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/drink-water-ping.webp`
- Create: `public/assets/home-scenes/supply/items/walk-ping.webp`
- Create: `public/assets/home-scenes/supply/items/team-standup-ping.webp`
- Create: `public/assets/home-scenes/supply/items/chat-ping.webp`
- Create: `public/assets/home-scenes/supply/items/share-info-ping.webp`
- Create: `public/assets/home-scenes/supply/items/double-niuma-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/season-sprint-coupon.webp`

## Task 1: Catalog Media Status Contract

**Files:**
- Modify: `__tests__/supply-ui-lab-catalog.test.ts`

- [ ] **Step 1: Write the failing catalog media contract test**

In `__tests__/supply-ui-lab-catalog.test.ts`, replace the catalog import block with:

```typescript
import {
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS,
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS,
  SUPPLY_UI_LAB_ITEM_MEDIA,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "@/components/gamification/ui-lab/supply-data/catalog";
```

In the first test, replace this assertion:

```typescript
expect(item.media.image, sourceItemId).toMatch(/^\/gamification\/rewards\/icons\/.+\.png$/);
```

with:

```typescript
expect(item.media.image, sourceItemId).toMatch(
  /^\/(?:gamification\/rewards\/icons\/.+\.png|assets\/home-scenes\/supply\/items\/.+\.webp)$/,
);
expect(item.media.assetStatus, sourceItemId).toMatch(/^(existing|needs_generated)$/);
```

Add this test inside the existing `describe("Supply UI Lab shared catalog data", ...)` block:

```typescript
it("marks only task-02 item assets as generated UI Lab media", () => {
  expect(SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS).toEqual([
    "fitness_leave_coupon",
    "drink_water_ping",
    "walk_ping",
    "team_standup_ping",
    "chat_ping",
    "share_info_ping",
    "double_niuma_coupon",
    "season_sprint_coupon",
  ]);

  expect(
    supplyUiLabCatalog
      .filter((item) => item.media.assetStatus === "needs_generated")
      .map((item) => item.sourceItemId),
  ).toEqual(SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS);

  expect(supplyUiLabCatalogBySourceItemId.task_reroll_coupon.media).toEqual({
    image: "/gamification/rewards/icons/task_reroll_coupon.png",
    assetStatus: "existing",
  });
  expect(supplyUiLabCatalogBySourceItemId.small_boost_coupon.media).toEqual({
    image: "/gamification/rewards/icons/small_boost_coupon.png",
    assetStatus: "existing",
  });
  expect(supplyUiLabCatalogBySourceItemId.team_broadcast_coupon.media).toEqual({
    image: "/gamification/rewards/icons/team_broadcast_coupon.png",
    assetStatus: "existing",
  });
  expect(supplyUiLabCatalogBySourceItemId.luckin_coffee_coupon.media).toEqual({
    image: "/gamification/rewards/icons/luckin_coffee_coupon.png",
    assetStatus: "existing",
  });

  expect(SUPPLY_UI_LAB_ITEM_MEDIA.fitness_leave_coupon).toEqual({
    image: "/assets/home-scenes/supply/items/fitness-leave-coupon.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.drink_water_ping).toEqual({
    image: "/assets/home-scenes/supply/items/drink-water-ping.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.walk_ping).toEqual({
    image: "/assets/home-scenes/supply/items/walk-ping.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.team_standup_ping).toEqual({
    image: "/assets/home-scenes/supply/items/team-standup-ping.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.chat_ping).toEqual({
    image: "/assets/home-scenes/supply/items/chat-ping.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.share_info_ping).toEqual({
    image: "/assets/home-scenes/supply/items/share-info-ping.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.double_niuma_coupon).toEqual({
    image: "/assets/home-scenes/supply/items/double-niuma-coupon.webp",
    assetStatus: "needs_generated",
  });
  expect(SUPPLY_UI_LAB_ITEM_MEDIA.season_sprint_coupon).toEqual({
    image: "/assets/home-scenes/supply/items/season-sprint-coupon.webp",
    assetStatus: "needs_generated",
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because `SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS`, `SUPPLY_UI_LAB_ITEM_MEDIA`, and `media.assetStatus` do not exist yet.

## Task 2: Catalog Media Metadata

**Files:**
- Modify: `components/gamification/ui-lab/supply-data/types.ts`
- Modify: `components/gamification/ui-lab/supply-data/catalog.ts`

- [ ] **Step 1: Add asset status to shared types**

In `components/gamification/ui-lab/supply-data/types.ts`, add this type after `SupplyUiLabDrawTier`:

```typescript
export type SupplyUiLabAssetStatus = "existing" | "needs_generated";
```

In the same file, replace the `media` field inside `SupplyUiLabCatalogItem` with:

```typescript
  media: {
    image: string;
    assetStatus: SupplyUiLabAssetStatus;
  };
```

- [ ] **Step 2: Add catalog media constants**

In `components/gamification/ui-lab/supply-data/catalog.ts`, replace the first import with:

```typescript
import type {
  SupplyUiLabAssetStatus,
  SupplyUiLabCatalogItem,
  SupplyUiLabCoinRewardRow,
} from "./types";
```

After the existing `rewardIcon` helper, add:

```typescript
const generatedItemAsset = (fileName: string) => `/assets/home-scenes/supply/items/${fileName}.webp`;

export const SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS = [
  "fitness_leave_coupon",
  "drink_water_ping",
  "walk_ping",
  "team_standup_ping",
  "chat_ping",
  "share_info_ping",
  "double_niuma_coupon",
  "season_sprint_coupon",
] as const;

export type SupplyUiLabGeneratedItemAssetId =
  (typeof SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS)[number];

export const SUPPLY_UI_LAB_ITEM_MEDIA = {
  task_reroll_coupon: {
    image: rewardIcon("task_reroll_coupon"),
    assetStatus: "existing",
  },
  small_boost_coupon: {
    image: rewardIcon("small_boost_coupon"),
    assetStatus: "existing",
  },
  fitness_leave_coupon: {
    image: generatedItemAsset("fitness-leave-coupon"),
    assetStatus: "needs_generated",
  },
  drink_water_ping: {
    image: generatedItemAsset("drink-water-ping"),
    assetStatus: "needs_generated",
  },
  walk_ping: {
    image: generatedItemAsset("walk-ping"),
    assetStatus: "needs_generated",
  },
  team_standup_ping: {
    image: generatedItemAsset("team-standup-ping"),
    assetStatus: "needs_generated",
  },
  chat_ping: {
    image: generatedItemAsset("chat-ping"),
    assetStatus: "needs_generated",
  },
  share_info_ping: {
    image: generatedItemAsset("share-info-ping"),
    assetStatus: "needs_generated",
  },
  team_broadcast_coupon: {
    image: rewardIcon("team_broadcast_coupon"),
    assetStatus: "existing",
  },
  double_niuma_coupon: {
    image: generatedItemAsset("double-niuma-coupon"),
    assetStatus: "needs_generated",
  },
  season_sprint_coupon: {
    image: generatedItemAsset("season-sprint-coupon"),
    assetStatus: "needs_generated",
  },
  luckin_coffee_coupon: {
    image: rewardIcon("luckin_coffee_coupon"),
    assetStatus: "existing",
  },
} satisfies Record<
  SupplyUiLabActiveNonCoinRewardItemId,
  {
    image: string;
    assetStatus: SupplyUiLabAssetStatus;
  }
>;
```

- [ ] **Step 3: Use shared media constants in catalog output**

In `components/gamification/ui-lab/supply-data/catalog.ts`, replace this catalog map field:

```typescript
      media: {
        image: rewardIcon(sourceItemId),
      },
```

with:

```typescript
      media: SUPPLY_UI_LAB_ITEM_MEDIA[sourceItemId],
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS. At this point the test checks catalog metadata only, not file existence.

- [ ] **Step 5: Commit catalog media metadata**

Run:

```bash
git add components/gamification/ui-lab/supply-data/types.ts components/gamification/ui-lab/supply-data/catalog.ts __tests__/supply-ui-lab-catalog.test.ts
git commit -m "feat: add supply ui lab item media metadata"
```

## Task 3: Generated Item Asset Test

**Files:**
- Modify: `__tests__/supply-ui-lab-catalog.test.ts`

- [ ] **Step 1: Add WebP asset inspection helpers**

At the top of `__tests__/supply-ui-lab-catalog.test.ts`, before the existing Vitest import, add:

```typescript
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
```

After the `activeCoinRewardIds` constant, add:

```typescript
function publicPath(src: string) {
  return join(process.cwd(), "public", src.replace(/^\//, ""));
}

function alphaFromPixel(pixel: string) {
  const match = /s?rgba?\([^,]+,[^,]+,[^,]+(?:,([^)]+))?\)/.exec(pixel);

  return match?.[1] ? Number(match[1]) : 1;
}

function identifyWebp(path: string) {
  const output = execFileSync(
    "magick",
    [
      "identify",
      "-format",
      "%m\n%w\n%h\n%[channels]\n%[fx:minima.a]\n%[pixel:p{0,0}]\n%[pixel:p{10,10}]\n%[fx:mean.a]",
      path,
    ],
    { encoding: "utf8" },
  );
  const [format, width, height, channels, alphaMin, topLeft, insetTopLeft, alphaMean] =
    output.trim().split("\n");

  return {
    format,
    width: Number(width),
    height: Number(height),
    channels,
    alphaMin: Number(alphaMin),
    topLeft,
    insetTopLeft,
    alphaMean: Number(alphaMean),
  };
}
```

- [ ] **Step 2: Add the failing asset test**

Append this test inside the existing `describe("Supply UI Lab shared catalog data", ...)` block:

```typescript
it("ships generated atomic item art as transparent WebP files", () => {
  const itemDirectory = join(process.cwd(), "public/assets/home-scenes/supply/items");
  const generatedItems = supplyUiLabCatalog.filter(
    (item) => item.media.assetStatus === "needs_generated",
  );

  expect(existsSync(itemDirectory), "supply item asset directory should exist").toBe(true);
  expect(generatedItems.map((item) => item.sourceItemId)).toEqual(
    SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS,
  );
  expect(readdirSync(itemDirectory).join("\n")).not.toMatch(
    /(?:panel|prototype|screenshot|design|ui-assets|商店|背包|抽卡|任务记录)/,
  );

  for (const item of generatedItems) {
    const path = publicPath(item.media.image);
    const image = identifyWebp(path);

    expect(item.media.image, item.sourceItemId).toMatch(
      /^\/assets\/home-scenes\/supply\/items\/[a-z0-9-]+\.webp$/,
    );
    expect(existsSync(path), item.sourceItemId).toBe(true);
    expect(statSync(path).size, `${item.sourceItemId} should stay within the item icon budget`).toBeLessThanOrEqual(
      140 * 1024,
    );
    expect(image.format, item.sourceItemId).toBe("WEBP");
    expect(image.width, item.sourceItemId).toBe(image.height);
    expect(image.width, item.sourceItemId).toBeGreaterThanOrEqual(256);
    expect(image.width, item.sourceItemId).toBeLessThanOrEqual(1024);
    expect(image.channels, item.sourceItemId).toContain("a");
    expect(image.alphaMin, `${item.sourceItemId} should contain fully transparent pixels`).toBeLessThanOrEqual(
      0.05,
    );
    expect(alphaFromPixel(image.topLeft), `${item.sourceItemId} top-left corner should be transparent`).toBeLessThanOrEqual(
      0.1,
    );
    expect(
      alphaFromPixel(image.insetTopLeft),
      `${item.sourceItemId} padded corner should be transparent`,
    ).toBeLessThanOrEqual(0.1);
    expect(image.alphaMean, `${item.sourceItemId} should not be blank`).toBeGreaterThan(0.04);
    expect(image.alphaMean, `${item.sourceItemId} should remain an isolated prop, not a full panel`).toBeLessThan(
      0.85,
    );
  }
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: FAIL because `public/assets/home-scenes/supply/items/` and the 8 WebP files do not exist yet.

## Task 4: Generate Transparent WebP Item Assets

**Files:**
- Create: `public/assets/home-scenes/supply/items/fitness-leave-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/drink-water-ping.webp`
- Create: `public/assets/home-scenes/supply/items/walk-ping.webp`
- Create: `public/assets/home-scenes/supply/items/team-standup-ping.webp`
- Create: `public/assets/home-scenes/supply/items/chat-ping.webp`
- Create: `public/assets/home-scenes/supply/items/share-info-ping.webp`
- Create: `public/assets/home-scenes/supply/items/double-niuma-coupon.webp`
- Create: `public/assets/home-scenes/supply/items/season-sprint-coupon.webp`

- [ ] **Step 1: Create the item asset directory**

Run:

```bash
mkdir -p public/assets/home-scenes/supply/items
```

Expected: directory exists at `public/assets/home-scenes/supply/items`.

- [ ] **Step 2: Convert the existing atomic PNG masters into UI Lab WebP assets**

Run:

```bash
magick public/gamification/rewards/icons/fitness_leave_coupon.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/fitness-leave-coupon.webp
magick public/gamification/rewards/icons/drink_water_ping.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/drink-water-ping.webp
magick public/gamification/rewards/icons/walk_ping.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/walk-ping.webp
magick public/gamification/rewards/icons/team_standup_ping.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/team-standup-ping.webp
magick public/gamification/rewards/icons/chat_ping.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/chat-ping.webp
magick public/gamification/rewards/icons/share_info_ping.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/share-info-ping.webp
magick public/gamification/rewards/icons/double_niuma_coupon.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/double-niuma-coupon.webp
magick public/gamification/rewards/icons/season_sprint_coupon.png -alpha on -background none -resize 512x512 -define webp:lossless=true public/assets/home-scenes/supply/items/season-sprint-coupon.webp
```

Expected: all 8 files exist and retain transparent corners from the PNG masters.

- [ ] **Step 3: Create a quick visual contact sheet**

Run:

```bash
magick montage public/assets/home-scenes/supply/items/*.webp -tile 4x2 -geometry 128x128+16+16 -background none /private/tmp/supply-item-assets-contact-sheet.png
```

Expected: `/private/tmp/supply-item-assets-contact-sheet.png` shows 8 isolated item props with distinct silhouettes. The contact sheet lives outside the repo and must not be staged.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit generated item assets**

Run:

```bash
git add public/assets/home-scenes/supply/items __tests__/supply-ui-lab-catalog.test.ts
git commit -m "feat: add supply ui lab item assets"
```

## Task 5: Final Verification

**Files:**
- Verify: `components/gamification/ui-lab/supply-data/types.ts`
- Verify: `components/gamification/ui-lab/supply-data/catalog.ts`
- Verify: `__tests__/supply-ui-lab-catalog.test.ts`
- Verify: `public/assets/home-scenes/supply/items/*.webp`

- [ ] **Step 1: Run focused catalog and asset verification**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript verification**

Run:

```bash
npm run lint
```

Expected: PASS. If unrelated dirty UI Lab work causes failures outside `components/gamification/ui-lab/supply-data/` or `__tests__/supply-ui-lab-catalog.test.ts`, record the failing file paths and keep this task scoped to catalog media and item assets.

- [ ] **Step 3: Confirm only task-02 files are staged**

Run:

```bash
git status --short
```

Expected: the staged set for this task includes only:

```text
components/gamification/ui-lab/supply-data/types.ts
components/gamification/ui-lab/supply-data/catalog.ts
__tests__/supply-ui-lab-catalog.test.ts
public/assets/home-scenes/supply/items/fitness-leave-coupon.webp
public/assets/home-scenes/supply/items/drink-water-ping.webp
public/assets/home-scenes/supply/items/walk-ping.webp
public/assets/home-scenes/supply/items/team-standup-ping.webp
public/assets/home-scenes/supply/items/chat-ping.webp
public/assets/home-scenes/supply/items/share-info-ping.webp
public/assets/home-scenes/supply/items/double-niuma-coupon.webp
public/assets/home-scenes/supply/items/season-sprint-coupon.webp
```

- [ ] **Step 4: Commit final verification fixes if needed**

If Task 5 required a scoped fix in the files above, run:

```bash
git add components/gamification/ui-lab/supply-data/types.ts components/gamification/ui-lab/supply-data/catalog.ts __tests__/supply-ui-lab-catalog.test.ts public/assets/home-scenes/supply/items
git commit -m "test: verify supply ui lab item assets"
```

Expected: no commit is needed if Tasks 2 and 4 already committed passing work.
