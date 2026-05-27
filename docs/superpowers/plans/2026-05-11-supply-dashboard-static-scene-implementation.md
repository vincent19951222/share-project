# Supply Dashboard Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard` static Dashboard scene that visually prototypes the new 牛马补给站 home page without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by local mock data and semantic static components. Keep media assets under `public/assets/home-scenes/supply/dashboard/`, reuse existing task-card raw images, and put scene-level CSS in `app/globals.css` behind `supply-dashboard-*` class names. Add lightweight Vitest contracts for route isolation, mock data shape, required assets, scene structure, CSS layering, and responsive safeguards.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, built-in `imagegen` for missing raster assets, ImageMagick `magick` and/or `cwebp` for local image processing.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Target prototype: `design/ui-assets/dashboard-new.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*` or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not generate new task-card images. Use existing files under `public/assets/task-cards/raw/`.
- Do not add external UI dependencies.

## File Structure

- Create: `app/ui-lab/supply-dashboard/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-dashboard/types.ts`
  - Static Dashboard data types.
- Create: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
  - Centralized static mock data and asset path references.
- Create: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Scene shell and semantic subcomponents.
- Create: `__tests__/supply-dashboard-ui-lab-route.test.ts`
  - Route isolation contract: no production tab files are modified and route file exists.
- Create: `__tests__/supply-dashboard-mock-data.test.ts`
  - Mock data coverage and task-card reuse contract.
- Create: `__tests__/supply-dashboard-assets.test.ts`
  - Required final media asset existence and size budgets.
- Create: `__tests__/supply-dashboard-scene.test.tsx`
  - Static scene DOM structure and image path contract.
- Create: `__tests__/supply-dashboard-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Create: `public/assets/home-scenes/supply/dashboard/`
  - Final compressed Dashboard media assets.
- Modify: `app/globals.css`
  - Add `supply-dashboard-*` scene styles only.

## Task 1: Lock Route Isolation And Mock Data Contracts

**Files:**
- Create: `__tests__/supply-dashboard-ui-lab-route.test.ts`
- Create: `__tests__/supply-dashboard-mock-data.test.ts`
- Create: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Create: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`

- [ ] **Step 1: Write the failing route isolation test**

Create `__tests__/supply-dashboard-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply dashboard ui lab route isolation", () => {
  it("uses a standalone ui-lab route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");

    expect(boardPage).not.toContain("SupplyDashboardScene");
    expect(navbar).not.toContain("ui-lab");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/page.tsx` does not exist yet.

- [ ] **Step 3: Add Dashboard data types**

Create `components/gamification/ui-lab/supply-dashboard/types.ts`:

```ts
export type SupplyDashboardResource = {
  id: "coins" | "energy" | "ticket";
  label: string;
  value: number;
  maxValue?: number;
  icon: string;
};

export type SupplyDashboardEffect = {
  id: string;
  icon: string;
  label: string;
  value: string;
  expiresIn: string;
};

export type SupplyDashboardQuest = {
  id: string;
  dimension: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
  image: string;
  difficulty: "轻" | "中";
  tags: string[];
  durationLabel: string;
  completed: boolean;
  reward: {
    icon: string;
    label: string;
    amount: number;
  };
};

export type SupplyDashboardInventoryItem = {
  id: string;
  name: string;
  icon: string;
  quantity: number;
};

export type SupplyDashboardPreview = {
  profile: {
    username: string;
    avatar: string;
    title: string;
    level: number;
    exp: number;
    nextLevelExp: number;
    streakDays: number;
  };
  motto: string;
  resources: SupplyDashboardResource[];
  activeEffects: SupplyDashboardEffect[];
  dailyQuests: SupplyDashboardQuest[];
  inventoryPreview: {
    usedSlots: number;
    totalSlots: number;
    items: SupplyDashboardInventoryItem[];
  };
  supplyPreview: {
    remainingDraws: number;
    maxDraws: number;
    featuredRewards: SupplyDashboardInventoryItem[];
  };
  announcement: {
    message: string;
  };
};
```

- [ ] **Step 4: Add centralized mock data that reuses existing task-card raw images**

Create `components/gamification/ui-lab/supply-dashboard/mock-data.ts`:

