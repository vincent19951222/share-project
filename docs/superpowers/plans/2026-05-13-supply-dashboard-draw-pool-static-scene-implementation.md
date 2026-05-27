# Supply Dashboard Draw Pool Static Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated `/ui-lab/supply-dashboard/draw-pool` static scene that visually prototypes the 牛马补给站抽卡池 page from `design/ui-assets/抽卡池.png` without touching the stable production `SupplyStation` flow.

**Architecture:** Create a route-local UI lab page backed by centralized mock data and semantic static components. Reuse existing Dashboard UI-lab visual rules and reward icons, add draw-pool-only media under `public/assets/home-scenes/supply/draw-pool/`, update only the Dashboard UI-lab dock entry so「抽卡池」links into this route, and keep scene CSS isolated behind `supply-draw-pool-*` class names in `app/globals.css`.

**2026-05-13 implementation adjustment:** The central draw machine should not be rebuilt with CSS primitives. Crop the full machine panel from `design/ui-assets/抽卡池.png` into `public/assets/home-scenes/supply/draw-pool/draw-pool-machine-panel.png`, render it as the `DrawMachineStage` background image, and overlay only two transparent semantic buttons for「单抽 x1」and「十连 x10」. The title, capsule window, lever, knob, guarantee label, and skip-animation text are image content. The left wallet panel follows the same rule: crop `draw-pool-wallet-panel.png` and overlay transparent buttons for「获取更多抽奖券」and「前往任务」.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, existing media under `public/assets/home-scenes/supply/dashboard/` and `public/gamification/rewards/icons/`, built-in `imagegen` for missing raster assets, ImageMagick `magick` and/or `cwebp` for local image processing.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-draw-pool-static-scene-design.md`
- UI lab plan: `docs/superpowers/specs/2026-05-10-supply-dashboard-ui-lab-design.md`
- Dashboard static scene spec: `docs/superpowers/specs/2026-05-10-supply-dashboard-static-scene-design.md`
- Shop static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-shop-static-scene-design.md`
- Task record static scene spec: `docs/superpowers/specs/2026-05-13-supply-dashboard-task-record-static-scene-design.md`
- Image workflow: `docs/superpowers/specs/2026-05-05-home-ui-image-prototype-workflow-design.md`
- Lottery behavior reference: `docs/superpowers/specs/2026-04-25-gm-06-lottery-v1-design.md`
- Probability disclosure reference: `docs/superpowers/specs/2026-05-02-gm-19-probability-disclosure-design.md`
- Target prototype: `design/ui-assets/抽卡池.png`

## Scope Guardrails

- Do not modify `components/gamification/SupplyStation.tsx`.
- Do not modify `app/(board)/page.tsx`, `app/(board)/layout.tsx`, `components/navbar/Navbar.tsx`, `lib/store.tsx`, or `lib/types.ts`.
- Do not add to the production nav and do not change `AppTab`.
- Do not call `/api/gamification/*` or any other API from the UI lab route.
- Do not read cookies, sessions, Prisma, or real auth state.
- Do not paste `design/ui-assets/抽卡池.png` into the page as a full-page background image. A cropped central machine panel is allowed for pixel fidelity.
- Do not implement real single draw, ten draw, ticket spending, coin top-up, reward settlement, pity logic, animation state, or draw result modal.
- Do not add external UI dependencies.
- Only modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx` to wire the Dashboard dock entry to the draw-pool UI lab route.

## File Structure

- Create: `app/ui-lab/supply-dashboard/draw-pool/page.tsx`
  - Route entry for the isolated static prototype.
- Create: `components/gamification/ui-lab/supply-draw-pool/types.ts`
  - Static draw-pool page data types.
- Create: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
  - Centralized static mock data and asset path references.
- Create: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
  - Scene shell and semantic subcomponents.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Change the Dashboard dock supply-machine link from `#supply` to `/ui-lab/supply-dashboard/draw-pool` and the visible label to `抽卡池`.
- Create: `__tests__/supply-draw-pool-ui-lab-route.test.ts`
  - Route isolation and Dashboard dock href contract.
- Create: `__tests__/supply-draw-pool-mock-data.test.ts`
  - Mock data coverage for resources, wallet, probability rows, draw actions, pity, recent drops, and rules.
- Create: `__tests__/supply-draw-pool-assets.test.ts`
  - Required final media and reused reward asset existence and size budgets.
- Create: `__tests__/supply-draw-pool-scene.test.tsx`
  - Static scene DOM structure and image path contract.
- Create: `__tests__/supply-draw-pool-scene-css.test.ts`
  - CSS layer, responsive, and reduced-motion contract.
- Create: `public/assets/home-scenes/supply/draw-pool/`
  - Final compressed draw-pool media assets.
- Modify: `app/globals.css`
  - Add `supply-draw-pool-*` scene styles only.

## Task 1: Lock Route Isolation And Dashboard Dock Contract

**Files:**
- Create: `__tests__/supply-draw-pool-ui-lab-route.test.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Create: `app/ui-lab/supply-dashboard/draw-pool/page.tsx`

- [ ] **Step 1: Write the failing route isolation test**

Create `__tests__/supply-draw-pool-ui-lab-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply draw pool ui lab route isolation", () => {
  it("uses a standalone draw-pool route without changing production tab wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/draw-pool/page.tsx")).toBe(true);

    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const types = readFileSync("lib/types.ts", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");
    const dashboardScene = readFileSync(
      "components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx",
      "utf8",
    );

    expect(boardPage).not.toContain("SupplyDrawPoolScene");
    expect(navbar).not.toContain("ui-lab");
    expect(supplyStation).not.toContain("SupplyDrawPoolScene");
    expect(types).toContain('export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";');
    expect(dashboardScene).toContain('href="/ui-lab/supply-dashboard/draw-pool"');
    expect(dashboardScene).toContain("抽卡池");
    expect(dashboardScene).not.toContain('href="#supply"');
  });
});
```

- [ ] **Step 2: Run the isolation test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts
```

