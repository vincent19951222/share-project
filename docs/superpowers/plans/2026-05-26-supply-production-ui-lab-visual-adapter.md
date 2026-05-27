# Supply Production UI Lab Visual Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the simplified production 牛马补给站 shell with the approved Supply UI Lab visual system and media assets while keeping the real production snapshot and mutation APIs.

**Architecture:** Keep `components/gamification/SupplyStation.tsx` as the production entry and keep `GET /api/gamification/supply/state` as the data source. Add production-safe adapters that map `SupplyStationProductionSnapshot` into the existing UI Lab scene data shapes, then update UI Lab scene components so production can pass real handlers instead of local mock interactions. Production must not import `mock-data.ts`; shared asset paths and static visual constants move into non-mock modules.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict mode, Tailwind/global CSS, Vitest/jsdom, Browser plugin QA against `http://127.0.0.1:3002`.

---

## Current Defect

The previous integration completed the production data/API work but rendered a simplified `supply-production-*` UI. The browser screenshot shows the production page does not use the media-rich UI Lab scene classes and assets such as:

- `supply-dashboard-scene`
- `supply-dashboard-background`
- `supply-dashboard-hero-stage`
- `/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp`
- `/assets/home-scenes/supply/dashboard/niuma-hero.webp`
- `/assets/home-scenes/supply/draw-pool/draw-pool-machine.png`
- `/assets/home-scenes/supply/shop/*`
- `/assets/home-scenes/supply/backpack/*`
- `/assets/home-scenes/supply/task-record/*`

## Locked Decisions

- Production still reads `SupplyStationProductionSnapshot`.
- Production still mutates through existing helpers in `lib/api.ts`.
- UI Lab routes remain static reference routes and must not call production APIs.
- Production code may import UI Lab scene components and production-safe UI Lab asset/data modules. Production code must not import UI Lab `mock-data.ts`.
- `team-goal` remains out of production.
- Existing business model decisions remain unchanged: `User.coins` displays as `银子`, EXP is real, shop purchases are real, backpack capacity displays `60`.
- The temporary simplified production CSS/classes are not the final target. They should be removed or left unused after the UI Lab adapter lands.

## File Structure

Create or modify these implementation units:

- Create: `components/gamification/production/supply-ui-lab-adapters.ts`
- Create: `components/gamification/ui-lab/supply-dashboard/assets.ts`
- Create: `components/gamification/ui-lab/supply-draw-pool/assets.ts`
- Create: `components/gamification/ui-lab/supply-backpack/assets.ts`
- Create: `components/gamification/ui-lab/supply-shop/assets.ts`
- Create: `components/gamification/ui-lab/supply-task-record/assets.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `components/gamification/production/SupplyDashboardPanel.tsx`
- Modify: `components/gamification/production/SupplyDrawPoolPanel.tsx`
- Modify: `components/gamification/production/SupplyBackpackPanel.tsx`
- Modify: `components/gamification/production/SupplyShopPanel.tsx`
- Modify: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/supply-production-isolation.test.ts`
- Modify: `__tests__/supply-production-shell.test.tsx`
- Create: `__tests__/supply-ui-lab-production-adapters.test.ts`
- Create: `__tests__/supply-production-visual-contract.test.tsx`

## Task 1: Production Visual Contract Test

**Files:**

- Create: `__tests__/supply-production-visual-contract.test.tsx`
- Modify: `__tests__/supply-production-isolation.test.ts`

- [x] **Step 1: Write the failing visual contract test**

Create `__tests__/supply-production-visual-contract.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyStationShell } from "@/components/gamification/production/SupplyStationShell";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 845 },
    ticket: { label: "抽奖券", value: 5 },
    backpack: { label: "背包", value: 17, maxValue: 60 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 50,
    level: 1,
    currentLevelExp: 50,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: {
          id: "a1",
          taskCardId: "movement_002",
          title: "屁股离线",
          description: "找一个理由离开座位走一小圈。",
          status: "pending",
          completedAt: null,
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: true,
          canReroll: true,
        },
      },
    ],
  },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 0,
      lifeTicketClaimable: false,
      ticketBalance: 5,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 5,
      tenDrawTopUpCoinCost: 200,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "还差 5 张券，可用 200 银子补齐十连。",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 17,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "背包为空",
    capacity: { usedSlots: 17, totalSlots: 60 },
  },
  shop: { products: [] },
  taskRecord: {
    dates: [{ key: "2026-05-26", label: "今天", dateLabel: "05/26", weekday: "周二" }],
    timeline: [],
  },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 0,
    teamWidePendingCount: 0,
    sent: [],
    received: [],
    teamWide: [],
    recentResponses: [],
    availableRecipients: [],
    message: "队友雷达可用。",
  },
  redemptions: { mine: [], adminQueue: [] },
} satisfies SupplyStationProductionSnapshot;

describe("production supply UI Lab visual contract", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/gamification/supply/state") {
          return new Response(JSON.stringify({ snapshot }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
      }),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the approved UI Lab dashboard scene in production", async () => {
    await act(async () => {
      root.render(<SupplyStationShell />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-background")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-production-shell")).toBeNull();
    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("845");
    expect(container.textContent).toContain("50/1000");
  });
});
```

- [x] **Step 2: Strengthen the isolation test**

In `__tests__/supply-production-isolation.test.ts`, replace the temporary style selector assertion with a production visual requirement:

```ts
const requiredProductionVisualTerms = [
  "SupplyDashboardScene",
  "SupplyDrawPoolScene",
  "SupplyBackpackScene",
  "SupplyShopScene",
  "SupplyTaskRecordScene",
  "toSupplyDashboardPreview",
  "toSupplyDrawPoolPreview",
  "toSupplyBackpackPreview",
  "toSupplyShopPreview",
  "toSupplyTaskRecordPreview",
];

it("production uses UI Lab visual scenes through production adapters", () => {
  const shell = readSource("components/gamification/production/SupplyStationShell.tsx");
  const adapters = readSource("components/gamification/production/supply-ui-lab-adapters.ts");

  for (const term of requiredProductionVisualTerms) {
    expect(`${shell}\n${adapters}`, `missing ${term}`).toContain(term);
  }
});
```

Keep these banned production terms:

```ts
"mock-data",
"team-goal",
"团队目标",
```

but remove the old `requiredProductionStyleSelectors` check because the final target is UI Lab classes, not `supply-production-*`.

- [x] **Step 3: Run the visual tests and verify they fail**

Run:

```bash
npm test -- __tests__/supply-production-visual-contract.test.tsx __tests__/supply-production-isolation.test.ts
```

Expected: FAIL because production still renders `supply-production-shell`, does not render `supply-dashboard-scene`, and `supply-ui-lab-adapters.ts` does not exist.

## Task 2: Extract UI Lab Asset Paths From Mock Data

**Files:**

- Create: `components/gamification/ui-lab/supply-dashboard/assets.ts`
- Create: `components/gamification/ui-lab/supply-draw-pool/assets.ts`
- Create: `components/gamification/ui-lab/supply-backpack/assets.ts`
- Create: `components/gamification/ui-lab/supply-shop/assets.ts`
- Create: `components/gamification/ui-lab/supply-task-record/assets.ts`
- Modify: UI Lab `mock-data.ts` files listed below
- Test: `__tests__/supply-production-isolation.test.ts`

- [x] **Step 1: Create production-safe asset modules**

Create `components/gamification/ui-lab/supply-dashboard/assets.ts`:

```ts
import { taskCardIllustrationById } from "../task-cards/task-card-art";

export const supplyDashboardAssetPaths = {
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  hero: "/assets/home-scenes/supply/dashboard/niuma-hero.webp",
  levelAvatar: "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
  dockBackpack: "/assets/home-scenes/supply/dashboard/dock-backpack.webp",
  dockSupplyMachine: "/assets/home-scenes/supply/dashboard/dock-supply-machine.webp",
  dockTaskRecord: "/assets/home-scenes/supply/dashboard/dock-task-record.webp",
  fallbackLogo: "/logo.png",
  taskCards: {
    hydration: taskCardIllustrationById.hydration_003,
    movement: taskCardIllustrationById.movement_004,
    social: taskCardIllustrationById.social_001,
    learning: taskCardIllustrationById.learning_005,
  },
  rewardIcons: {
    coin: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
  },
} as const;
```

Create `components/gamification/ui-lab/supply-draw-pool/assets.ts`:

```ts
export const supplyDrawPoolAssetPaths = {
  machine: "/assets/home-scenes/supply/draw-pool/draw-pool-machine.png",
  guideMascot: "/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp",
  capsuleBed: "/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp",
  runningShoe: "/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp",
  wristband: "/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp",
  buttonSingle: "/assets/home-scenes/supply/draw-pool/generated/draw-button-single.png",
  buttonTen: "/assets/home-scenes/supply/draw-pool/generated/draw-button-ten.png",
} as const;
```

Create `components/gamification/ui-lab/supply-backpack/assets.ts`:

```ts
export const supplyBackpackAssetPaths = {
  banana: "/assets/home-scenes/supply/backpack/backpack-banana.webp",
  dumbbell: "/assets/home-scenes/supply/backpack/backpack-dumbbell.webp",
  heart: "/assets/home-scenes/supply/backpack/backpack-heart.webp",
  riceBall: "/assets/home-scenes/supply/backpack/backpack-rice-ball.webp",
  seasonMedal: "/assets/home-scenes/supply/backpack/backpack-season-medal.webp",
  socialTicket: "/assets/home-scenes/supply/backpack/backpack-social-ticket.webp",
  speedShoes: "/assets/home-scenes/supply/backpack/backpack-speed-shoes.webp",
  sportsDrink: "/assets/home-scenes/supply/backpack/backpack-sports-drink.webp",
  staminaRing: "/assets/home-scenes/supply/backpack/backpack-stamina-ring.webp",
  studyGuide: "/assets/home-scenes/supply/backpack/backpack-study-guide.webp",
} as const;
```

Create `components/gamification/ui-lab/supply-shop/assets.ts`:

```ts
export const supplyShopAssetPaths = {
  titleBadge: "/assets/home-scenes/supply/shop/shop-title-badge.webp",
  avatarFrame: "/assets/home-scenes/supply/shop/shop-avatar-frame.webp",
  fitnessOutfit: "/assets/home-scenes/supply/shop/shop-fitness-outfit.webp",
  trainingLog: "/assets/home-scenes/supply/shop/shop-training-log.webp",
  energyBottle: "/assets/home-scenes/supply/shop/shop-energy-bottle.webp",
  lightMeal: "/assets/home-scenes/supply/shop/shop-light-meal.webp",
  learningPass: "/assets/home-scenes/supply/shop/shop-learning-pass.webp",
  categories: {
    all: "/assets/home-scenes/supply/shop/categories/category-all.png",
    boost: "/assets/home-scenes/supply/shop/categories/category-boost.png",
    protection: "/assets/home-scenes/supply/shop/categories/category-protection.png",
    real_world: "/assets/home-scenes/supply/shop/categories/category-real-world.png",
    social: "/assets/home-scenes/supply/shop/categories/category-social.png",
    task: "/assets/home-scenes/supply/shop/categories/category-task.png",
  },
} as const;
```