```ts
import type { SupplyDashboardPreview } from "./types";

export const supplyDashboardAssetPaths = {
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  hero: "/assets/home-scenes/supply/dashboard/niuma-hero.webp",
  dockBackpack: "/assets/home-scenes/supply/dashboard/dock-backpack.webp",
  dockSupplyMachine: "/assets/home-scenes/supply/dashboard/dock-supply-machine.webp",
  dockTaskRecord: "/assets/home-scenes/supply/dashboard/dock-task-record.webp",
  fallbackLogo: "/logo.png",
  taskCards: {
    hydration: "/assets/task-cards/raw/hydration_003%C2%A0%E6%9D%AF%E5%AD%90%E8%A7%81%E5%BA%95.png",
    movement: "/assets/task-cards/raw/movement_004%C2%A0%E7%AA%97%E8%BE%B9%E5%9B%9E%E8%A1%80.png",
    social: "/assets/task-cards/raw/social_001%C2%A0%E5%BA%9F%E8%AF%9D%20KPI.png",
    learning: "/assets/task-cards/raw/learning_005%C2%A0%E4%B8%80%E5%8F%A5%E8%AF%9D%E7%AC%94%E8%AE%B0.png",
  },
  rewardIcons: {
    coin: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
  },
} as const;

export const supplyDashboardMock: SupplyDashboardPreview = {
  profile: {
    username: "Vincent",
    avatar: "/avatars/male1.png",
    title: "自律牛马",
    level: 28,
    exp: 720,
    nextLevelExp: 1000,
    streakDays: 18,
  },
  motto: "不是在健身，就是在去健身的路上！",
  resources: [
    { id: "coins", label: "银子", value: 2450, icon: "🪙" },
    { id: "energy", label: "体力", value: 18, maxValue: 100, icon: "⚡" },
    { id: "ticket", label: "补给券", value: 18, icon: "🎟" },
  ],
  activeEffects: [
    { id: "exp", icon: "EXP", label: "经验获取", value: "+20%", expiresIn: "02:35:18" },
    { id: "hp", icon: "❤", label: "体力上限", value: "+10", expiresIn: "02:35:18" },
    { id: "steps", icon: "👟", label: "步数加成", value: "+15%", expiresIn: "02:35:18" },
  ],
  dailyQuests: [
    {
      id: "hydration",
      dimension: "hydration",
      title: "窗边回血",
      subtitle: "把电充绿",
      image: supplyDashboardAssetPaths.taskCards.hydration,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "4天",
      completed: true,
      reward: { icon: "EXP", label: "经验", amount: 50 },
    },
    {
      id: "movement",
      dimension: "movement",
      title: "杯子见底",
      subtitle: "把尿喝白",
      image: supplyDashboardAssetPaths.taskCards.movement,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "2天",
      completed: true,
      reward: { icon: "🪙", label: "银子", amount: 20 },
    },
    {
      id: "social",
      dimension: "social",
      title: "废话 KPI",
      subtitle: "把事办黄",
      image: supplyDashboardAssetPaths.taskCards.social,
      difficulty: "轻",
      tags: ["办公室"],
      durationLabel: "3天",
      completed: true,
      reward: { icon: "🎟", label: "券", amount: 1 },
    },
    {
      id: "learning",
      dimension: "learning",
      title: "一句话笔记",
      subtitle: "把股看红",
      image: supplyDashboardAssetPaths.taskCards.learning,
      difficulty: "中",
      tags: ["通用"],
      durationLabel: "4天",
      completed: false,
      reward: { icon: "EXP", label: "经验", amount: 50 },
    },
  ],
  inventoryPreview: {
    usedSlots: 18,
    totalSlots: 40,
    items: [
      { id: "water", name: "水瓶", icon: "💧", quantity: 12 },
      { id: "shoe", name: "跑鞋", icon: "👟", quantity: 1 },
      { id: "heart", name: "回血", icon: "❤", quantity: 6 },
    ],
  },
  supplyPreview: {
    remainingDraws: 999,
    maxDraws: 999,
    featuredRewards: [
      { id: "ticket", name: "补给券", icon: "🎟", quantity: 1 },
      { id: "water", name: "水瓶", icon: "💧", quantity: 1 },
      { id: "exp", name: "经验", icon: "EXP", quantity: 1 },
    ],
  },
  announcement: {
    message: "团队公告：周六早上 8 点公园团练，记得来哦！",
  },
};
```

- [ ] **Step 5: Write the mock data contract test**

Create `__tests__/supply-dashboard-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

describe("supply dashboard mock data", () => {
  it("covers the static Dashboard state required by the spec", () => {
    expect(supplyDashboardMock.dailyQuests).toHaveLength(4);
    expect(supplyDashboardMock.dailyQuests.filter((quest) => quest.completed)).toHaveLength(3);
    expect(supplyDashboardMock.dailyQuests.some((quest) => !quest.completed)).toBe(true);
    expect(supplyDashboardMock.resources.some((resource) => resource.maxValue !== undefined)).toBe(true);
    expect(supplyDashboardMock.inventoryPreview.usedSlots).toBe(18);
    expect(supplyDashboardMock.inventoryPreview.totalSlots).toBe(40);
    expect(supplyDashboardMock.supplyPreview.remainingDraws).toBe(999);
    expect(supplyDashboardMock.activeEffects.every((effect) => effect.expiresIn.length > 0)).toBe(true);
  });

  it("reuses existing raw task-card assets instead of new generated quest images", () => {
    expect(Object.values(supplyDashboardAssetPaths.taskCards)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/assets/task-cards/raw/"),
        expect.stringContaining("/assets/task-cards/raw/"),
        expect.stringContaining("/assets/task-cards/raw/"),
        expect.stringContaining("/assets/task-cards/raw/"),
      ]),
    );
    expect(Object.values(supplyDashboardAssetPaths.taskCards).join("\n")).not.toContain("/assets/home-scenes/supply/dashboard/quest-");
  });
});
```

- [ ] **Step 6: Run tests and verify current status**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts
```

Expected: route test still FAILS until the route is created; mock data test PASSES.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts components/gamification/ui-lab/supply-dashboard/types.ts components/gamification/ui-lab/supply-dashboard/mock-data.ts
git commit -m "test: add supply dashboard ui lab contracts"
```

## Task 2: Produce And Validate Required Media Assets

**Files:**
- Create: `public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp`
- Create: `public/assets/home-scenes/supply/dashboard/niuma-hero.webp`
- Create: `public/assets/home-scenes/supply/dashboard/dock-backpack.webp`
- Create: `public/assets/home-scenes/supply/dashboard/dock-supply-machine.webp`
- Create: `public/assets/home-scenes/supply/dashboard/dock-task-record.webp`
- Create: `__tests__/supply-dashboard-assets.test.ts`

