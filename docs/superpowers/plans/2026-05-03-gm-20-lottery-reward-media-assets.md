# GM-20 Lottery Reward Media Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first transparent pixel-art lottery reward icon, define the reward asset manifest, and render reward/backpack items through a reusable component-drawn tile.

**Architecture:** Generated media stays as transparent PNG icon assets under `public/gamification/rewards/icons/`; runtime UI draws the tile frame, rarity badge, quantity, and label in React. `content/gamification/reward-assets.ts` becomes the media manifest and helper layer, with tests enforcing GM-16 active reward coverage and PNG alpha shape for completed assets.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, jsdom, imagegen skill, local PNG binary validation.

---

## Source Spec

- `docs/superpowers/specs/2026-05-03-gm-20-lottery-reward-media-assets-design.md`

## File Structure

- Create `public/gamification/rewards/icons/task_reroll_coupon.png`
  - Final transparent PNG icon generated from imagegen and chroma-key removal.
- Create `content/gamification/reward-assets.ts`
  - Reward media manifest and helper functions.
- Create `__tests__/gamification-reward-assets.test.ts`
  - Manifest coverage and PNG alpha validation.
- Create `components/gamification/RewardTile.tsx`
  - Shared 1:1 reward tile component.
- Create `__tests__/reward-tile.test.tsx`
  - Component behavior tests for border class, rarity badge, image/fallback, quantity, and size variants.
- Modify `components/gamification/SupplyStation.tsx`
  - Use `RewardTile` for latest draw rewards and backpack inventory entries.
- Modify `__tests__/supply-station-shell.test.tsx`
  - Assert draw results and backpack items render as reward tiles.

No Prisma schema, API route, lottery service, item-use service, or reward-pool tuning change is required.

---

### Task 1: Generate the First Transparent Icon Asset

**Files:**
- Create: `public/gamification/rewards/icons/task_reroll_coupon.png`

- [ ] **Step 1: Generate the chroma-key source image with imagegen**

Use the built-in `image_gen` tool with this prompt:

```text
Use case: background-extraction
Asset type: transparent pixel-art inventory icon for 脱脂牛马 / 牛马补给站
Primary request: Create a square pixel-art icon for 任务换班券. The object is a blue utility coupon ticket with a reroll arrow and tiny checklist marks, designed for a web game backpack item grid.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one standalone coupon ticket icon only.
Style/medium: crisp pixel-art UI asset, black pixel outline, simple highlights, readable at small inventory size.
Composition/framing: icon centered, 1:1 canvas, subject uses 60-70% of the canvas, generous padding.
Color palette: blue utility accent, off-white ticket paper, black outline, small yellow highlight. Do not use #00ff00 anywhere in the subject.
Text: no text.
Constraints: no card frame, no rarity label, no quantity, no item name, no shadow, no watermark.
Avoid: gradients, realistic paper texture, cinematic lighting, background objects, green inside the icon.
```

Expected: imagegen creates a square source PNG under `/Users/vincent/.codex/generated_images/019de83d-dacf-73e3-af09-44cf6a33be05/`.

- [ ] **Step 2: Create the asset directory**

Run:

```bash
mkdir -p public/gamification/rewards/icons tmp/imagegen/gm20
```

Expected: both directories exist.

- [ ] **Step 3: Copy the selected imagegen source into workspace temp**

Run this after visually choosing the best generated source image:

```bash
latest_source="$(ls -t /Users/vincent/.codex/generated_images/019de83d-dacf-73e3-af09-44cf6a33be05/*.png | head -n 1)"
cp "$latest_source" tmp/imagegen/gm20/task_reroll_coupon-source.png
```

Expected: `tmp/imagegen/gm20/task_reroll_coupon-source.png` exists.

- [ ] **Step 4: Remove the chroma-key background**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input tmp/imagegen/gm20/task_reroll_coupon-source.png \
  --out public/gamification/rewards/icons/task_reroll_coupon.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Expected: `public/gamification/rewards/icons/task_reroll_coupon.png` is written.

- [ ] **Step 5: Inspect the transparent PNG**

Run:

```bash
file public/gamification/rewards/icons/task_reroll_coupon.png
```

Expected: output includes `PNG image data`; the dimensions are square and at least `256 x 256`.

- [ ] **Step 6: Commit the first icon asset**

```bash
git add public/gamification/rewards/icons/task_reroll_coupon.png
git commit -m "feat: add task reroll reward icon"
```

---