Expected: FAIL because `app/ui-lab/supply-dashboard/draw-pool/page.tsx` does not exist and the Dashboard dock still links to `#supply`.

- [ ] **Step 3: Wire the Dashboard dock entry**

In `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, change the supply dock anchor inside `DashboardShortcutDock` to:

```tsx
<a href="/ui-lab/supply-dashboard/draw-pool">
  <Image
    alt=""
    aria-hidden="true"
    height={112}
    src={supplyDashboardAssetPaths.dockSupplyMachine}
    unoptimized
    width={112}
  />
  <span>
    抽卡池
    <small>随机获取道具</small>
  </span>
  <strong>
    {data.supplyPreview.remainingDraws}/{data.supplyPreview.maxDraws}
  </strong>
</a>
```

- [ ] **Step 4: Add the route entry**

Create `app/ui-lab/supply-dashboard/draw-pool/page.tsx`:

```tsx
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

export const metadata = {
  title: "抽卡池 UI Lab",
};

export default function SupplyDashboardDrawPoolPage() {
  return <SupplyDrawPoolScene data={supplyDrawPoolMock} />;
}
```

- [ ] **Step 5: Run the isolation test again**

Run:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts
```

Expected: FAIL until `SupplyDrawPoolScene` and `supplyDrawPoolMock` are added in Task 2 and Task 4.

## Task 2: Add Static Types And Mock Data

**Files:**
- Create: `components/gamification/ui-lab/supply-draw-pool/types.ts`
- Create: `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- Create: `__tests__/supply-draw-pool-mock-data.test.ts`

- [ ] **Step 1: Add draw-pool data types**

Create `components/gamification/ui-lab/supply-draw-pool/types.ts`:

```ts
export type SupplyDrawPoolResourceId = "ticket" | "coins";
export type SupplyDrawPoolActionId = "single" | "ten";
export type SupplyDrawPoolRarity = "SSR" | "SR" | "R" | "N";

export type SupplyDrawPoolResource = {
  id: SupplyDrawPoolResourceId;
  label: string;
  value: string;
  icon: string;
};

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
  rarity: SupplyDrawPoolRarity;
  percent: number;
  tone: "ssr" | "sr" | "r" | "n";
};

export type SupplyDrawPoolMachineAction = {
  id: SupplyDrawPoolActionId;
  label: string;
  drawCount: number;
  costTicket: number;
  tone: "single" | "ten";
  guaranteeLabel?: string;
};

export type SupplyDrawPoolMachine = {
  title: string;
  capsuleBedImage: string;
  emblemImage: string;
  skipAnimation: boolean;
  actions: SupplyDrawPoolMachineAction[];
};

export type SupplyDrawPoolPity = {
  remainingDraws: number;
  guaranteeLabel: string;
  current: number;
  target: number;
  rewardImage: string;
};

export type SupplyDrawPoolRecentDrop = {
  id: string;
  rarity: SupplyDrawPoolRarity;
  name: string;
  quantityLabel: string;
  image: string;
};

export type SupplyDrawPoolPreview = {
  topBar: {
    resources: SupplyDrawPoolResource[];
    closeHref: string;
  };
  wallet: SupplyDrawPoolWallet;
  guide: SupplyDrawPoolGuide;
  poolRates: SupplyDrawPoolRate[];
  machine: SupplyDrawPoolMachine;
  pity: SupplyDrawPoolPity;
  recentDrops: SupplyDrawPoolRecentDrop[];
  rules: string[];
  probabilityHref: string;
  recordsHref: string;
  backHref: string;
};
```

- [ ] **Step 2: Add centralized mock data and asset paths**

Create `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`:

```ts
import type { SupplyDrawPoolPreview } from "./types";

export const supplyDrawPoolAssetPaths = {
  logo: "/logo.png",
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  drawPool: {
    capsuleBed: "/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp",
    guideMascot: "/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp",
    wristband: "/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp",
    runningShoe: "/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp",
  },
  rewardIcons: {
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    coins: "/gamification/rewards/icons/coins_120.png",
    exp: "/gamification/rewards/icons/small_boost_coupon.png",
    coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
    social: "/gamification/rewards/icons/team_broadcast_coupon.png",
  },
} as const;