Create `components/gamification/ui-lab/supply-task-record/assets.ts`:

```ts
export const supplyTaskRecordAssetPaths = {
  menu: {
    today: "/assets/home-scenes/supply/task-record/menu/menu-today.png",
    draws: "/assets/home-scenes/supply/task-record/menu/menu-draws.png",
    redemptions: "/assets/home-scenes/supply/task-record/menu/menu-redemptions.png",
    radar: "/assets/home-scenes/supply/task-record/menu/menu-radar.png",
    rules: "/assets/home-scenes/supply/task-record/menu/menu-rules.png",
  },
  icons: {
    movement: "/assets/home-scenes/supply/task-record/icons/task-record-movement.webp",
    hydration: "/assets/home-scenes/supply/task-record/icons/task-record-hydration.webp",
    chat: "/assets/home-scenes/supply/task-record/icons/task-record-chat.webp",
    learning: "/assets/home-scenes/supply/task-record/icons/task-record-learning.webp",
    draw: "/assets/home-scenes/supply/task-record/icons/task-record-draw.webp",
    walk: "/assets/home-scenes/supply/task-record/icons/task-record-walk.webp",
  },
} as const;
```

- [x] **Step 2: Update UI Lab mock data imports**

In `components/gamification/ui-lab/supply-dashboard/mock-data.ts`, remove the inline `supplyDashboardAssetPaths` object and import it:

```ts
import { supplyDashboardAssetPaths } from "./assets";
```

Then export it for existing imports:

```ts
export { supplyDashboardAssetPaths };
```

Apply the same pattern to these files when they currently define asset paths inside mock data:

```ts
components/gamification/ui-lab/supply-draw-pool/mock-data.ts
components/gamification/ui-lab/supply-backpack/mock-data.ts
components/gamification/ui-lab/supply-shop/mock-data.ts
components/gamification/ui-lab/supply-task-record/mock-data.ts
```

For each file, import the matching `assets.ts` constant and re-export it under the existing name used by the scene.

- [x] **Step 3: Run isolation tests**

Run:

```bash
npm test -- __tests__/supply-production-isolation.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS for UI Lab static routes. Production visual adapter assertions may still fail until Task 3 and Task 5 land.

- [x] **Step 4: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/assets.ts components/gamification/ui-lab/supply-draw-pool/assets.ts components/gamification/ui-lab/supply-backpack/assets.ts components/gamification/ui-lab/supply-shop/assets.ts components/gamification/ui-lab/supply-task-record/assets.ts components/gamification/ui-lab/supply-dashboard/mock-data.ts components/gamification/ui-lab/supply-draw-pool/mock-data.ts components/gamification/ui-lab/supply-backpack/mock-data.ts components/gamification/ui-lab/supply-shop/mock-data.ts components/gamification/ui-lab/supply-task-record/mock-data.ts
git commit -m "refactor: extract supply ui lab asset paths"
```

## Task 3: Production Snapshot To UI Lab Scene Adapters

**Files:**

- Create: `components/gamification/production/supply-ui-lab-adapters.ts`
- Test: `__tests__/supply-ui-lab-production-adapters.test.ts`

- [x] **Step 1: Write adapter tests**