### Task 2: Add Reward Asset Manifest Tests

**Files:**
- Create: `__tests__/gamification-reward-assets.test.ts`
- Create in Task 3: `content/gamification/reward-assets.ts`
- Existing references: `content/gamification/reward-pool.ts`, `content/gamification/item-definitions.ts`

- [ ] **Step 1: Add the failing manifest and PNG validation tests**

Create `__tests__/gamification-reward-assets.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRewardDefinitions } from "@/lib/gamification/content";
import {
  getRewardAsset,
  getRewardAssetId,
  REWARD_ASSETS,
  REWARD_ASSET_PROMPT_VERSION,
} from "@/content/gamification/reward-assets";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_COLOR_TYPES_WITH_ALPHA = new Set([4, 6]);

function getActiveRewards() {
  return getRewardDefinitions().filter((reward) => reward.enabled && reward.weight > 0);
}

function readPngMetadata(filePath: string) {
  const buffer = readFileSync(filePath);

  expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);

  return { width, height, bitDepth, colorType };
}

describe("gamification reward assets", () => {
  it("maps every GM-16 active reward to an asset entry", () => {
    const activeRewards = getActiveRewards();

    expect(activeRewards).toHaveLength(18);
    expect(new Set(REWARD_ASSETS.map((asset) => asset.assetId)).size).toBe(REWARD_ASSETS.length);

    for (const reward of activeRewards) {
      const asset = getRewardAsset(reward);

      expect(asset, reward.id).toBeDefined();
      expect(asset?.assetId, reward.id).toBe(getRewardAssetId(reward));
      expect(asset?.src.endsWith(".png"), reward.id).toBe(true);
      expect(asset?.promptVersion, reward.id).toBe(REWARD_ASSET_PROMPT_VERSION);
    }
  });

  it("ships the first transparent task reroll icon as a square PNG with alpha", () => {
    const asset = REWARD_ASSETS.find((entry) => entry.assetId === "task_reroll_coupon");

    expect(asset).toBeDefined();

    const filePath = join(process.cwd(), "public", asset!.src.replace(/^\//, ""));

    expect(existsSync(filePath)).toBe(true);

    const metadata = readPngMetadata(filePath);

    expect(metadata.width).toBe(metadata.height);
    expect(metadata.width).toBeGreaterThanOrEqual(256);
    expect(metadata.bitDepth).toBe(8);
    expect(PNG_COLOR_TYPES_WITH_ALPHA.has(metadata.colorType)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the asset tests and verify the intended failure**

Run:

```bash
npm test -- __tests__/gamification-reward-assets.test.ts
```

Expected: FAIL because `content/gamification/reward-assets.ts` does not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add __tests__/gamification-reward-assets.test.ts
git commit -m "test: cover gm20 reward asset manifest"
```

---

### Task 3: Implement Reward Asset Manifest

**Files:**
- Create: `content/gamification/reward-assets.ts`
- Test: `__tests__/gamification-reward-assets.test.ts`

- [ ] **Step 1: Create the manifest and helper functions**

Create `content/gamification/reward-assets.ts`:

```ts
import type { RewardDefinition } from "./types";

export const REWARD_ASSET_PROMPT_VERSION = "gm20-v1";

export interface RewardAssetDefinition {
  assetId: string;
  src: string;
  alt: string;
  promptVersion: typeof REWARD_ASSET_PROMPT_VERSION;
  status: "generated" | "planned";
}

function defineAsset(assetId: string, alt: string, status: RewardAssetDefinition["status"]): RewardAssetDefinition {
  return {
    assetId,
    src: `/gamification/rewards/icons/${assetId}.png`,
    alt,
    promptVersion: REWARD_ASSET_PROMPT_VERSION,
    status,
  };
}

export const REWARD_ASSETS: RewardAssetDefinition[] = [
  defineAsset("coins_005", "摸鱼津贴", "planned"),
  defineAsset("coins_010", "工位补贴", "planned"),
  defineAsset("coins_020", "今日没白来", "planned"),
  defineAsset("coins_040", "老板没发现", "planned"),
  defineAsset("coins_080", "小发一笔", "planned"),
  defineAsset("coins_120", "牛马暴富", "planned"),
  defineAsset("task_reroll_coupon", "任务换班券", "generated"),
  defineAsset("small_boost_coupon", "小暴击券", "planned"),
  defineAsset("fitness_leave_coupon", "健身请假券", "planned"),
  defineAsset("drink_water_ping", "点名喝水令", "planned"),
  defineAsset("walk_ping", "出门溜达令", "planned"),
  defineAsset("team_standup_ping", "全员起立令", "planned"),
  defineAsset("chat_ping", "今日闲聊令", "planned"),
  defineAsset("share_info_ping", "红盘情报令", "planned"),
  defineAsset("team_broadcast_coupon", "团队小喇叭", "planned"),
  defineAsset("double_niuma_coupon", "双倍牛马券", "planned"),
  defineAsset("season_sprint_coupon", "赛季冲刺券", "planned"),
  defineAsset("luckin_coffee_coupon", "瑞幸咖啡券", "planned"),
];

const rewardAssetById = new Map(REWARD_ASSETS.map((asset) => [asset.assetId, asset]));

export function getRewardAssetId(reward: RewardDefinition) {
  if (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") {
    return reward.effect.itemId;
  }

  return reward.id;
}

export function getRewardAsset(reward: RewardDefinition) {
  return rewardAssetById.get(getRewardAssetId(reward)) ?? null;
}
```