- [ ] **Step 1: Write the failing asset contract test**

Create `__tests__/supply-dashboard-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "dashboard-gym-bg.webp", maxBytes: 450 * 1024 },
  { file: "niuma-hero.webp", maxBytes: 260 * 1024 },
  { file: "dock-backpack.webp", maxBytes: 90 * 1024 },
  { file: "dock-supply-machine.webp", maxBytes: 120 * 1024 },
  { file: "dock-task-record.webp", maxBytes: 90 * 1024 },
];

describe("supply dashboard media assets", () => {
  it.each(requiredAssets)("ships $file within its size budget", ({ file, maxBytes }) => {
    const path = `public/assets/home-scenes/supply/dashboard/${file}`;

    expect(existsSync(path), `${file} should exist in public assets`).toBe(true);
    expect(statSync(path).size, `${file} should stay within its size budget`).toBeLessThanOrEqual(maxBytes);
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-dashboard-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/supply/dashboard/*` assets do not exist yet.

- [ ] **Step 3: Create the asset directory**

Run:

```bash
mkdir -p public/assets/home-scenes/supply/dashboard
```

- [ ] **Step 4: Audit whether the existing punch background can be reused**

Inspect:

```bash
file public/assets/home-scenes/punch/gym-wall-bg.webp public/assets/home-scenes/punch/gym-floor-strip.webp
du -h public/assets/home-scenes/punch/gym-wall-bg.webp public/assets/home-scenes/punch/gym-floor-strip.webp
```

Decision:

- If the two existing images can be composed cleanly as the Dashboard background, copy and compress a combined background to `dashboard-gym-bg.webp`.
- If the composition looks too cropped or sparse, generate a new `dashboard-gym-bg.webp` with `imagegen`.

Generation prompt for the background:

```text
Use case: stylized-concept
Asset type: game dashboard background
Primary request: A bright stylized gym interior background for a Chinese fitness gamification dashboard, 16-bit inspired but polished, wide 16:9 composition, large windows with city view, warm morning light, gym equipment in the background, open empty center stage for a character, black/yellow sporty mood.
Scene/backdrop: modern gym floor, dumbbells and racks at the edges, depth of field but not blurry, no text, no logo, no character, no UI panels.
Output intent: background image that will sit behind React UI panels.
Avoid: text, watermark, readable signs, people, cluttered center, dark scene, heavy blur.
```

- [ ] **Step 5: Generate or reuse `niuma-hero.webp`**

Use `imagegen` for the central character. Ask for a flat chroma-key background if transparency is needed, then remove it locally using the imagegen skill chroma-key helper.

Prompt:

```text
Use case: stylized-concept
Asset type: transparent game character prop
Primary request: A cute anthropomorphic cow fitness mascot, full body, standing confidently with one dumbbell, wearing black and yellow gym outfit, yellow headband with Chinese text "加油", sporty shoes, friendly determined expression.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Style: polished 3D toy-like mascot with slight pixel-game influence, bold black outlines, clean silhouette, front-facing three-quarter pose.
Output intent: central hero character for a dashboard UI.
Avoid: background scenery, extra characters, watermark, cropped feet, unreadable small text beyond the headband.
```

After generation, remove chroma key if needed:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input tmp/imagegen/niuma-hero-source.png \
  --out tmp/imagegen/niuma-hero.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

- [ ] **Step 6: Generate dock assets**

Use one `imagegen` call per dock asset. Keep each asset separate.

Backpack prompt:

```text
Use case: stylized-concept
Asset type: transparent game UI prop
Primary request: A compact black-and-yellow fitness backpack icon prop, chunky game asset style, front view, zipper and straps visible, clean silhouette.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Avoid: text, logo, background scene, tiny details, watermark.
```

Supply machine prompt:

```text
Use case: stylized-concept
Asset type: transparent game UI prop
Primary request: A cute red and yellow capsule supply vending machine for a fitness gamification dashboard, filled with small reward capsules, chunky game asset style, front view.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Avoid: text, logo, background scene, character, watermark.
```

Task record prompt:

```text
Use case: stylized-concept
Asset type: transparent game UI prop
Primary request: A clipboard task record icon prop with checkmarks and a small pencil, warm orange/yellow accent, chunky game asset style, front view.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Avoid: readable text, logo, background scene, watermark.
```

- [ ] **Step 7: Compress final images into public assets**

Use ImageMagick or `cwebp`. Example commands:

```bash
magick tmp/imagegen/dashboard-gym-bg-source.png -resize 1920x1080\> -strip -quality 82 public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp
magick tmp/imagegen/niuma-hero.png -resize x720\> -strip -quality 86 public/assets/home-scenes/supply/dashboard/niuma-hero.webp
magick tmp/imagegen/dock-backpack.png -resize 220x220\> -strip -quality 86 public/assets/home-scenes/supply/dashboard/dock-backpack.webp
magick tmp/imagegen/dock-supply-machine.png -resize 260x220\> -strip -quality 86 public/assets/home-scenes/supply/dashboard/dock-supply-machine.webp
magick tmp/imagegen/dock-task-record.png -resize 220x220\> -strip -quality 86 public/assets/home-scenes/supply/dashboard/dock-task-record.webp
```

If `magick` is unavailable, use:

```bash
cwebp -q 82 tmp/imagegen/dashboard-gym-bg-source.png -o public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp
```