Create `__tests__/supply-ui-lab-production-adapters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  toSupplyBackpackPreview,
  toSupplyDashboardPreview,
  toSupplyDrawPoolPreview,
  toSupplyShopPreview,
  toSupplyTaskRecordPreview,
} from "@/components/gamification/production/supply-ui-lab-adapters";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 845 },
    ticket: { label: "抽奖券", value: 5 },
    backpack: { label: "背包", value: 17, maxValue: 60 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 50,
    level: 1,
    currentLevelExp: 50,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: {
          id: "a1",
          taskCardId: "movement_002",
          title: "屁股离线",
          description: "找一个理由离开座位走一小圈。",
          status: "completed",
          completedAt: "2026-05-26T14:37:34.211Z",
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: false,
          canReroll: false,
        },
      },
    ],
  },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 1,
      lifeTicketClaimable: false,
      ticketBalance: 5,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 5,
      tenDrawTopUpCoinCost: 200,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "还差 5 张券，可用 200 银子补齐十连。",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 17,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "背包为空",
    capacity: { usedSlots: 17, totalSlots: 60 },
  },
  shop: {
    products: [
      {
        itemId: "task_reroll_coupon",
        name: "任务换班券",
        description: "把当天一个四维任务换成同维度另一张卡。",
        category: "task",
        priceCoins: 150,
        ownedQuantity: 3,
        dailyLimit: 1,
        purchaseEnabled: true,
        purchaseDisabledReason: null,
        requiresAdminConfirmation: false,
      },
    ],
  },
  taskRecord: {
    dates: [{ key: "2026-05-26", label: "今天", dateLabel: "05/26", weekday: "周二" }],
    timeline: [
      {
        id: "row-1",
        dayKey: "2026-05-26",
        occurredAt: "2026-05-26T14:38:02.964Z",
        title: "购买补给",
        subtitle: "任务换班券 x1",
        category: "shop",
        statusLabel: "SETTLED",
      },
    ],
  },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 0,
    teamWidePendingCount: 0,
    sent: [],
    received: [],
    teamWide: [],
    recentResponses: [],
    availableRecipients: [],
    message: "队友雷达可用。",
  },
  redemptions: { mine: [], adminQueue: [] },
} satisfies SupplyStationProductionSnapshot;

describe("supply production to UI Lab adapters", () => {
  it("maps dashboard resources, profile, quests, and media assets", () => {
    const dashboard = toSupplyDashboardPreview(snapshot);

    expect(dashboard.profile).toMatchObject({
      username: "li",
      title: "自律牛马",
      level: 1,
      currentLevelExp: 50,
      nextLevelExp: 1000,
    });
    expect(dashboard.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
    expect(dashboard.resources[2]).toMatchObject({ value: 17, maxValue: 60 });
    expect(dashboard.dailyQuests[0]).toMatchObject({
      id: "movement",
      title: "屁股离线",
      completed: true,
    });
    expect(dashboard.dailyQuests[0].image).toContain("/assets/");
    expect(dashboard.shortcutLinks.map((link) => link.id)).toEqual([
      "home",
      "backpack",
      "draw-pool",
      "task-record",
    ]);
  });

  it("maps secondary panels without mock values", () => {
    expect(toSupplyDrawPoolPreview(snapshot).wallet.ticketBalance).toBe(5);
    expect(toSupplyBackpackPreview(snapshot).capacity.usedSlots).toBe(17);
    expect(toSupplyShopPreview(snapshot).products[0]).toMatchObject({
      sourceItemId: "task_reroll_coupon",
      name: "任务换班券",
      priceCoins: 150,
      ownedQuantity: 3,
    });
    expect(toSupplyTaskRecordPreview(snapshot).timeline[0]).toMatchObject({
      id: "row-1",
      title: "购买补给",
    });
  });
});
```

- [x] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-ui-lab-production-adapters.test.ts
```

Expected: FAIL because `components/gamification/production/supply-ui-lab-adapters.ts` does not exist.

- [x] **Step 3: Implement dashboard adapter**

Create `components/gamification/production/supply-ui-lab-adapters.ts` with these exports:

```ts
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
import { supplyUiLabCatalogBySourceItemId } from "@/components/gamification/ui-lab/supply-data/catalog";
import { supplyDashboardAssetPaths } from "@/components/gamification/ui-lab/supply-dashboard/assets";
import type { SupplyDashboardPreview } from "@/components/gamification/ui-lab/supply-dashboard/types";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

function avatarPath(avatarKey: string) {
  return `/avatars/${avatarKey}.png`;
}

function resourceIcon(id: "coins" | "ticket" | "backpack") {
  return id === "coins" ? "◎" : id === "ticket" ? "券" : "包";
}

function resourceValue(resource: { value: number; maxValue?: number }) {
  return resource.maxValue === undefined
    ? `${resource.value}`
    : `${resource.value}/${resource.maxValue}`;
}

function questImage(dimension: string) {
  if (dimension === "movement") {
    return supplyDashboardAssetPaths.taskCards.movement;
  }
  if (dimension === "hydration") {
    return supplyDashboardAssetPaths.taskCards.hydration;
  }
  if (dimension === "social") {
    return supplyDashboardAssetPaths.taskCards.social;
  }
  return supplyDashboardAssetPaths.taskCards.learning;
}