- [ ] **Step 2: Run the asset tests**

Run:

```bash
npm test -- __tests__/gamification-reward-assets.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the manifest implementation**

```bash
git add content/gamification/reward-assets.ts __tests__/gamification-reward-assets.test.ts
git commit -m "feat: add reward asset manifest"
```

---

### Task 4: Add RewardTile Component Tests

**Files:**
- Create: `__tests__/reward-tile.test.tsx`
- Create in Task 5: `components/gamification/RewardTile.tsx`

- [ ] **Step 1: Add the failing component tests**

Create `__tests__/reward-tile.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RewardTile } from "@/components/gamification/RewardTile";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("RewardTile", () => {
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

  it("renders a utility tile with generated icon, rarity badge, quantity, and label", () => {
    act(() => {
      root.render(
        <RewardTile
          name="任务换班券"
          rewardTier="utility"
          rarity="uncommon"
          iconSrc="/gamification/rewards/icons/task_reroll_coupon.png"
          iconAlt="任务换班券"
          quantity={1}
          selected
        />,
      );
    });

    const tile = container.querySelector("[data-reward-tile='utility']");
    const image = container.querySelector("img");

    expect(tile).not.toBeNull();
    expect(tile?.className).toContain("reward-tile-tier-utility");
    expect(tile?.className).toContain("reward-tile-selected");
    expect(container.textContent).toContain("R");
    expect(container.textContent).toContain("x1");
    expect(container.textContent).toContain("任务换班券");
    expect(image?.getAttribute("src")).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(image?.getAttribute("alt")).toBe("任务换班券");
  });

  it("renders a fallback mark when the icon asset is missing", () => {
    act(() => {
      root.render(<RewardTile name="未知奖励" rewardTier="rare" rarity="epic" quantity={3} />);
    });

    const tile = container.querySelector("[data-reward-tile='rare']");

    expect(tile).not.toBeNull();
    expect(tile?.className).toContain("reward-tile-tier-rare");
    expect(container.textContent).toContain("SSR");
    expect(container.textContent).toContain("?");
    expect(container.textContent).toContain("x3");
    expect(container.querySelector("img")).toBeNull();
  });

  it("supports draw-result and detail size variants", () => {
    act(() => {
      root.render(
        <div>
          <RewardTile name="抽奖展示" rewardTier="coin" rarity="common" size="draw-result" />
          <RewardTile name="详情展示" rewardTier="social" rarity="rare" size="detail" />
        </div>,
      );
    });

    expect(container.querySelector(".reward-tile-size-draw-result")).not.toBeNull();
    expect(container.querySelector(".reward-tile-size-detail")).not.toBeNull();
    expect(container.textContent).toContain("N");
    expect(container.textContent).toContain("SR");
  });
});
```

- [ ] **Step 2: Run the component tests and verify the intended failure**

Run:

```bash
npm test -- __tests__/reward-tile.test.tsx
```

Expected: FAIL because `components/gamification/RewardTile.tsx` does not exist yet.

- [ ] **Step 3: Commit the failing component tests**

```bash
git add __tests__/reward-tile.test.tsx
git commit -m "test: cover reward tile component"
```

---

### Task 5: Implement RewardTile Component

**Files:**
- Create: `components/gamification/RewardTile.tsx`
- Test: `__tests__/reward-tile.test.tsx`

- [ ] **Step 1: Create the component**

Create `components/gamification/RewardTile.tsx`:

```tsx
import type { RewardRarity, RewardTier } from "@/content/gamification/types";