- [ ] **Step 8: Run asset test and inspect file sizes**

Run:

```bash
npm test -- __tests__/supply-dashboard-assets.test.ts
du -h public/assets/home-scenes/supply/dashboard/*
```

Expected: test PASS and all files under budget.

- [ ] **Step 9: Commit Task 2**

Run:

```bash
git add __tests__/supply-dashboard-assets.test.ts public/assets/home-scenes/supply/dashboard
git commit -m "feat: add supply dashboard media assets"
```

## Task 3: Build The Static Route And Scene Components

**Files:**
- Create: `app/ui-lab/supply-dashboard/page.tsx`
- Create: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Create: `__tests__/supply-dashboard-scene.test.tsx`

- [ ] **Step 1: Write the failing scene render test**

Create `__tests__/supply-dashboard-scene.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("supply dashboard static scene", () => {
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

  it("renders the isolated layered Dashboard scene from static mock data", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-background")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-content")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card")).toHaveLength(4);
    expect(container.querySelector(".supply-dashboard-shortcut-dock")).not.toBeNull();
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("角色状态");
    expect(container.textContent).toContain("今日主线");
    expect(container.textContent).toContain("任务记录");
  });

  it("uses final media assets plus existing raw task-card images", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDashboardAssetPaths.hero,
        supplyDashboardAssetPaths.dockBackpack,
        supplyDashboardAssetPaths.dockSupplyMachine,
        supplyDashboardAssetPaths.dockTaskRecord,
        supplyDashboardAssetPaths.taskCards.hydration,
        supplyDashboardAssetPaths.taskCards.movement,
        supplyDashboardAssetPaths.taskCards.social,
        supplyDashboardAssetPaths.taskCards.learning,
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL because `SupplyDashboardScene.tsx` does not exist.

- [ ] **Step 3: Create the route entry**

Create `app/ui-lab/supply-dashboard/page.tsx`:

```tsx
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

export const metadata = {
  title: "牛马补给站 Dashboard UI Lab",
};

export default function SupplyDashboardUiLabPage() {
  return <SupplyDashboardScene data={supplyDashboardMock} />;
}
```

- [ ] **Step 4: Create the scene component**

Create `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`:

```tsx
import Image from "next/image";
import type { SupplyDashboardPreview, SupplyDashboardQuest } from "./types";
import { supplyDashboardAssetPaths } from "./mock-data";

function formatResource(value: number, maxValue?: number) {
  return maxValue === undefined ? value.toLocaleString("zh-CN") : `${value} / ${maxValue}`;
}

function GameTopBar({ data }: { data: SupplyDashboardPreview }) {
  return (
    <header className="supply-dashboard-topbar" aria-label="牛马补给站 UI lab 顶部栏">
      <div className="supply-dashboard-brand">
        <Image src="/logo.png" alt="" width={44} height={44} priority />
        <span>牛马补给站</span>
      </div>
      <nav className="supply-dashboard-nav" aria-label="静态补给站导航">
        {["我的状态", "团队目标", "排行榜", "补给商店", "任务记录"].map((item, index) => (
          <span key={item} className={index === 0 ? "is-active" : undefined}>
            {item}
          </span>
        ))}
      </nav>
      <div className="supply-dashboard-resources" aria-label="静态资源栏">
        {data.resources.map((resource) => (
          <span key={resource.id} className="supply-dashboard-resource-pill">
            <span aria-hidden="true">{resource.icon}</span>
            <strong>{formatResource(resource.value, resource.maxValue)}</strong>
            <span className="supply-dashboard-plus" aria-hidden="true">+</span>
          </span>
        ))}
        <Image src={data.profile.avatar} alt={data.profile.username} width={44} height={44} className="supply-dashboard-avatar" />
      </div>
    </header>
  );
}

function CharacterStatusPanel({ data }: { data: SupplyDashboardPreview }) {
  return (
    <aside className="supply-dashboard-status-panel" aria-labelledby="supply-dashboard-status-title">
      <div className="supply-dashboard-panel-heading">
        <h2 id="supply-dashboard-status-title">角色状态</h2>
        <span aria-hidden="true">•••</span>
      </div>
      <div className="supply-dashboard-title-card">
        <span>称号</span>
        <strong>{data.profile.title}</strong>
      </div>
      <div className="supply-dashboard-effects">
        <p>今日效果</p>
        {data.activeEffects.map((effect) => (
          <div key={effect.id} className="supply-dashboard-effect-row">
            <span className="supply-dashboard-effect-icon">{effect.icon}</span>
            <strong>{effect.label}</strong>
            <span>{effect.value}</span>
            <time>{effect.expiresIn}</time>
          </div>
        ))}
      </div>
      <div className="supply-dashboard-streak">
        <span>连续打卡</span>
        <strong>🔥 {data.profile.streakDays} 天</strong>
      </div>
    </aside>
  );
}