export const supplyDrawPoolMock: SupplyDrawPoolPreview = {
  topBar: {
    resources: [
      { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
      { id: "coins", label: "银子", value: "2,450", icon: "◎" },
    ],
    closeHref: "/ui-lab/supply-dashboard",
  },
  wallet: {
    ticketIcon: supplyDrawPoolAssetPaths.rewardIcons.ticket,
    ticketBalance: 18,
    dailyEarned: 18,
    dailyLimit: 30,
    helper: "今日获取上限：18/30 张",
    actions: [
      { id: "more-tickets", label: "获取更多抽奖券", tone: "primary" },
      { id: "tasks", label: "前往任务", tone: "secondary" },
    ],
  },
  guide: {
    mascotImage: supplyDrawPoolAssetPaths.drawPool.guideMascot,
    message: "完成任务获取抽奖券，抽取道具、效果或补给券！",
    actionLabel: "去完成",
  },
  poolRates: [
    { rarity: "SSR", percent: 3, tone: "ssr" },
    { rarity: "SR", percent: 17, tone: "sr" },
    { rarity: "R", percent: 35, tone: "r" },
    { rarity: "N", percent: 45, tone: "n" },
  ],
  machine: {
    title: "补给抽卡机",
    capsuleBedImage: supplyDrawPoolAssetPaths.drawPool.capsuleBed,
    emblemImage: supplyDrawPoolAssetPaths.logo,
    skipAnimation: false,
    actions: [
      { id: "single", label: "单抽 x1", drawCount: 1, costTicket: 1, tone: "single" },
      { id: "ten", label: "十连 x10", drawCount: 10, costTicket: 10, tone: "ten", guaranteeLabel: "必出 SR 或以上" },
    ],
  },
  pity: {
    remainingDraws: 22,
    guaranteeLabel: "SR 或以上",
    current: 48,
    target: 70,
    rewardImage: supplyDrawPoolAssetPaths.rewardIcons.ticket,
  },
  recentDrops: [
    { id: "coins-200", rarity: "SSR", name: "银子", quantityLabel: "x200", image: supplyDrawPoolAssetPaths.rewardIcons.coins },
    { id: "wristband", rarity: "SR", name: "运动护腕", quantityLabel: "x6", image: supplyDrawPoolAssetPaths.drawPool.wristband },
    { id: "exp-card", rarity: "R", name: "经验加成券", quantityLabel: "x2", image: supplyDrawPoolAssetPaths.rewardIcons.exp },
    { id: "coffee", rarity: "R", name: "咖啡兑换券", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.rewardIcons.coffee },
    { id: "running-shoe", rarity: "SR", name: "疾风跑鞋", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.drawPool.runningShoe },
    { id: "social", rarity: "R", name: "社交互动券", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.rewardIcons.social },
  ],
  rules: [
    "消耗抽奖券进行抽取，随机获得道具、效果或补给券。",
    "十连抽必出 SR 或以上奖励。",
    "抽奖券可通过完成任务获得。",
  ],
  probabilityHref: "/docs?tab=rules#supply-station-probability",
  recordsHref: "/ui-lab/supply-dashboard/task-record",
  backHref: "/ui-lab/supply-dashboard",
};
```

- [ ] **Step 3: Add the mock data contract test**

Create `__tests__/supply-draw-pool-mock-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

describe("supply draw pool mock data", () => {
  it("covers the static draw-pool state required by the spec", () => {
    expect(supplyDrawPoolMock.topBar.resources.map((resource) => resource.value)).toEqual(["18", "2,450"]);
    expect(supplyDrawPoolMock.wallet.ticketBalance).toBe(18);
    expect(supplyDrawPoolMock.wallet.dailyEarned).toBe(18);
    expect(supplyDrawPoolMock.wallet.dailyLimit).toBe(30);
    expect(supplyDrawPoolMock.machine.actions.map((action) => action.costTicket)).toEqual([1, 10]);
    expect(supplyDrawPoolMock.machine.actions.find((action) => action.id === "ten")?.guaranteeLabel).toBe(
      "必出 SR 或以上",
    );
    expect(supplyDrawPoolMock.pity).toMatchObject({
      remainingDraws: 22,
      guaranteeLabel: "SR 或以上",
      current: 48,
      target: 70,
    });
    expect(supplyDrawPoolMock.poolRates.map((rate) => `${rate.rarity}:${rate.percent}`)).toEqual([
      "SSR:3",
      "SR:17",
      "R:35",
      "N:45",
    ]);
    expect(supplyDrawPoolMock.rules).toHaveLength(3);
  });

  it("models the recent drops and isolates draw-pool-specific media", () => {
    expect(supplyDrawPoolMock.recentDrops).toHaveLength(6);
    expect(supplyDrawPoolMock.recentDrops.map((drop) => drop.name)).toEqual([
      "银子",
      "运动护腕",
      "经验加成券",
      "咖啡兑换券",
      "疾风跑鞋",
      "社交互动券",
    ]);
    expect(supplyDrawPoolMock.recentDrops.map((drop) => drop.rarity)).toEqual(["SSR", "SR", "R", "R", "SR", "R"]);
    expect(Object.values(supplyDrawPoolAssetPaths.drawPool).every((path) => path.startsWith("/assets/home-scenes/supply/draw-pool/"))).toBe(true);
    expect(supplyDrawPoolAssetPaths.rewardIcons.ticket).toBe("/gamification/rewards/icons/task_reroll_coupon.png");
    expect(supplyDrawPoolAssetPaths.rewardIcons.coffee).toBe("/gamification/rewards/icons/luckin_coffee_coupon.png");
  });
});
```

- [ ] **Step 4: Run the mock data test**

Run:

```bash
npm test -- __tests__/supply-draw-pool-mock-data.test.ts
```

Expected: PASS after the types and mock data files are present.

## Task 3: Produce And Validate Draw Pool Media Assets

**Files:**
- Create directory: `public/assets/home-scenes/supply/draw-pool/`
- Create final assets:
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp`
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp`
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp`
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp`
- Create: `__tests__/supply-draw-pool-assets.test.ts`

- [ ] **Step 1: Add the asset contract test**

Create `__tests__/supply-draw-pool-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { supplyDrawPoolAssetPaths } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

const requiredDrawPoolAssets = [
  ["draw-pool-capsule-bed.webp", 280 * 1024],
  ["draw-pool-guide-mascot.webp", 160 * 1024],
  ["draw-pool-wristband.webp", 90 * 1024],
  ["draw-pool-running-shoe.webp", 90 * 1024],
] as const;

function publicPath(src: string) {
  return `public${src}`;
}

describe("supply draw pool static assets", () => {
  it("ships required final draw-pool assets within size budgets", () => {
    for (const [fileName, maxBytes] of requiredDrawPoolAssets) {
      const path = `public/assets/home-scenes/supply/draw-pool/${fileName}`;
      expect(existsSync(path), `${path} should exist`).toBe(true);
      expect(statSync(path).size, `${path} should fit budget`).toBeLessThanOrEqual(maxBytes);
    }
  });

  it("references existing reusable dashboard and reward assets", () => {
    expect(existsSync(publicPath(supplyDrawPoolAssetPaths.background))).toBe(true);
    expect(existsSync(publicPath(supplyDrawPoolAssetPaths.logo))).toBe(true);

    for (const src of Object.values(supplyDrawPoolAssetPaths.rewardIcons)) {
      expect(existsSync(publicPath(src)), `${src} should exist`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-draw-pool-assets.test.ts
```

Expected: FAIL because the four draw-pool-specific assets do not exist yet.

- [ ] **Step 3: Generate the capsule bed asset**

Use the `imagegen` skill to generate a transparent or easily masked prop with this intent:

```text
Pixel-art gacha capsule pile for a fitness game lottery machine, many glossy capsule balls in yellow, blue, purple, teal, pink, and orange, some capsules showing tiny ticket, EXP, dumbbell, bottle, heart, and coin symbols, front-facing 3/4 arcade machine glass insert, no readable text, transparent background, crisp black outlines, high contrast, playful brutalist game UI style.
```

Process the final image to `public/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp` at roughly `1000 x 420`, with file size `<= 280 KB`.

- [ ] **Step 4: Generate or reuse the guide mascot**

First test `public/assets/home-scenes/supply/dashboard/niuma-hero-clean.webp` inside a narrow left guide card. If it does not read like the prototype, use `imagegen` with this intent:

```text
Transparent pixel-art cow mascot fitness coach for a Chinese fitness check-in game, short stocky cow character wearing a yellow headband and black GYM shirt, holding one dumbbell, cheerful expression, thick black outline, no background, no text, front-facing, suitable for small UI helper card.
```

Save the accepted final asset as `public/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp`, height around `380 px`, file size `<= 160 KB`.

- [ ] **Step 5: Generate reward icons for wristband and running shoe**

Use two separate `imagegen` calls:

```text
Transparent pixel-art green sports wristband reward icon, thick black outline, glossy game item style, no text, centered object, suitable for 320 x 320 inventory card.
```

```text
Transparent pixel-art yellow running shoe reward icon with black sole and small lightning detail, thick black outline, glossy game item style, no text, centered object, suitable for 320 x 320 inventory card.
```

Save final compressed assets:

```text
public/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp
public/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp
```

Each file must be `<= 90 KB`.

- [ ] **Step 6: Run the asset test again**

Run:

```bash
npm test -- __tests__/supply-draw-pool-assets.test.ts
```

Expected: PASS.

## Task 4: Build The Static Draw Pool Scene

**Files:**
- Create: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Create: `__tests__/supply-draw-pool-scene.test.tsx`

- [ ] **Step 1: Add the scene DOM contract test**

Create `__tests__/supply-draw-pool-scene.test.tsx`:

```tsx
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

  it("renders the core draw-pool surfaces from the prototype", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-scene")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-left-rail")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-machine")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-right-rail")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent")).not.toBeNull();
    expect(container.querySelector("a.supply-draw-pool-close")?.getAttribute("href")).toBe("/ui-lab/supply-dashboard");
    expect(container.querySelector("a.supply-draw-pool-back")?.getAttribute("href")).toBe("/ui-lab/supply-dashboard");
    expect(container.textContent).toContain("补给抽卡机");
    expect(container.textContent).toContain("当前拥有");
    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("18 张");
    expect(container.textContent).toContain("今日获取上限：18/30 张");
    expect(container.textContent).toContain("单抽 x1");
    expect(container.textContent).toContain("十连 x10");
    expect(container.textContent).toContain("必出 SR 或以上");
    expect(container.textContent).toContain("保底进度");
    expect(container.textContent).toContain("48/70");
    expect(container.textContent).toContain("最近掉落");
    expect(container.querySelectorAll("[data-testid='supply-draw-pool-drop-card']")).toHaveLength(6);
  });

  it("uses reusable reward icons and draw-pool-specific media", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDrawPoolAssetPaths.logo,
        supplyDrawPoolAssetPaths.drawPool.capsuleBed,
        supplyDrawPoolAssetPaths.drawPool.guideMascot,
        supplyDrawPoolAssetPaths.drawPool.wristband,
        supplyDrawPoolAssetPaths.drawPool.runningShoe,
        supplyDrawPoolAssetPaths.rewardIcons.ticket,
        supplyDrawPoolAssetPaths.rewardIcons.coins,
        supplyDrawPoolAssetPaths.rewardIcons.exp,
        supplyDrawPoolAssetPaths.rewardIcons.coffee,
        supplyDrawPoolAssetPaths.rewardIcons.social,
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-draw-pool-scene.test.tsx
```

Expected: FAIL because `SupplyDrawPoolScene.tsx` does not exist yet.

- [ ] **Step 3: Add `SupplyDrawPoolScene.tsx`**

Create `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx` with these component boundaries and class names:

```tsx
import Image from "next/image";
import Link from "next/link";
import { supplyDrawPoolAssetPaths } from "./mock-data";
import type {
  SupplyDrawPoolMachineAction,
  SupplyDrawPoolPreview,
  SupplyDrawPoolRate,
  SupplyDrawPoolRecentDrop,
  SupplyDrawPoolResource,
} from "./types";

function ResourcePill({ resource }: { resource: SupplyDrawPoolResource }) {
  return (
    <div className="supply-draw-pool-resource-pill">
      <span aria-hidden="true">{resource.icon}</span>
      <em>{resource.label}</em>
      <strong>{resource.value}</strong>
      <b aria-hidden="true">+</b>
    </div>
  );
}

function DrawPoolTopBar({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <header className="supply-draw-pool-topbar">
      <div className="supply-draw-pool-brand">
        <Image alt="" height={56} src={supplyDrawPoolAssetPaths.logo} unoptimized width={56} />
        <strong>牛马补给站</strong>
      </div>
      <div className="supply-draw-pool-top-resources" aria-label="资源状态">
        {data.topBar.resources.map((resource) => (
          <ResourcePill key={resource.id} resource={resource} />
        ))}
      </div>
      <Link className="supply-draw-pool-close" href={data.topBar.closeHref} aria-label="返回大厅">
        ×
      </Link>
    </header>
  );
}

function TicketWalletPanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <section className="supply-draw-pool-wallet" aria-label="当前拥有">
      <h2>当前拥有</h2>
      <div className="supply-draw-pool-ticket-count">
        <Image alt="" height={96} src={data.wallet.ticketIcon} unoptimized width={96} />
        <p>
          <span>抽奖券</span>
          <strong>{data.wallet.ticketBalance}</strong>
          <em>张</em>
        </p>
      </div>
      <p className="supply-draw-pool-wallet-helper">{data.wallet.helper}</p>
      <div className="supply-draw-pool-wallet-actions">
        {data.wallet.actions.map((action) => (
          <button className={`supply-draw-pool-wallet-action--${action.tone}`} key={action.id} type="button">
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function DrawGuidePanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <section className="supply-draw-pool-guide" aria-label="抽卡提示">
      <Image alt="牛马健身教练" height={190} src={data.guide.mascotImage} unoptimized width={190} />
      <div>
        <p>{data.guide.message}</p>
        <button type="button">{data.guide.actionLabel}</button>
      </div>
    </section>
  );
}

function PoolRateRow({ rate }: { rate: SupplyDrawPoolRate }) {
  return (
    <li className={`supply-draw-pool-rate supply-draw-pool-rate--${rate.tone}`}>
      <strong>{rate.rarity}</strong>
      <span>
        <i style={{ width: `${rate.percent}%` }} />
      </span>
      <em>{rate.percent}%</em>
    </li>
  );
}

function PoolPreviewPanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <section className="supply-draw-pool-rates" aria-label="奖池预览">
      <h2>奖池预览</h2>
      <ol>
        {data.poolRates.map((rate) => (
          <PoolRateRow key={rate.rarity} rate={rate} />
        ))}
      </ol>
    </section>
  );
}

function DrawMachineActionButton({ action }: { action: SupplyDrawPoolMachineAction }) {
  return (
    <button className={`supply-draw-pool-action supply-draw-pool-action--${action.tone}`} type="button">
      {action.guaranteeLabel ? <span>{action.guaranteeLabel}</span> : null}
      <strong>{action.label}</strong>
      <em>券 x{action.costTicket}</em>
    </button>
  );
}

function DrawMachineStage({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <section className="supply-draw-pool-machine" aria-label="补给抽卡机">
      <div className="supply-draw-pool-machine-title">
        <span aria-hidden="true">★</span>
        <h1>{data.machine.title}</h1>
        <span aria-hidden="true">★</span>
      </div>
      <div className="supply-draw-pool-machine-window">
        <Image
          alt=""
          className="supply-draw-pool-machine-emblem"
          height={180}
          src={data.machine.emblemImage}
          unoptimized
          width={180}
        />
        <Image
          alt="抽卡机胶囊球"
          className="supply-draw-pool-capsules"
          height={420}
          priority
          src={data.machine.capsuleBedImage}
          unoptimized
          width={1000}
        />
      </div>
      <div className="supply-draw-pool-machine-controls">
        {data.machine.actions.map((action) => (
          <DrawMachineActionButton action={action} key={action.id} />
        ))}
      </div>
      <label className="supply-draw-pool-skip-toggle">
        <input defaultChecked={data.machine.skipAnimation} type="checkbox" />
        <span>跳过抽奖动画</span>
      </label>
    </section>
  );
}

function DrawInfoRail({ data }: { data: SupplyDrawPoolPreview }) {
  const progress = Math.round((data.pity.current / data.pity.target) * 100);

  return (
    <aside className="supply-draw-pool-right-rail">
      <Link className="supply-draw-pool-probability" href={data.probabilityHref}>
        <span aria-hidden="true">▥</span>
        概率公示
      </Link>
      <section className="supply-draw-pool-pity" aria-label="保底进度">
        <h2>保底进度</h2>
        <p>
          再抽 <strong>{data.pity.remainingDraws}</strong> 次
          <span>必得 {data.pity.guaranteeLabel}</span>
        </p>
        <Image alt="" height={96} src={data.pity.rewardImage} unoptimized width={96} />
        <div className="supply-draw-pool-pity-bar">
          <span style={{ width: `${progress}%` }} />
          <strong>
            {data.pity.current}/{data.pity.target}
          </strong>
        </div>
      </section>
      <section className="supply-draw-pool-rules" aria-label="查看规则">
        <h2>查看规则</h2>
        <ol>
          {data.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <Link href={data.probabilityHref}>查看规则</Link>
      </section>
    </aside>
  );
}

function RecentDropCard({ drop }: { drop: SupplyDrawPoolRecentDrop }) {
  return (
    <article
      className={`supply-draw-pool-drop supply-draw-pool-drop--${drop.rarity.toLowerCase()}`}
      data-testid="supply-draw-pool-drop-card"
    >
      <span>{drop.rarity}</span>
      <Image alt="" height={112} src={drop.image} unoptimized width={112} />
      <strong>{drop.quantityLabel}</strong>
      <p>{drop.name}</p>
    </article>
  );
}

function RecentDropsPanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <section className="supply-draw-pool-recent" aria-label="最近掉落">
      <header>
        <h2>最近掉落</h2>
        <Link href={data.recordsHref}>全部记录 ›</Link>
      </header>
      <div className="supply-draw-pool-drop-list">
        {data.recentDrops.map((drop) => (
          <RecentDropCard drop={drop} key={drop.id} />
        ))}
      </div>
    </section>
  );
}

export function SupplyDrawPoolScene({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <main className="supply-draw-pool-scene" aria-label="抽卡池 UI Lab">
      <div className="supply-draw-pool-background" aria-hidden="true">
        <Image alt="" fill priority sizes="100vw" src={supplyDrawPoolAssetPaths.background} unoptimized />
      </div>
      <div className="supply-draw-pool-content">
        <DrawPoolTopBar data={data} />
        <div className="supply-draw-pool-layout">
          <aside className="supply-draw-pool-left-rail">
            <TicketWalletPanel data={data} />
            <DrawGuidePanel data={data} />
            <PoolPreviewPanel data={data} />
          </aside>
          <div className="supply-draw-pool-center">
            <DrawMachineStage data={data} />
            <RecentDropsPanel data={data} />
          </div>
          <DrawInfoRail data={data} />
        </div>
        <Link className="supply-draw-pool-back" href={data.backHref}>
          <span aria-hidden="true">⌂</span>
          返回大厅
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run route, mock data, asset, and scene tests**

Run:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx
```

Expected: PASS except CSS-related visual coverage, which is added in Task 5.

## Task 5: Add Isolated Draw Pool CSS And Visual QA Hooks

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/supply-draw-pool-scene-css.test.ts`

- [ ] **Step 1: Add the CSS contract test**

Create `__tests__/supply-draw-pool-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply draw pool scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated draw-pool scene layers and machine styles", () => {
    expect(css).toContain(".supply-draw-pool-scene");
    expect(css).toContain(".supply-draw-pool-background");
    expect(css).toContain(".supply-draw-pool-content");
    expect(css).toContain(".supply-draw-pool-topbar");
    expect(css).toContain(".supply-draw-pool-left-rail");
    expect(css).toContain(".supply-draw-pool-machine");
    expect(css).toContain(".supply-draw-pool-machine-window");
    expect(css).toContain(".supply-draw-pool-right-rail");
    expect(css).toContain(".supply-draw-pool-recent");
    expect(css).toContain("border: 4px solid");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1200px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: FAIL because draw-pool CSS has not been added.

- [ ] **Step 3: Add the draw-pool CSS block**

Append a draw-pool section to `app/globals.css` near the existing supply UI lab styles. The block must define these selectors and visual responsibilities:

```css
.supply-draw-pool-scene {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #111827;
  color: #111827;
}

.supply-draw-pool-background {
  position: absolute;
  inset: 0;
  filter: brightness(0.42) saturate(0.9);
}

.supply-draw-pool-background::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.2), rgba(17, 24, 39, 0.72));
}

.supply-draw-pool-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(0.55rem, 1vw, 0.9rem);
  min-height: 100vh;
  padding: clamp(0.5rem, 1vw, 0.8rem);
}

.supply-draw-pool-topbar,
.supply-draw-pool-wallet,
.supply-draw-pool-guide,
.supply-draw-pool-rates,
.supply-draw-pool-machine,
.supply-draw-pool-pity,
.supply-draw-pool-rules,
.supply-draw-pool-recent {
  border: 4px solid #111827;
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.55);
}
```

Continue the same block with these additional rules:

```css
.supply-draw-pool-topbar {
  display: grid;
  grid-template-columns: minmax(14rem, 22rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 4.25rem;
  border-color: #050505;
  background: linear-gradient(180deg, #8b8b8b, #3f3f46);
  color: #f8fafc;
}

.supply-draw-pool-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  padding: 0.35rem 1.25rem 0.35rem 0.75rem;
  clip-path: polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%);
  background: #facc15;
  color: #111827;
  font-size: clamp(1.45rem, 2.3vw, 2.25rem);
  font-weight: 1000;
}