export function toSupplyDashboardPreview(
  snapshot: SupplyStationProductionSnapshot,
): SupplyDashboardPreview {
  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
      title: snapshot.profile.title,
      level: snapshot.profile.level,
      totalExp: snapshot.profile.totalExp,
      currentLevelExp: snapshot.profile.currentLevelExp,
      nextLevelExp: snapshot.profile.nextLevelExp,
      streakDays: 0,
    },
    motto: "不是在健身，就是在去健身的路上！",
    resources: [
      {
        id: "coins",
        label: snapshot.resources.coins.label,
        value: snapshot.resources.coins.value,
        icon: resourceIcon("coins"),
        iconImage: supplyUiLabResourceIconPaths.coins,
      },
      {
        id: "ticket",
        label: snapshot.resources.ticket.label,
        value: snapshot.resources.ticket.value,
        icon: resourceIcon("ticket"),
        iconImage: supplyUiLabResourceIconPaths.ticket,
      },
      {
        id: "backpack",
        label: snapshot.resources.backpack.label,
        value: snapshot.resources.backpack.value,
        maxValue: snapshot.resources.backpack.maxValue,
        icon: resourceIcon("backpack"),
        iconImage: supplyUiLabResourceIconPaths.backpack,
      },
    ],
    activeEffects: snapshot.dashboard.todayEffects.map((effect) => ({
      id: effect.id,
      label: effect.name,
      icon: supplyDashboardAssetPaths.rewardIcons.boost,
      effectSummary: effect.effectSummary,
      statusLabel: effect.statusLabel,
      endsAtLabel: "今日",
    })),
    dailyQuests: snapshot.dashboard.dailyQuests.map((dimension) => ({
      id: dimension.key,
      dimension: dimension.key,
      title: dimension.assignment?.title ?? dimension.title,
      subtitle: dimension.title,
      image: questImage(dimension.key),
      difficulty: "轻",
      tags: [dimension.subtitle],
      durationLabel: dimension.assignment
        ? `换班 ${dimension.assignment.rerollCount}/${dimension.assignment.rerollLimit}`
        : "未生成",
      completed: dimension.assignment?.status === "completed",
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    })),
    shortcutLinks: [
      {
        id: "home",
        href: "#dashboard",
        title: "首页",
        subtitle: "查看你的今日状态",
        badge: "",
        image: null,
      },
      {
        id: "backpack",
        href: "#backpack",
        title: "背包",
        subtitle: "查看全部道具",
        badge: resourceValue(snapshot.resources.backpack),
        image: supplyDashboardAssetPaths.dockBackpack,
      },
      {
        id: "draw-pool",
        href: "#draw-pool",
        title: "补给站",
        subtitle: "随机获取道具、银子或真实福利",
        badge: `${snapshot.drawPool.wallet.ticketBalance}`,
        image: supplyDashboardAssetPaths.dockSupplyMachine,
      },
      {
        id: "task-record",
        href: "#task-record",
        title: "任务记录",
        subtitle: "查看历史任务与奖励",
        badge: `${snapshot.taskRecord.timeline.length}`,
        image: supplyDashboardAssetPaths.dockTaskRecord,
      },
    ],
    inventoryPreview: {
      usedSlots: snapshot.backpack.capacity.usedSlots,
      totalSlots: snapshot.backpack.capacity.totalSlots,
      items: snapshot.backpack.previewItems.map((item) => ({
        id: item.itemId,
        name: item.name,
        icon: "包",
        quantity: item.quantity,
      })),
    },
    supplyPreview: {
      remainingDraws: snapshot.drawPool.wallet.ticketBalance,
      maxDraws: Math.max(10, snapshot.drawPool.wallet.ticketBalance),
      featuredRewards: [],
    },
    announcement: {
      message: snapshot.social.message,
    },
  };
}
```

- [x] **Step 4: Implement secondary adapters**

Add adapter functions that return existing UI Lab type-compatible data. Use the real snapshot values and catalog media:

```ts
export function toSupplyDrawPoolPreview(snapshot: SupplyStationProductionSnapshot) {
  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
    },
    wallet: snapshot.drawPool.wallet,
    lottery: snapshot.drawPool.lottery,
    resources: toSupplyDashboardPreview(snapshot).resources,
  };
}

export function toSupplyBackpackPreview(snapshot: SupplyStationProductionSnapshot) {
  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
    },
    resources: toSupplyDashboardPreview(snapshot).resources,
    capacity: snapshot.backpack.capacity,
    groups: snapshot.backpack.groups,
    todayEffects: snapshot.backpack.todayEffects,
    emptyMessage: snapshot.backpack.emptyMessage,
  };
}

export function toSupplyShopPreview(snapshot: SupplyStationProductionSnapshot) {
  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
    },
    resources: toSupplyDashboardPreview(snapshot).resources,
    products: snapshot.shop.products.map((product) => {
      const catalogItem =
        supplyUiLabCatalogBySourceItemId[
          product.itemId as keyof typeof supplyUiLabCatalogBySourceItemId
        ];

      return {
        ...product,
        sourceItemId: product.itemId,
        media: catalogItem?.media ?? {
          image: `/gamification/rewards/icons/${product.itemId}.png`,
          assetStatus: "existing" as const,
        },
      };
    }),
  };
}

export function toSupplyTaskRecordPreview(snapshot: SupplyStationProductionSnapshot) {
  return {
    profile: {
      username: snapshot.profile.username,
      avatar: avatarPath(snapshot.profile.avatarKey),
    },
    resources: toSupplyDashboardPreview(snapshot).resources,
    dates: snapshot.taskRecord.dates,
    timeline: snapshot.taskRecord.timeline,
    social: snapshot.social,
    redemptions: snapshot.redemptions,
  };
}
```

If TypeScript reveals stricter UI Lab types for the secondary scenes, adjust the return objects to those exact imported types. Do not introduce mock values for counts, prices, purchase availability, EXP, or backpack quantity.

- [x] **Step 5: Run adapter tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-production-adapters.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add components/gamification/production/supply-ui-lab-adapters.ts __tests__/supply-ui-lab-production-adapters.test.ts
git commit -m "feat: map supply production state to ui lab scenes"
```

## Task 4: Make UI Lab Scenes Accept Production Handlers

**Files:**

- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- Modify: `components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx`
- Modify: `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Test: existing UI Lab scene tests

- [x] **Step 1: Update dashboard scene props**

In `SupplyDashboardScene.tsx`, change the export signature to:

```tsx
export interface SupplyDashboardSceneProps {
  data: SupplyDashboardPreview;
  feedbackMessage?: string;
  activeAction?: string | null;
  onCompleteQuest?: (questId: string) => void;
  onRerollQuest?: (questId: string) => void;
  onClaimRewards?: () => void;
  onNavigate?: (target: "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord") => void;
}