type RewardTileSize = "inventory" | "draw-result" | "detail";

const rarityBadgeByRarity: Record<RewardRarity, string> = {
  common: "N",
  uncommon: "R",
  rare: "SR",
  epic: "SSR",
};

const tierClassByTier: Record<RewardTier, string> = {
  coin: "reward-tile-tier-coin",
  utility: "reward-tile-tier-utility",
  social: "reward-tile-tier-social",
  cosmetic: "reward-tile-tier-cosmetic",
  rare: "reward-tile-tier-rare",
};

const sizeClassBySize: Record<RewardTileSize, string> = {
  inventory: "reward-tile-size-inventory",
  "draw-result": "reward-tile-size-draw-result",
  detail: "reward-tile-size-detail",
};

export interface RewardTileProps {
  name: string;
  rewardTier: RewardTier;
  rarity: RewardRarity;
  iconSrc?: string | null;
  iconAlt?: string | null;
  quantity?: number;
  selected?: boolean;
  disabled?: boolean;
  size?: RewardTileSize;
  className?: string;
}

export function RewardTile({
  name,
  rewardTier,
  rarity,
  iconSrc,
  iconAlt,
  quantity,
  selected = false,
  disabled = false,
  size = "inventory",
  className = "",
}: RewardTileProps) {
  const badge = rarityBadgeByRarity[rarity];

  return (
    <div
      data-reward-tile={rewardTier}
      className={[
        "reward-tile",
        tierClassByTier[rewardTier],
        sizeClassBySize[size],
        selected ? "reward-tile-selected" : "",
        disabled ? "reward-tile-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="reward-tile-rarity">{badge}</span>
      <div className="reward-tile-icon-wrap" aria-hidden={iconSrc ? undefined : true}>
        {iconSrc ? (
          <img className="reward-tile-icon" src={iconSrc} alt={iconAlt ?? name} />
        ) : (
          <span className="reward-tile-fallback">?</span>
        )}
      </div>
      {quantity !== undefined ? <span className="reward-tile-quantity">x{quantity}</span> : null}
      <span className="reward-tile-name">{name}</span>
    </div>
  );
}
```

- [ ] **Step 2: Run the component tests**

Run:

```bash
npm test -- __tests__/reward-tile.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit the component implementation**

```bash
git add components/gamification/RewardTile.tsx __tests__/reward-tile.test.tsx
git commit -m "feat: add reusable reward tile"
```

---

### Task 6: Add RewardTile Styling

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/reward-tile.test.tsx`

- [ ] **Step 1: Add global reward tile styles**

Append this block near the other gamification styles in `app/globals.css`:

```css
.reward-tile {
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: center;
  justify-items: center;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 2px solid #111827;
  background: #fffdf4;
  box-shadow: 0 3px 0 0 #111827;
  color: #111827;
  font-weight: 900;
  image-rendering: pixelated;
}

.reward-tile::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 2px solid var(--reward-tile-border, #e5e7eb);
  pointer-events: none;
}

.reward-tile-tier-coin {
  --reward-tile-border: #f8fafc;
  background: linear-gradient(180deg, #fffef8 0%, #f8fafc 100%);
}

.reward-tile-tier-utility {
  --reward-tile-border: #3b82f6;
  background: linear-gradient(180deg, #f8fbff 0%, #eaf4ff 100%);
}

.reward-tile-tier-social {
  --reward-tile-border: #a855f7;
  background: linear-gradient(180deg, #fffaff 0%, #f4e8ff 100%);
}

.reward-tile-tier-rare {
  --reward-tile-border: #d99a00;
  background: linear-gradient(180deg, #fffaf0 0%, #fff0bf 100%);
}

.reward-tile-tier-cosmetic {
  --reward-tile-border: #94a3b8;
}

.reward-tile-selected {
  outline: 3px solid #facc15;
  outline-offset: 2px;
}

.reward-tile-disabled {
  filter: grayscale(1);
  opacity: 0.65;
}

.reward-tile-size-inventory {
  width: 5.75rem;
}

.reward-tile-size-draw-result {
  width: 6.75rem;
}

.reward-tile-size-detail {
  width: 8rem;
}

.reward-tile-rarity {
  position: absolute;
  left: 0.45rem;
  top: 0.3rem;
  z-index: 2;
  color: var(--reward-tile-border, #111827);
  font-size: 0.78rem;
  line-height: 1;
  text-shadow: 1px 1px 0 #ffffff;
}

.reward-tile-icon-wrap {
  display: grid;
  min-height: 0;
  width: 70%;
  place-items: center;
  align-self: end;
  padding-top: 1.1rem;
}

.reward-tile-icon {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.reward-tile-fallback {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 2px solid #111827;
  background: #f1f5f9;
  font-size: 1.25rem;
}

.reward-tile-quantity {
  position: absolute;
  right: 0.45rem;
  bottom: 1.55rem;
  z-index: 2;
  font-size: 0.75rem;
  line-height: 1;
  text-shadow: 1px 1px 0 #ffffff;
}

.reward-tile-name {
  z-index: 1;
  width: 100%;
  border-top: 1px solid color-mix(in srgb, var(--reward-tile-border, #111827) 45%, transparent);
  background: color-mix(in srgb, var(--reward-tile-border, #e5e7eb) 14%, #ffffff);
  padding: 0.25rem 0.2rem 0.28rem;
  font-size: 0.72rem;
  line-height: 1.05;
  text-align: center;
  white-space: nowrap;
}
```

- [ ] **Step 2: Run the component tests**

Run:

```bash
npm test -- __tests__/reward-tile.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit the styles**

```bash
git add app/globals.css
git commit -m "style: add reward tile visuals"
```

---

### Task 7: Add SupplyStation RewardTile Tests

**Files:**
- Modify: `__tests__/supply-station-shell.test.tsx`
- Modify in Task 8: `components/gamification/SupplyStation.tsx`

- [ ] **Step 1: Update the lottery result test expectations**

In `__tests__/supply-station-shell.test.tsx`, inside `it("runs a lottery draw and renders the result", ...)`, after:

```ts
expect(container.textContent).toContain("Fish Touch Subsidy");
expect(container.textContent).toContain("+5 coins");
```

add:

```ts
expect(container.querySelector("[data-reward-tile='coin']")).not.toBeNull();
expect(container.textContent).toContain("N");
```

- [ ] **Step 2: Update the backpack inventory test expectations**

In `it("renders grouped backpack inventory and today's effects", ...)`, after:

```ts
expect(container.textContent).toContain("Luckin Coffee Coupon");
```

add:

```ts
expect(container.querySelector("[data-reward-tile='utility']")).not.toBeNull();
expect(container.querySelector("[data-reward-tile='rare']")).not.toBeNull();
expect(container.querySelector("img[src='/gamification/rewards/icons/task_reroll_coupon.png']")).not.toBeNull();
```

If the current `buildBackpackFixture()` does not include `task_reroll_coupon`, add this item to its first group:

```ts
{
  itemId: "task_reroll_coupon",
  category: "task",
  categoryLabel: "Task",
  name: "Task Reroll Coupon",
  description: "Reroll one task.",
  quantity: 1,
  reservedQuantity: 0,
  availableQuantity: 1,
  useEnabled: true,
  useDisabledReason: null,
  useTiming: "instant",
  useTimingLabel: "Instant",
  effectSummary: "Reroll a task.",
  usageLimitSummary: "Once per day.",
  stackable: true,
  requiresAdminConfirmation: false,
  enabled: true,
  knownDefinition: true,
}
```

- [ ] **Step 3: Run the supply station tests and verify the intended failure**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: FAIL because `SupplyStation` still renders plain text list items.

- [ ] **Step 4: Commit the failing SupplyStation tests**

```bash
git add __tests__/supply-station-shell.test.tsx
git commit -m "test: expect reward tiles in supply station"
```

---

### Task 8: Wire RewardTile into SupplyStation

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Test: `__tests__/supply-station-shell.test.tsx`, `__tests__/reward-tile.test.tsx`

- [ ] **Step 1: Add imports**

At the top of `components/gamification/SupplyStation.tsx`, add:

```ts
import { getRewardAsset } from "@/content/gamification/reward-assets";
import { getRewardDefinitions } from "@/lib/gamification/content";
import { RewardTile } from "./RewardTile";
import type { RewardDefinition, RewardRarity, RewardTier } from "@/content/gamification/types";
```

- [ ] **Step 2: Add local reward lookup helpers**

After `getSupplyErrorMessage`, add:

```ts
const rewardById = new Map(getRewardDefinitions().map((reward) => [reward.id, reward]));

const fallbackRarityByTier: Record<string, RewardRarity> = {
  coin: "common",
  utility: "uncommon",
  social: "common",
  cosmetic: "common",
  rare: "epic",
};

function normalizeRewardTier(tier: string): RewardTier {
  return tier === "coin" || tier === "utility" || tier === "social" || tier === "cosmetic" || tier === "rare"
    ? tier
    : "coin";
}

function getDrawRewardDefinition(rewardId: string): RewardDefinition | null {
  return rewardById.get(rewardId) ?? null;
}

function getBackpackRewardDefinition(itemId: string): RewardDefinition | null {
  return (
    getRewardDefinitions().find(
      (reward) =>
        (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") &&
        reward.effect.itemId === itemId,
    ) ?? null
  );
}
```

- [ ] **Step 3: Render draw rewards with RewardTile**

Replace the `latestDraw.rewards.map` body:

```tsx
{latestDraw.rewards.map((reward, index) => (
  <div key={`${latestDraw.id}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700">
    {index + 1}. {reward.name} / {reward.effectSummary}
  </div>
))}
```

with:

```tsx
{latestDraw.rewards.map((reward, index) => {
  const definition = getDrawRewardDefinition(reward.rewardId);
  const asset = definition ? getRewardAsset(definition) : null;
  const tier = normalizeRewardTier(reward.rewardTier);

  return (
    <div
      key={`${latestDraw.id}-${index}`}
      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700"
    >
      <RewardTile
        name={reward.name}
        rewardTier={tier}
        rarity={definition?.rarity ?? fallbackRarityByTier[tier]}
        iconSrc={asset?.status === "generated" ? asset.src : null}
        iconAlt={asset?.alt ?? reward.name}
        size="draw-result"
      />
      <div>
        <div>
          {index + 1}. {reward.name}
        </div>
        <div className="mt-1 text-slate-500">{reward.effectSummary}</div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 4: Render backpack inventory with RewardTile**

Inside `group.items.map`, replace the button body:

```tsx
<span>{item.name}</span>
<span>x{item.quantity}</span>
```

with:

```tsx
{(() => {
  const definition = getBackpackRewardDefinition(item.itemId);
  const asset = definition ? getRewardAsset(definition) : null;
  const tier = definition?.tier ?? "utility";

  return (
    <>
      <RewardTile
        name={item.name}
        rewardTier={tier}
        rarity={definition?.rarity ?? fallbackRarityByTier[tier]}
        iconSrc={asset?.status === "generated" ? asset.src : null}
        iconAlt={asset?.alt ?? item.name}
        quantity={item.quantity}
        selected={isSelected}
      />
      <span className="min-w-0 flex-1">{item.name}</span>
      <span>x{item.quantity}</span>
    </>
  );
})()}
```

Then change the button class from:

```tsx
className={`flex items-center justify-between rounded-[0.85rem] border-2 px-3 py-2 text-left text-sm font-black transition ${
```

to:

```tsx
className={`flex items-center justify-between gap-3 rounded-[0.85rem] border-2 px-3 py-2 text-left text-sm font-black transition ${
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
npm test -- __tests__/reward-tile.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the SupplyStation integration**

```bash
git add components/gamification/SupplyStation.tsx __tests__/supply-station-shell.test.tsx
git commit -m "feat: render reward tiles in supply station"
```

---

### Task 9: Run GM-20 Regression Checks

**Files:**
- Verify only; no expected file edits.

- [ ] **Step 1: Run focused GM-20 tests**

Run:

```bash
npm test -- __tests__/gamification-reward-assets.test.ts __tests__/reward-tile.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run content and lottery regression tests**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts __tests__/gamification-lottery.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run type checking**

Run:

```bash
npm run lint
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing changes may remain, such as `design/game-card-design.md` and task-card docs. GM-20 files should be committed.

---

## Self-Review Notes

- Spec coverage: this plan covers the transparent `task_reroll_coupon` sample asset, manifest coverage for all `18` active GM-16 rewards, component-rendered tile frame, SupplyStation draw/backpack integration, and PNG alpha validation.
- Scope control: this plan does not batch-generate the remaining `17` icons. It records them in the manifest as `planned` and keeps UI fallback behavior explicit.
- Known workspace state: before this plan was written, `design/game-card-design.md`, `docs/superpowers/plans/2026-05-03-task-card-png-assets.md`, and `docs/superpowers/specs/2026-05-03-task-card-png-assets-design.md` were already uncommitted or untracked. Do not stage or modify them for GM-20.