function HeroCharacterStage({ data }: { data: SupplyDashboardPreview }) {
  const progress = Math.round((data.profile.exp / data.profile.nextLevelExp) * 100);

  return (
    <section className="supply-dashboard-hero-stage" aria-label="静态角色舞台">
      <div className="supply-dashboard-speech">{data.motto}</div>
      <Image src={supplyDashboardAssetPaths.hero} alt="牛马健身角色" width={520} height={720} priority className="supply-dashboard-hero-image" />
      <div className="supply-dashboard-level-card">
        <strong>Lv.{data.profile.level}</strong>
        <div className="supply-dashboard-exp-bar" aria-label={`经验 ${data.profile.exp}/${data.profile.nextLevelExp}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>{data.profile.exp} / {data.profile.nextLevelExp}</small>
      </div>
    </section>
  );
}

function QuestCard({ quest }: { quest: SupplyDashboardQuest }) {
  return (
    <article className={`supply-dashboard-quest-card supply-dashboard-quest-card--${quest.dimension}`}>
      <div className="supply-dashboard-quest-meta">
        <span>{quest.subtitle}</span>
        {quest.completed ? <strong aria-label="已完成">✓</strong> : null}
      </div>
      <h3>{quest.title}</h3>
      <Image src={quest.image} alt="" width={360} height={260} className="supply-dashboard-quest-image" />
      <div className="supply-dashboard-quest-tags">
        <span>{quest.difficulty}</span>
        {quest.tags.map((tag) => <span key={tag}>{tag}</span>)}
        <span>{quest.durationLabel}</span>
      </div>
    </article>
  );
}

function DailyQuestPanel({ data }: { data: SupplyDashboardPreview }) {
  const completed = data.dailyQuests.filter((quest) => quest.completed).length;

  return (
    <section className="supply-dashboard-quest-panel" aria-labelledby="supply-dashboard-quest-title">
      <div className="supply-dashboard-quest-heading">
        <h2 id="supply-dashboard-quest-title">今日主线</h2>
        <span>进度：{completed} / {data.dailyQuests.length}</span>
      </div>
      <div className="supply-dashboard-quest-grid">
        {data.dailyQuests.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
      </div>
      <div className="supply-dashboard-reward-bar">
        <span>完成全部任务可获得</span>
        <strong>EXP 200</strong>
        <strong>银子 100</strong>
        <strong>补给券 1</strong>
        <button type="button" disabled>已领取</button>
      </div>
    </section>
  );
}

function DashboardShortcutDock({ data }: { data: SupplyDashboardPreview }) {
  return (
    <section className="supply-dashboard-shortcut-dock" aria-label="静态快捷入口">
      <a className="supply-dashboard-home-card" href="/ui-lab/supply-dashboard">
        <span aria-hidden="true">⌂</span>
        <strong>首页</strong>
        <small>查看你的今日状态</small>
      </a>
      <a className="supply-dashboard-dock-card" href="#backpack">
        <Image src={supplyDashboardAssetPaths.dockBackpack} alt="" width={110} height={110} />
        <strong>背包</strong>
        <small>{data.inventoryPreview.usedSlots} / {data.inventoryPreview.totalSlots}</small>
      </a>
      <a className="supply-dashboard-dock-card" href="#supply">
        <Image src={supplyDashboardAssetPaths.dockSupplyMachine} alt="" width={120} height={110} />
        <strong>补给站</strong>
        <small>剩余次数 {data.supplyPreview.remainingDraws} / {data.supplyPreview.maxDraws}</small>
      </a>
      <a className="supply-dashboard-task-record-card" href="#tasks">
        <Image src={supplyDashboardAssetPaths.dockTaskRecord} alt="" width={96} height={96} />
        <strong>任务记录</strong>
        <small>查看历史任务与奖励</small>
      </a>
    </section>
  );
}

function TeamAnnouncementBar({ data }: { data: SupplyDashboardPreview }) {
  return (
    <footer className="supply-dashboard-announcement">
      <strong>📣</strong>
      <span>{data.announcement.message}</span>
      <nav aria-label="静态底部入口">
        <a href="#help">帮助中心</a>
        <a href="#feedback">意见反馈</a>
        <a href="#settings">设置</a>
      </nav>
    </footer>
  );
}

export function SupplyDashboardScene({ data }: { data: SupplyDashboardPreview }) {
  return (
    <main className="supply-dashboard-scene" aria-label="牛马补给站 Dashboard UI Lab">
      <div className="supply-dashboard-background" aria-hidden="true">
        <Image src={supplyDashboardAssetPaths.background} alt="" fill sizes="100vw" priority />
      </div>
      <div className="supply-dashboard-content">
        <GameTopBar data={data} />
        <div className="supply-dashboard-main">
          <CharacterStatusPanel data={data} />
          <HeroCharacterStage data={data} />
          <DailyQuestPanel data={data} />
        </div>
        <DashboardShortcutDock data={data} />
        <TeamAnnouncementBar data={data} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run route, mock, asset, and scene tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: PASS. CSS contracts are added in Task 4.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add app/ui-lab/supply-dashboard/page.tsx components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx __tests__/supply-dashboard-scene.test.tsx
git commit -m "feat: add static supply dashboard scene"
```

## Task 4: Add Scene CSS And Responsive Contracts

**Files:**
- Create: `__tests__/supply-dashboard-scene-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing CSS contract test**

Create `__tests__/supply-dashboard-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function normalizeCss(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractBlocks(css: string, marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
    const blockStart = css.indexOf("{", markerIndex);
    expect(blockStart).toBeGreaterThan(markerIndex);
    let depth = 1;
    let cursor = blockStart + 1;
    while (depth > 0 && cursor < css.length) {
      if (css[cursor] === "{") depth += 1;
      if (css[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    expect(depth).toBe(0);
    blocks.push(css.slice(blockStart + 1, cursor - 1));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function extractRuleBody(css: string, selector: string) {
  const markerIndex = css.indexOf(selector);
  expect(markerIndex).toBeGreaterThanOrEqual(0);
  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);
  let depth = 1;
  let cursor = blockStart + 1;
  while (depth > 0 && cursor < css.length) {
    if (css[cursor] === "{") depth += 1;
    if (css[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

describe("supply dashboard scene CSS", () => {
  it("defines a layered Dashboard scene shell", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const scene = extractRuleBody(css, ".supply-dashboard-scene");
    const background = extractRuleBody(css, ".supply-dashboard-background");
    const content = extractRuleBody(css, ".supply-dashboard-content");
    const main = extractRuleBody(css, ".supply-dashboard-main");

    expect(scene).toMatch(/position:\s*relative/);
    expect(scene).toMatch(/isolation:\s*isolate/);
    expect(scene).toMatch(/min-height:\s*100vh/);
    expect(scene).toMatch(/overflow:\s*hidden/);
    expect(background).toMatch(/position:\s*absolute/);
    expect(background).toMatch(/z-index:\s*0/);
    expect(background).toMatch(/pointer-events:\s*none/);
    expect(content).toMatch(/position:\s*relative/);
    expect(content).toMatch(/z-index:\s*1/);
    expect(main).toMatch(/grid-template-columns:\s*minmax\(16rem,\s*0\.72fr\)\s+minmax\(22rem,\s*1fr\)\s+minmax\(24rem,\s*1\.1fr\)/);
  });

  it("includes responsive and reduced-motion coverage", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const mobileCss = extractBlocks(css, "@media (max-width: 760px)").join("\n");
    const reducedMotionCss = extractBlocks(css, "@media (prefers-reduced-motion: reduce)").join("\n");

    expect(mobileCss).toContain(".supply-dashboard-scene");
    expect(mobileCss).toContain(".supply-dashboard-main");
    expect(mobileCss).toMatch(/grid-template-columns:\s*1fr/);
    expect(mobileCss).toMatch(/overflow-y:\s*auto/);
    expect(reducedMotionCss).toContain(".supply-dashboard-scene *");
    expect(reducedMotionCss).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
```

- [ ] **Step 2: Run CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene-css.test.ts
```

Expected: FAIL because `supply-dashboard-*` CSS is not present.

- [ ] **Step 3: Add Dashboard CSS to `app/globals.css`**

Append this section near the other home scene styles in `app/globals.css`:

```css
.supply-dashboard-scene {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  background: #111827;
  color: #111827;
  letter-spacing: 0;
}

.supply-dashboard-background {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.supply-dashboard-background img {
  object-fit: cover;
  filter: saturate(1.02) contrast(0.96);
}

.supply-dashboard-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.12), rgba(17, 24, 39, 0.46));
}

.supply-dashboard-content {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 100vh;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: clamp(0.65rem, 1.1vw, 1rem);
  padding: clamp(0.45rem, 0.8vw, 0.75rem);
}

.supply-dashboard-topbar,
.supply-dashboard-announcement {
  border: 4px solid #020617;
  background: #facc15;
  box-shadow: 0 6px 0 #020617;
}

.supply-dashboard-topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 4.75rem;
  padding: 0.45rem 0.8rem;
}

.supply-dashboard-brand,
.supply-dashboard-resources,
.supply-dashboard-nav,
.supply-dashboard-resource-pill {
  display: flex;
  align-items: center;
}

.supply-dashboard-brand {
  gap: 0.6rem;
  font-size: clamp(1.6rem, 2.7vw, 2.9rem);
  font-weight: 1000;
  white-space: nowrap;
}

.supply-dashboard-nav {
  justify-content: center;
  gap: clamp(0.5rem, 1vw, 1rem);
  min-width: 0;
  overflow-x: auto;
  font-size: clamp(0.78rem, 1vw, 0.95rem);
  font-weight: 950;
}

.supply-dashboard-nav span {
  white-space: nowrap;
  border: 2px solid transparent;
  padding: 0.55rem 0.75rem;
}

.supply-dashboard-nav .is-active {
  border-color: #020617;
  background: #fef08a;
  box-shadow: 0 4px 0 #020617;
}

.supply-dashboard-resources {
  justify-content: flex-end;
  gap: 0.55rem;
}

.supply-dashboard-resource-pill {
  gap: 0.45rem;
  min-width: 7rem;
  justify-content: space-between;
  border: 2px solid rgba(2, 6, 23, 0.35);
  background: rgba(250, 204, 21, 0.52);
  padding: 0.45rem 0.55rem;
  font-weight: 950;
}

.supply-dashboard-plus {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border: 2px solid #020617;
  background: #fde047;
  line-height: 1;
}

.supply-dashboard-avatar {
  border: 3px solid #020617;
  background: #fff;
}

.supply-dashboard-main {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(16rem, 0.72fr) minmax(22rem, 1fr) minmax(24rem, 1.1fr);
  gap: clamp(0.75rem, 1.25vw, 1.25rem);
  align-items: stretch;
}

.supply-dashboard-status-panel,
.supply-dashboard-quest-panel,
.supply-dashboard-level-card,
.supply-dashboard-dock-card,
.supply-dashboard-home-card,
.supply-dashboard-task-record-card {
  border: 4px solid #020617;
  background: rgba(255, 251, 235, 0.94);
  box-shadow: 6px 6px 0 #020617;
}

.supply-dashboard-status-panel,
.supply-dashboard-quest-panel {
  align-self: start;
  padding: clamp(0.85rem, 1.3vw, 1.25rem);
}

.supply-dashboard-panel-heading,
.supply-dashboard-quest-heading,
.supply-dashboard-quest-meta,
.supply-dashboard-effect-row,
.supply-dashboard-streak,
.supply-dashboard-reward-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.supply-dashboard-panel-heading h2,
.supply-dashboard-quest-heading h2 {
  font-size: clamp(1.25rem, 1.6vw, 1.75rem);
  font-weight: 1000;
}

.supply-dashboard-title-card,
.supply-dashboard-effects,
.supply-dashboard-streak {
  margin-top: 0.9rem;
  border: 2px solid rgba(2, 6, 23, 0.28);
  background: rgba(255, 255, 255, 0.68);
  padding: 0.85rem;
}

.supply-dashboard-title-card strong {
  display: inline-flex;
  margin-top: 0.45rem;
  border: 3px solid #020617;
  background: #111827;
  color: #fff;
  padding: 0.45rem 0.9rem;
  font-size: 1.25rem;
}

.supply-dashboard-effects p {
  margin-bottom: 0.6rem;
  font-weight: 950;
}

.supply-dashboard-effect-row {
  border-top: 1px solid rgba(2, 6, 23, 0.16);
  padding: 0.55rem 0;
  font-size: clamp(0.78rem, 0.95vw, 0.95rem);
}

.supply-dashboard-effect-icon {
  display: inline-flex;
  width: 2.2rem;
  height: 2.2rem;
  align-items: center;
  justify-content: center;
  border: 2px solid #020617;
  background: #bbf7d0;
  font-size: 0.78rem;
  font-weight: 1000;
}

.supply-dashboard-hero-stage {
  position: relative;
  display: flex;
  min-height: clamp(33rem, 64vh, 47rem);
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem 5.75rem;
}

.supply-dashboard-speech {
  position: absolute;
  top: clamp(1rem, 4vh, 2.4rem);
  left: 0;
  max-width: 16rem;
  border: 3px solid #020617;
  background: rgba(255, 251, 235, 0.96);
  padding: 0.85rem 1rem;
  font-weight: 950;
  box-shadow: 5px 5px 0 #020617;
}

.supply-dashboard-hero-image {
  width: min(34vw, 32rem);
  height: auto;
  max-height: 78vh;
  object-fit: contain;
  filter: drop-shadow(0 18px 22px rgba(2, 6, 23, 0.34));
}

.supply-dashboard-level-card {
  position: absolute;
  right: 3%;
  bottom: 1rem;
  display: grid;
  width: min(32rem, 88%);
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  background: #111827;
  color: #fff;
  padding: 0.75rem 1rem;
}

.supply-dashboard-level-card strong {
  font-size: clamp(1.4rem, 2vw, 2.25rem);
}

.supply-dashboard-exp-bar {
  height: 1.4rem;
  border: 3px solid #020617;
  background: #020617;
}

.supply-dashboard-exp-bar span {
  display: block;
  height: 100%;
  background: #facc15;
}

.supply-dashboard-quest-panel {
  background: rgba(255, 251, 235, 0.96);
}

.supply-dashboard-quest-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.65rem, 1vw, 0.9rem);
  margin-top: 0.75rem;
}

.supply-dashboard-quest-card {
  min-width: 0;
  border: 3px solid #020617;
  background: #fff7ed;
  padding: 0.65rem;
  box-shadow: 4px 4px 0 #020617;
}

.supply-dashboard-quest-card--hydration { background: #ecfeff; }
.supply-dashboard-quest-card--movement { background: #f0fdf4; }
.supply-dashboard-quest-card--social { background: #fef3c7; }
.supply-dashboard-quest-card--learning { background: #fee2e2; }

.supply-dashboard-quest-card h3 {
  margin: 0.25rem 0 0.45rem;
  font-size: clamp(1rem, 1.25vw, 1.35rem);
  font-weight: 1000;
  line-height: 1.1;
}

.supply-dashboard-quest-meta {
  color: #166534;
  font-size: 0.78rem;
  font-weight: 950;
}

.supply-dashboard-quest-meta strong {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 3px solid #166534;
  border-radius: 999px;
  background: #65a30d;
  color: #fff;
}

.supply-dashboard-quest-image {
  width: 100%;
  aspect-ratio: 1.28;
  height: auto;
  object-fit: cover;
  border: 3px solid #020617;
  background: #fff;
}

.supply-dashboard-quest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.supply-dashboard-quest-tags span {
  border: 2px solid #020617;
  background: #fefce8;
  padding: 0.22rem 0.42rem;
  font-size: 0.72rem;
  font-weight: 950;
}

.supply-dashboard-reward-bar {
  margin-top: 0.75rem;
  border: 2px solid rgba(2, 6, 23, 0.22);
  background: #fff7ed;
  padding: 0.65rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 950;
}

.supply-dashboard-reward-bar button {
  border: 3px solid #14532d;
  background: #65a30d;
  color: #fff;
  padding: 0.5rem 1rem;
  font-weight: 1000;
}

.supply-dashboard-shortcut-dock {
  display: grid;
  grid-template-columns: minmax(13rem, 1fr) minmax(12rem, 0.8fr) minmax(15rem, 1.2fr) minmax(16rem, 1fr);
  gap: clamp(0.75rem, 1.2vw, 1rem);
}

.supply-dashboard-home-card,
.supply-dashboard-dock-card,
.supply-dashboard-task-record-card {
  display: grid;
  min-height: 7.2rem;
  align-items: center;
  color: #020617;
  text-decoration: none;
  padding: 0.75rem 1rem;
}

.supply-dashboard-home-card {
  grid-template-columns: auto minmax(0, 1fr);
  background: #facc15;
}

.supply-dashboard-dock-card,
.supply-dashboard-task-record-card {
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
}

.supply-dashboard-task-record-card {
  background: #fb923c;
}

.supply-dashboard-home-card span {
  grid-row: span 2;
  font-size: 3.5rem;
}

.supply-dashboard-shortcut-dock strong {
  font-size: clamp(1.2rem, 1.6vw, 1.8rem);
  font-weight: 1000;
}

.supply-dashboard-shortcut-dock small {
  font-weight: 800;
}

.supply-dashboard-announcement {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.2rem;
  padding: 0.5rem 1rem;
  font-weight: 950;
}

.supply-dashboard-announcement nav {
  display: flex;
  gap: 1rem;
}

.supply-dashboard-announcement a {
  color: #020617;
  text-decoration: none;
}

@media (max-width: 1180px) {
  .supply-dashboard-topbar,
  .supply-dashboard-main,
  .supply-dashboard-shortcut-dock {
    grid-template-columns: 1fr;
  }

  .supply-dashboard-resources,
  .supply-dashboard-nav {
    justify-content: flex-start;
  }

  .supply-dashboard-scene {
    overflow-y: auto;
  }
}

@media (max-width: 760px) {
  .supply-dashboard-scene {
    min-height: 100vh;
    overflow-y: auto;
  }

  .supply-dashboard-content {
    min-height: auto;
    padding: 0.65rem;
  }

  .supply-dashboard-topbar,
  .supply-dashboard-main,
  .supply-dashboard-shortcut-dock {
    grid-template-columns: 1fr;
  }

  .supply-dashboard-quest-grid {
    grid-template-columns: 1fr;
  }

  .supply-dashboard-hero-stage {
    min-height: 31rem;
    padding-bottom: 5rem;
  }

  .supply-dashboard-hero-image {
    width: min(82vw, 23rem);
  }

  .supply-dashboard-level-card {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .supply-dashboard-announcement {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-dashboard-scene *,
  .supply-dashboard-scene *::before,
  .supply-dashboard-scene *::after {
    scroll-behavior: auto;
    transition-duration: 0.01ms;
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
```

- [ ] **Step 4: Run CSS and scene tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene-css.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add app/globals.css __tests__/supply-dashboard-scene-css.test.ts
git commit -m "style: add supply dashboard scene styles"
```

## Task 5: Local Browser Verification And Final Checks

**Files:**
- Modify if needed: `app/globals.css`
- Modify if needed: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify if needed: assets under `public/assets/home-scenes/supply/dashboard/`

- [ ] **Step 1: Run focused test suite**

Run:

```bash
npm test -- __tests__/supply-dashboard-ui-lab-route.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-assets.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 3: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts on `http://localhost:3001`.

- [ ] **Step 4: Browser-check desktop**

Open:

```text
http://localhost:3001/ui-lab/supply-dashboard
```

Check at desktop width:

- Top bar is visible and resource pills do not overflow.
- Left status panel, center hero, and right quest panel form the intended three-column relation.
- Four quest cards render with raw task-card images.
- Bottom dock cards are visible.
- Announcement bar is visible.
- No image is stretched, missing, blurred beyond usefulness, or showing chroma-key residue.

- [ ] **Step 5: Browser-check mobile**

Check at a mobile width around `390 x 844`:

- Page scrolls vertically.
- Text is readable.
- No panel overlaps another panel.
- Quest cards become one column.
- Dock cards become one column.
- Hero image stays inside viewport width.

- [ ] **Step 6: Run production build**

Stop the dev server if needed, then run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit final visual corrections**

If Steps 4-6 required fixes, commit them:

```bash
git add app/globals.css components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx public/assets/home-scenes/supply/dashboard
git commit -m "fix: polish supply dashboard static scene"
```

If no fixes were needed, do not create an empty commit.

## Final Verification Checklist

- [ ] `/ui-lab/supply-dashboard` exists and renders.
- [ ] No production tab/navigation files were modified.
- [ ] No API calls are made by the UI lab page.
- [ ] Required Dashboard assets exist under `public/assets/home-scenes/supply/dashboard/`.
- [ ] Task-card images are referenced only from `public/assets/task-cards/raw/`.
- [ ] Focused tests pass.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Desktop and mobile browser checks are recorded in the final implementation summary.

## Plan Self-Review

- Spec coverage:
  - Route isolation is covered by Task 1 and Task 3.
  - Mock data contract is covered by Task 1.
  - Media audit, generation, compression, and public asset storage are covered by Task 2.
  - Task-card reuse from `public/assets/task-cards/raw/` is covered by Task 1 and Task 3.
  - Scene structure, semantic components, and responsive layout are covered by Task 3 and Task 4.
  - Browser verification, lint, and build are covered by Task 5.
- Placeholder scan:
  - No `TBD`, `TODO`, or "implement later" placeholders.
  - The only optional branch is the explicit media decision to reuse the existing punch background or generate a new background after audit.
- Type consistency:
  - `SupplyDashboardPreview`, `SupplyDashboardQuest`, and `supplyDashboardMock` are defined before use.
  - `SupplyDashboardScene` accepts `data: SupplyDashboardPreview` consistently across route and tests.