export function SupplyDashboardScene({
  activeAction = null,
  data,
  feedbackMessage: controlledFeedbackMessage,
  onClaimRewards,
  onCompleteQuest,
  onNavigate,
  onRerollQuest,
}: SupplyDashboardSceneProps) {
  const [dailyQuests, setDailyQuests] = useState(() => data.dailyQuests);
  const [feedbackMessage, setFeedbackMessage] = useState("本地预览：任务换班和奖励领取不会写入后端。");
  const [pendingQuestId, setPendingQuestId] = useState<string | null>(null);
  const pendingQuest = dailyQuests.find((quest) => quest.id === pendingQuestId) ?? null;
  const displayedFeedbackMessage = controlledFeedbackMessage ?? feedbackMessage;
  const renderedQuests = onCompleteQuest || onRerollQuest ? data.dailyQuests : dailyQuests;
```

Update `handleConfirmCompleteQuest()`:

```tsx
  function handleConfirmCompleteQuest() {
    if (!pendingQuest) {
      return;
    }

    if (onCompleteQuest) {
      onCompleteQuest(pendingQuest.id);
      setPendingQuestId(null);
      return;
    }

    setDailyQuests((currentQuests) =>
      currentQuests.map((quest) =>
        quest.id === pendingQuest.id
          ? {
              ...quest,
              completed: true,
            }
          : quest,
      ),
    );
    setFeedbackMessage(`已完成打卡：${pendingQuest.title}。这是本地 demo 状态，刷新后会恢复 mock 数据。`);
    setPendingQuestId(null);
  }
```

Update `handleRerollQuest()`:

```tsx
  function handleRerollQuest(questId: string) {
    if (onRerollQuest) {
      onRerollQuest(questId);
      return;
    }

    const quest = dailyQuests.find((candidate) => candidate.id === questId);
    setFeedbackMessage(`已触发换班预览：${quest?.title ?? questId}。mock 数据保持不变。`);
  }
```

Update `handleClaimRewards()`:

```tsx
  function handleClaimRewards() {
    if (onClaimRewards) {
      onClaimRewards();
      return;
    }

    setFeedbackMessage("奖励领取预览：EXP、银子和抽奖券只展示反馈，不写入后端。");
  }
```

Pass `renderedQuests` to `DailyQuestPanel` and display `displayedFeedbackMessage`.

- [x] **Step 2: Replace dashboard shortcut links with production callbacks when provided**

Modify `DashboardShortcutDock` props:

```tsx
function DashboardShortcutDock({
  data,
  onNavigate,
}: {
  data: SupplyDashboardPreview;
  onNavigate?: (target: "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord") => void;
}) {
```

For each shortcut, render a button when `onNavigate` is provided:

```tsx
const targetByShortcutId = {
  home: "dashboard",
  backpack: "backpack",
  "draw-pool": "drawPool",
  "task-record": "taskRecord",
} as const;

if (onNavigate) {
  return (
    <nav className="supply-dashboard-shortcut-dock" aria-label="快捷入口">
      {data.shortcutLinks.map((shortcut) => (
        <button
          className={`supply-dashboard-shortcut-card supply-dashboard-shortcut-card--${shortcut.id}`}
          data-priority={shortcut.id === "home" ? "primary" : "secondary"}
          key={shortcut.id}
          onClick={() => onNavigate(targetByShortcutId[shortcut.id])}
          type="button"
        >
          {/* keep the same inner visual markup as the Link branch */}
        </button>
      ))}
    </nav>
  );
}
```

Keep the existing `Link` branch for UI Lab static routes. The button branch must include the same image, title, subtitle, badge, and arrow markup as the existing Link branch.

- [x] **Step 3: Add handler props to secondary scenes**

For each secondary scene, add optional production handlers while keeping mock defaults:

`SupplyDrawPoolScene.tsx`:

```tsx
export interface SupplyDrawPoolSceneProps {
  data: SupplyDrawPoolPreview;
  activeAction?: string | null;
  latestDraw?: unknown;
  onDraw?: (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => void;
}
```

`SupplyBackpackScene.tsx`:

```tsx
export interface SupplyBackpackSceneProps {
  data: SupplyBackpackPreview;
  activeAction?: string | null;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
  onUseItem?: (itemId: string) => void;
  onRequestRedemption?: (itemId: string) => void;
}
```

`SupplyShopScene.tsx`:

```tsx
export interface SupplyShopSceneProps {
  data: SupplyShopPreview;
  activeAction?: string | null;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
  onPurchase?: (itemId: string) => void;
}
```

`SupplyTaskRecordScene.tsx`:

```tsx
export interface SupplyTaskRecordSceneProps {
  data: SupplyTaskRecordPreview;
  activeAction?: string | null;
  onRespondSocialInvitation?: (invitationId: string) => void;
}
```

Use callbacks only when provided. If a callback is not provided, preserve the existing UI Lab local demo behavior.

- [x] **Step 4: Run UI Lab static tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx __tests__/supply-backpack-scene.test.tsx __tests__/supply-shop-scene.test.tsx __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-task-record-scene.test.tsx __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS. UI Lab routes still render static scenes without production APIs.

- [x] **Step 5: Commit**

```bash
git add components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx components/gamification/ui-lab/supply-backpack/SupplyBackpackScene.tsx components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx
git commit -m "feat: allow supply ui lab scenes to use production handlers"
```

## Task 5: Wire Production Shell To UI Lab Scenes

**Files:**

- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `components/gamification/production/SupplyDashboardPanel.tsx`
- Modify: `components/gamification/production/SupplyDrawPoolPanel.tsx`
- Modify: `components/gamification/production/SupplyBackpackPanel.tsx`
- Modify: `components/gamification/production/SupplyShopPanel.tsx`
- Modify: `components/gamification/production/SupplyTaskRecordPanel.tsx`
- Test: `__tests__/supply-production-visual-contract.test.tsx`
- Test: `__tests__/supply-production-shell.test.tsx`

- [x] **Step 1: Replace production panels with UI Lab scene wrappers**

In `SupplyDashboardPanel.tsx`, replace the simplified JSX with:

```tsx
"use client";

import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { toSupplyDashboardPreview } from "@/components/gamification/production/supply-ui-lab-adapters";
import type { GamificationDimensionSnapshot, SupplyStationProductionSnapshot } from "@/lib/types";

type SupplyDashboardAction = "complete-task" | "reroll-task" | "claim-ticket";
type SupplyDashboardNavigationTarget = "draw-pool" | "backpack" | "shop" | "task-record";

export interface SupplyDashboardPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  activeAction: SupplyDashboardAction | null;
  onCompleteTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onRerollTask: (dimensionKey: GamificationDimensionSnapshot["key"]) => void;
  onClaimTicket: () => void;
  onNavigate: (target: SupplyDashboardNavigationTarget) => void;
}

const navigationTargetBySceneTarget = {
  dashboard: "task-record",
  drawPool: "draw-pool",
  backpack: "backpack",
  shop: "shop",
  taskRecord: "task-record",
} as const;

export function SupplyDashboardPanel({
  activeAction,
  onClaimTicket,
  onCompleteTask,
  onNavigate,
  onRerollTask,
  snapshot,
}: SupplyDashboardPanelProps) {
  return (
    <SupplyDashboardScene
      activeAction={activeAction}
      data={toSupplyDashboardPreview(snapshot)}
      feedbackMessage={activeAction ? "操作处理中..." : "生产数据已接入，操作会写入真实补给站。"}
      onClaimRewards={onClaimTicket}
      onCompleteQuest={(questId) => onCompleteTask(questId as GamificationDimensionSnapshot["key"])}
      onNavigate={(target) => onNavigate(navigationTargetBySceneTarget[target])}
      onRerollQuest={(questId) => onRerollTask(questId as GamificationDimensionSnapshot["key"])}
    />
  );
}
```

Apply the same wrapper pattern to the other production panel files:

- `SupplyDrawPoolPanel.tsx` renders `SupplyDrawPoolScene` with `toSupplyDrawPoolPreview(snapshot)`.
- `SupplyBackpackPanel.tsx` renders `SupplyBackpackScene` with `toSupplyBackpackPreview(snapshot)`.
- `SupplyShopPanel.tsx` renders `SupplyShopScene` with `toSupplyShopPreview(snapshot)`.
- `SupplyTaskRecordPanel.tsx` renders `SupplyTaskRecordScene` with `toSupplyTaskRecordPreview(snapshot)`.

Each wrapper passes existing handler props through to the scene. Keep the production shell state and mutation logic in `SupplyStationShell.tsx`.

- [x] **Step 2: Remove simplified production shell chrome**

In `SupplyStationShell.tsx`, replace the outer `<section className="supply-production-shell">` chrome with a neutral fragment that only chooses the active UI Lab scene:

```tsx
  if (!snapshot && !error) {
    return <p className="supply-ui-lab-loading">补给站加载中...</p>;
  }

  if (error) {
    return (
      <section className="supply-ui-lab-error" aria-label="牛马补给站错误">
        <h1>牛马补给站加载失败</h1>
        <p>{error.message}</p>
        {error.status === 401 ? <a href="/login">去登录</a> : null}
        {error.status !== 401 ? (
          <button onClick={() => void loadSnapshot()} type="button">
            重试
          </button>
        ) : null}
      </section>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <>
      {activePanel === "dashboard" ? (
        <SupplyDashboardPanel
          activeAction={isDashboardAction(activeAction) ? activeAction : null}
          onClaimTicket={handleClaimTicket}
          onCompleteTask={handleCompleteTask}
          onNavigate={handlePanelNavigation}
          onRerollTask={handleRerollTask}
          snapshot={snapshot}
        />
      ) : null}
      {/* keep the existing branches for drawPool, backpack, shop, taskRecord */}
    </>
  );
```

Keep the existing `runAction()` logic. After each mutation, continue to refresh with `fetchSupplyStationState()`.

- [x] **Step 3: Update shell tests**

In `__tests__/supply-production-shell.test.tsx`, update assertions that look for `.supply-production-shell` to look for UI Lab scene classes:

```ts
expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
expect(container.querySelector(".supply-production-shell")).toBeNull();
```

Keep the fetch/mutation assertions:

```ts
expect(fetch).toHaveBeenNthCalledWith(
  1,
  "/api/gamification/supply/state",
  expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
);
```

- [x] **Step 4: Run production shell and visual tests**

Run:

```bash
npm test -- __tests__/supply-production-visual-contract.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx __tests__/supply-ui-lab-production-adapters.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add components/gamification/production/SupplyStationShell.tsx components/gamification/production/SupplyDashboardPanel.tsx components/gamification/production/SupplyDrawPoolPanel.tsx components/gamification/production/SupplyBackpackPanel.tsx components/gamification/production/SupplyShopPanel.tsx components/gamification/production/SupplyTaskRecordPanel.tsx __tests__/supply-production-visual-contract.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx
git commit -m "feat: render production supply station with ui lab scenes"
```

## Task 6: Remove Stopgap Production Styling

**Files:**

- Modify: `app/globals.css`
- Test: `__tests__/supply-production-isolation.test.ts`

- [x] **Step 1: Remove temporary `supply-production-*` CSS**

In `app/globals.css`, delete the stopgap block that begins with:

```css
/* Production supply station */
.supply-production-shell {
```

and ends before:

```css
/* Supply UI Lab 3:4 task-card review */
```

Keep all existing UI Lab CSS blocks such as:

```css
.supply-dashboard-scene
.supply-shop-scene
.supply-backpack-scene
.supply-draw-pool-scene
.supply-task-record-scene
.supply-ui-lab-topbar
```

- [x] **Step 2: Add a guard against reintroducing the simplified shell**

In `__tests__/supply-production-isolation.test.ts`, add:

```ts
it("does not keep the temporary simplified production shell styles", () => {
  const globals = readSource("app/globals.css");

  expect(globals).not.toContain(".supply-production-shell");
  expect(globals).not.toContain(".supply-production-dashboard");
  expect(globals).not.toContain(".supply-production-shop");
});
```

- [x] **Step 3: Run style and visual tests**

Run:

```bash
npm test -- __tests__/supply-production-isolation.test.ts __tests__/supply-production-visual-contract.test.tsx
```

Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add app/globals.css __tests__/supply-production-isolation.test.ts
git commit -m "refactor: remove simplified supply production shell styles"
```

## Task 7: Final Verification And Browser Smoke

**Files:**

- Modify only files required by failures found during verification.

- [x] **Step 1: Run focused supply tests**

Run:

```bash
npm test -- __tests__/supply-production-plan-contract.test.ts __tests__/gamification-experience-schema.test.ts __tests__/gamification-shop-schema.test.ts __tests__/gamification-experience.test.ts __tests__/gamification-tasks.test.ts __tests__/board-punch-api.test.ts __tests__/gamification-state-api.test.ts __tests__/gamification-shop-catalog.test.ts __tests__/gamification-shop.test.ts __tests__/gamification-shop-api.test.ts __tests__/supply-production-view-model.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/supply-ui-lab-production-adapters.test.ts __tests__/supply-production-visual-contract.test.tsx __tests__/supply-production-dashboard-panel.test.tsx __tests__/supply-production-draw-pool-panel.test.tsx __tests__/supply-production-backpack-panel.test.tsx __tests__/supply-production-shop-panel.test.tsx __tests__/gamification-task-records.test.ts __tests__/supply-production-task-record-panel.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-station-shell.test.tsx __tests__/supply-production-isolation.test.ts __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run related regression tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts __tests__/gamification-tasks.test.ts __tests__/gamification-tasks-api.test.ts __tests__/gamification-lottery.test.ts __tests__/gamification-lottery-api.test.ts __tests__/gamification-item-use.test.ts __tests__/gamification-item-use-api.test.ts __tests__/gamification-redemptions.test.ts __tests__/gamification-redemption-api.test.ts __tests__/gamification-social-invitations.test.ts __tests__/gamification-social-respond-api.test.ts __tests__/board-punch-api.test.ts __tests__/board-punch-fitness-ticket.test.ts __tests__/seed.test.ts
```

Expected: PASS.

- [x] **Step 3: Run typecheck and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS. Do not run `npm run build` while a Next dev server is using the same `.next` directory.

- [x] **Step 4: Start preview server**

If port `3001` is busy, use port `3002`:

```bash
./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3002
```

Expected: server prints:

```text
Local: http://127.0.0.1:3002
Ready
```

- [x] **Step 5: Browser QA with screenshots**

Use the Browser plugin against:

```text
http://127.0.0.1:3002
```

Manual smoke path:

1. Login as `li / 0000`.
2. Open `牛马补给站`.
3. Confirm the production page visually renders the UI Lab dashboard:
   - background gym image is visible
   - hero character is visible
   - UI Lab top bar is visible
   - dashboard task cards use task-card artwork
   - DOM contains `.supply-dashboard-scene`
   - DOM does not contain `.supply-production-shell`
4. Complete one task and confirm EXP increases in the rendered UI.
5. Switch to `抽卡池` and confirm the draw machine media appears.
6. Switch to `背包` and confirm backpack item media appears.
7. Switch to `补给商店`, buy `任务换班券`, and confirm inventory count increases after refresh.
8. Switch to `任务记录` and confirm task, EXP, and shop rows appear.
9. Confirm no production surface shows `团队目标` or `team-goal`.

Required Browser checks:

- Page identity: URL is `http://127.0.0.1:3002/`.
- Not blank: DOM snapshot includes `牛马补给站`.
- No framework overlay.
- Console health: no relevant app errors.
- Screenshot evidence: capture dashboard, shop, and task record after interactions.

- [x] **Step 6: Commit verification fixes**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: align production supply station with ui lab visuals"
```

If no fixes were required, do not create an empty commit.

## Coverage Checklist

- [x] Production dashboard renders `supply-dashboard-scene`.
- [x] Production dashboard renders `supply-dashboard-background`.
- [x] Production dashboard renders `supply-dashboard-hero-stage`.
- [x] Production uses `/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp`.
- [x] Production uses `/assets/home-scenes/supply/dashboard/niuma-hero.webp`.
- [x] Draw pool uses the draw machine media.
- [x] Backpack uses backpack item media.
- [x] Shop uses shop/category/item media.
- [x] Task record uses task-record menu/icon media.
- [x] Production code does not import `mock-data.ts`.
- [x] UI Lab routes remain static and API-free.
- [x] Production still uses real `SupplyStationProductionSnapshot`.
- [x] Production mutations still write through real APIs.
- [x] `team-goal` remains absent from production.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Browser screenshots prove the production page matches the UI Lab visual direction.