.supply-draw-pool-brand img {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
}

.supply-draw-pool-top-resources {
  display: flex;
  justify-content: flex-end;
  gap: 0.9rem;
  min-width: 0;
}

.supply-draw-pool-resource-pill {
  display: grid;
  grid-template-columns: auto auto minmax(4rem, auto) auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.85rem;
  padding: 0.25rem 0.45rem 0.25rem 0.75rem;
  border: 3px solid #111827;
  background: linear-gradient(180deg, #27272a, #111827);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.12), 0 4px 0 rgba(0, 0, 0, 0.35);
  color: #f8fafc;
}

.supply-draw-pool-resource-pill span,
.supply-draw-pool-resource-pill b {
  display: grid;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 2px solid #111827;
  background: #facc15;
  color: #111827;
  font-weight: 1000;
}

.supply-draw-pool-resource-pill em {
  font-style: normal;
  font-weight: 900;
}

.supply-draw-pool-resource-pill strong {
  text-align: right;
  font-size: 1.25rem;
  font-weight: 1000;
}

.supply-draw-pool-close {
  display: grid;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border: 4px solid #111827;
  background: #facc15;
  color: #111827;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.45);
  font-size: 2.6rem;
  font-weight: 1000;
  line-height: 1;
  text-decoration: none;
}

.supply-draw-pool-layout {
  display: grid;
  grid-template-columns: minmax(14rem, 18%) minmax(0, 1fr) minmax(14rem, 18%);
  gap: clamp(0.65rem, 1vw, 0.95rem);
  min-height: 0;
}

.supply-draw-pool-left-rail,
.supply-draw-pool-right-rail,
.supply-draw-pool-center {
  display: grid;
  gap: clamp(0.65rem, 1vw, 0.95rem);
  min-width: 0;
  min-height: 0;
}

.supply-draw-pool-left-rail,
.supply-draw-pool-right-rail {
  align-content: start;
}

.supply-draw-pool-wallet {
  position: relative;
  display: grid;
  gap: 0.8rem;
  padding: 1.45rem 1rem 1rem;
  background: #f8f3e7;
}

.supply-draw-pool-wallet h2 {
  position: absolute;
  top: -1.05rem;
  left: 1rem;
  margin: 0;
  padding: 0.35rem 1.35rem;
  border: 3px solid #111827;
  background: #facc15;
  font-size: 1rem;
  font-weight: 1000;
}

.supply-draw-pool-ticket-count {
  display: grid;
  grid-template-columns: 5.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.85rem;
}

.supply-draw-pool-ticket-count img {
  width: 5.25rem;
  height: 5.25rem;
  object-fit: contain;
  border: 2px solid rgba(17, 24, 39, 0.18);
  background: #fffef8;
}

.supply-draw-pool-ticket-count p {
  margin: 0;
}

.supply-draw-pool-ticket-count span,
.supply-draw-pool-ticket-count em {
  display: block;
  font-style: normal;
  font-weight: 900;
}

.supply-draw-pool-ticket-count strong {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 1000;
  line-height: 1;
}

.supply-draw-pool-wallet-helper {
  margin: 0;
  padding-top: 0.75rem;
  border-top: 2px dashed rgba(17, 24, 39, 0.25);
  color: #27272a;
  font-size: 0.95rem;
  font-weight: 900;
}

.supply-draw-pool-wallet-actions {
  display: grid;
  gap: 0.65rem;
}

.supply-draw-pool-wallet-actions button,
.supply-draw-pool-guide button,
.supply-draw-pool-rules a,
.supply-draw-pool-back {
  border: 3px solid #111827;
  box-shadow: 0 4px 0 #111827;
  font-weight: 1000;
}

.supply-draw-pool-wallet-action--primary,
.supply-draw-pool-guide button,
.supply-draw-pool-rules a,
.supply-draw-pool-back {
  background: #facc15;
  color: #111827;
}

.supply-draw-pool-wallet-action--secondary {
  background: #f8fafc;
  color: #111827;
}

.supply-draw-pool-guide {
  display: grid;
  grid-template-columns: minmax(5.5rem, 7rem) minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem;
  background: #facc15;
}

.supply-draw-pool-guide img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.supply-draw-pool-guide div {
  display: grid;
  gap: 0.65rem;
}

.supply-draw-pool-guide p {
  margin: 0;
  padding: 0.65rem;
  border: 3px solid #111827;
  background: #fffef8;
  font-size: 0.88rem;
  font-weight: 900;
}

.supply-draw-pool-rates {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
  background: #18181b;
  color: #f8fafc;
}

.supply-draw-pool-rates h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 1000;
}

.supply-draw-pool-rates ol {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.supply-draw-pool-rate {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) 3rem;
  align-items: center;
  gap: 0.5rem;
}

.supply-draw-pool-rate span {
  height: 1.35rem;
  overflow: hidden;
  border: 2px solid #111827;
  background: #3f3f46;
}

.supply-draw-pool-rate i {
  display: block;
  height: 100%;
}

.supply-draw-pool-rate--ssr i { background: #f59e0b; }
.supply-draw-pool-rate--sr i { background: #a855f7; }
.supply-draw-pool-rate--r i { background: #eab308; }
.supply-draw-pool-rate--n i { background: #94a3b8; }

.supply-draw-pool-machine {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(17rem, 1fr) auto auto;
  gap: 0.7rem;
  min-height: min(59vh, 38rem);
  padding: clamp(0.75rem, 1.3vw, 1.2rem);
  border-color: #111827;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.24), transparent 18% 82%, rgba(0, 0, 0, 0.18)),
    #e83f69;
}

.supply-draw-pool-machine::before,
.supply-draw-pool-machine::after {
  position: absolute;
  top: 18%;
  bottom: 18%;
  width: 1.2rem;
  border: 3px solid #111827;
  background: repeating-linear-gradient(180deg, #fef3c7 0 1.25rem, #fb7185 1.25rem 1.55rem);
  content: "";
}

.supply-draw-pool-machine::before { left: 0.55rem; }
.supply-draw-pool-machine::after { right: 0.55rem; }

.supply-draw-pool-machine-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-inline: clamp(2rem, 8vw, 7rem);
  padding: 0.45rem 1rem;
  border: 4px solid #7f1d1d;
  background: linear-gradient(180deg, #fb7185, #b91c1c);
  color: #fff7ed;
  text-shadow: 0 3px 0 #7f1d1d;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), 0 5px 0 rgba(0, 0, 0, 0.38);
}

.supply-draw-pool-machine-title h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 1000;
  letter-spacing: 0;
}

.supply-draw-pool-machine-window {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 17rem;
  overflow: hidden;
  border: 5px solid #111827;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.42), transparent 18% 68%, rgba(255, 255, 255, 0.22)),
    rgba(15, 23, 42, 0.86);
  box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.1);
}

.supply-draw-pool-machine-emblem {
  position: absolute;
  top: 10%;
  width: clamp(7rem, 14vw, 11rem);
  height: auto;
  opacity: 0.9;
  filter: drop-shadow(0 0 1rem rgba(250, 204, 21, 0.85));
}

.supply-draw-pool-capsules {
  position: absolute;
  right: 0;
  bottom: -0.5rem;
  left: 0;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.supply-draw-pool-machine-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 2rem);
  padding-inline: clamp(1rem, 4vw, 4rem);
}

.supply-draw-pool-action {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 5.6rem;
  border: 4px solid #111827;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), 0 6px 0 #111827;
  font-weight: 1000;
}

.supply-draw-pool-action strong {
  font-size: clamp(1.55rem, 2.5vw, 2.2rem);
}

.supply-draw-pool-action em {
  font-style: normal;
  font-size: 1.1rem;
}

.supply-draw-pool-action span {
  position: absolute;
  top: -1.05rem;
  right: 1rem;
  padding: 0.25rem 0.65rem;
  border: 2px solid #fff7ed;
  background: #e11d48;
  color: #fff7ed;
  font-size: 0.85rem;
}

.supply-draw-pool-action--single { background: #38bdf8; }
.supply-draw-pool-action--ten { background: #facc15; }

.supply-draw-pool-skip-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  color: #f8fafc;
  font-weight: 900;
}

.supply-draw-pool-right-rail {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.supply-draw-pool-probability {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 3.5rem;
  border: 4px solid #94a3b8;
  background: #18181b;
  color: #f8fafc;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.5);
  font-size: 1.15rem;
  font-weight: 1000;
  text-decoration: none;
}

.supply-draw-pool-pity,
.supply-draw-pool-rules {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  background: #fffef8;
}

.supply-draw-pool-pity h2,
.supply-draw-pool-rules h2,
.supply-draw-pool-recent h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 1000;
}

.supply-draw-pool-pity p {
  margin: 0;
  padding: 0.7rem;
  border: 2px dashed rgba(17, 24, 39, 0.18);
  text-align: center;
  font-weight: 900;
}

.supply-draw-pool-pity p strong {
  font-size: 1.35rem;
}

.supply-draw-pool-pity p span {
  display: block;
}

.supply-draw-pool-pity img {
  justify-self: center;
  width: 5.5rem;
  height: 5.5rem;
  object-fit: contain;
}

.supply-draw-pool-pity-bar {
  position: relative;
  height: 2rem;
  overflow: hidden;
  border: 3px solid #111827;
  background: #27272a;
}

.supply-draw-pool-pity-bar span {
  position: absolute;
  inset-block: 0;
  left: 0;
  background: #facc15;
}

.supply-draw-pool-pity-bar strong {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  font-weight: 1000;
}

.supply-draw-pool-rules ol {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.95rem;
  font-weight: 850;
}

.supply-draw-pool-rules a {
  display: grid;
  place-items: center;
  min-height: 2.8rem;
  text-decoration: none;
}

.supply-draw-pool-recent {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: #fffef8;
}

.supply-draw-pool-recent header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.supply-draw-pool-recent a {
  color: #111827;
  font-weight: 900;
  text-decoration: none;
}

.supply-draw-pool-drop-list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.65rem;
}

.supply-draw-pool-drop {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(5rem, 1fr) auto;
  place-items: center;
  min-height: 10.4rem;
  overflow: hidden;
  border: 3px solid #111827;
  background: #27272a;
  color: #f8fafc;
}

.supply-draw-pool-drop > span {
  justify-self: start;
  margin: 0.35rem;
  padding: 0.15rem 0.35rem;
  border: 2px solid #111827;
  background: #facc15;
  color: #111827;
  font-weight: 1000;
}

.supply-draw-pool-drop img {
  width: min(5.5rem, 70%);
  height: auto;
  object-fit: contain;
}

.supply-draw-pool-drop strong {
  position: absolute;
  right: 0.45rem;
  bottom: 2rem;
  font-size: 1.1rem;
  text-shadow: 0 2px 0 #111827;
}

.supply-draw-pool-drop p {
  width: 100%;
  margin: 0;
  padding: 0.45rem;
  background: rgba(17, 24, 39, 0.86);
  text-align: center;
  font-size: 0.95rem;
  font-weight: 900;
}

.supply-draw-pool-drop--ssr { border-color: #f59e0b; background: #4a2f08; }
.supply-draw-pool-drop--sr { border-color: #a855f7; background: #2e164b; }
.supply-draw-pool-drop--r { border-color: #eab308; background: #3f3315; }
.supply-draw-pool-drop--n { border-color: #94a3b8; background: #1f2937; }

.supply-draw-pool-back {
  justify-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-width: min(19rem, 86vw);
  min-height: 3.6rem;
  color: #111827;
  font-size: 1.55rem;
  text-decoration: none;
}
```

Add responsive blocks:

```css
@media (max-width: 1200px) {
  .supply-draw-pool-layout {
    grid-template-columns: minmax(0, 1fr);
    overflow: visible;
  }

  .supply-draw-pool-left-rail,
  .supply-draw-pool-right-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .supply-draw-pool-content {
    min-height: 100vh;
    overflow-y: auto;
  }

  .supply-draw-pool-topbar,
  .supply-draw-pool-machine-controls,
  .supply-draw-pool-left-rail,
  .supply-draw-pool-right-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .supply-draw-pool-drop-list {
    overflow-x: auto;
    grid-auto-columns: minmax(8rem, 42vw);
  }
}

@media (prefers-reduced-motion: reduce) {
  .supply-draw-pool-scene *,
  .supply-draw-pool-scene *::before,
  .supply-draw-pool-scene *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run the full draw-pool test set**

Run:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
```

Expected: PASS.

## Task 6: Browser QA And Final Verification

**Files:**
- Review only:
  - `app/ui-lab/supply-dashboard/draw-pool/page.tsx`
  - `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - `components/gamification/ui-lab/supply-draw-pool/*`
  - `app/globals.css`
  - `__tests__/supply-draw-pool-*`
  - `public/assets/home-scenes/supply/draw-pool/*`

- [ ] **Step 1: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Expected: local Next.js dev server starts and serves the UI lab route.

- [ ] **Step 3: Desktop visual QA**

Open:

```text
http://127.0.0.1:3000/ui-lab/supply-dashboard/draw-pool
```

Set viewport to `1536 x 1024`. Verify:

- Top HUD, left wallet, center pink draw machine, right pity/rules, recent drops, and bottom return button are visible in the first viewport.
- The scene does not use `design/ui-assets/抽卡池.png` as a background.
- The central machine is visually dominant and not squeezed by side panels.
- Text does not overlap in buttons, resource capsules, pity panel, or recent drop cards.
- Images render without white boxes, black matte edges, distortion, or missing sources.

- [ ] **Step 4: Mobile visual QA**

Set viewport to `390 x 844`. Verify:

- Page scrolls vertically without horizontal document overflow.
- Top resources remain readable.
- Machine, draw actions, wallet, pity, recent drops, and rules remain in a sensible reading order.
- Recent drop cards can scroll horizontally or wrap without clipping names and quantities.
- Return path to Dashboard is visible.

- [ ] **Step 5: Verify isolation by search**

Run:

```bash
rg "SupplyDrawPoolScene|supply-draw-pool|/ui-lab/supply-dashboard/draw-pool" app components lib --glob '!app/ui-lab/supply-dashboard/draw-pool/page.tsx' --glob '!components/gamification/ui-lab/supply-draw-pool/**' --glob '!components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx'
```

Expected: no production files reference `SupplyDrawPoolScene`, `supply-draw-pool`, or `/ui-lab/supply-dashboard/draw-pool`.

- [ ] **Step 6: Review diff**

Run:

```bash
git diff -- app/ui-lab/supply-dashboard/draw-pool/page.tsx components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx components/gamification/ui-lab/supply-draw-pool app/globals.css __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts docs/superpowers/specs/2026-05-13-supply-dashboard-draw-pool-static-scene-design.md docs/superpowers/plans/2026-05-13-supply-dashboard-draw-pool-static-scene-implementation.md
```

Expected: diff is limited to UI lab docs, draw-pool route/components/tests/assets, Dashboard UI-lab dock link, and draw-pool CSS.

## Completion Checklist

- [ ] `/ui-lab/supply-dashboard/draw-pool` route exists.
- [ ] Dashboard UI lab dock shows「抽卡池」and links to the route.
- [ ] `SupplyStation`, production navbar, `AppTab`, API routes, Prisma, and auth flow are unchanged.
- [ ] Static mock data contains the required prototype values: `18`, `2,450`, `18/30`, `48/70`, `22`, `3%`, `17%`, `35%`, `45%`.
- [ ] Draw-pool-specific assets are in `public/assets/home-scenes/supply/draw-pool/` and pass size budgets.
- [ ] Vitest draw-pool contract tests pass.
- [ ] `npm run lint` passes.
- [ ] Desktop and mobile browser QA pass.
