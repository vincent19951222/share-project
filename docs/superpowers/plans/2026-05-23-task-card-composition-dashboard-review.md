# Task Card Composition Dashboard Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3:4 task-card review system and wire the four-card demo into the `/ui-lab/supply-dashboard` 今日主线 preview.

**Architecture:** Add a small shared UI-lab task-card module with typed demo data, a reusable client card component, and an isolated review route. Then make the existing Dashboard quest panel render those same 3:4 cards while preserving UI-lab isolation from the production `SupplyStation`.

**Tech Stack:** Next.js App Router, React client components, TypeScript strict mode, CSS in `app/globals.css`, Vitest + jsdom.

---

## File Structure

- Create `components/gamification/ui-lab/task-cards/types.ts`
  - Owns the preview-card data contract and theme-token types.
- Create `components/gamification/ui-lab/task-cards/task-card-demo-data.ts`
  - Builds the four demo cards from `content/gamification/task-cards.ts` and `content/gamification/dimensions.ts`.
- Create `components/gamification/ui-lab/task-cards/TaskCardPreview.tsx`
  - Renders one reusable 3:4 task card with frame, art window, text, state, and reroll control.
- Create `components/gamification/ui-lab/task-cards/TaskCardReviewScene.tsx`
  - Renders the four-card contact sheet and Compact/Card-first Dashboard placement previews.
- Create `app/ui-lab/supply-dashboard/task-card-review/page.tsx`
  - Exposes the isolated visual review route.
- Modify `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
  - Fix movement/hydration quest semantic mismatch and use the four demo card IDs.
- Modify `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Replace the local quest card markup with `TaskCardPreview`.
- Modify `app/globals.css`
  - Add task-card review styles and adjust Dashboard quest-list placement rules for 3:4 cards.
- Add tests:
  - `__tests__/supply-task-card-demo-data.test.ts`
  - `__tests__/supply-task-card-preview.test.tsx`
  - `__tests__/supply-task-card-review-route.test.ts`
  - `__tests__/supply-task-card-review-scene.test.tsx`
  - `__tests__/supply-task-card-css.test.ts`
  - Update existing Dashboard mock/scene/CSS tests.

---

### Task 1: Demo Data Contract

**Files:**
- Create: `components/gamification/ui-lab/task-cards/types.ts`
- Create: `components/gamification/ui-lab/task-cards/task-card-demo-data.ts`
- Test: `__tests__/supply-task-card-demo-data.test.ts`

- [ ] **Step 1: Write the failing data test**

Create `__tests__/supply-task-card-demo-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  taskCardReviewCards,
  taskCardThemeTokens,
} from "@/components/gamification/ui-lab/task-cards/task-card-demo-data";

describe("supply task-card demo data", () => {
  it("defines the four-card 3:4 review set from the canonical content", () => {
    expect(taskCardReviewCards.map((card) => card.id)).toEqual([
      "movement_004",
      "hydration_003",
      "social_001",
      "learning_005",
    ]);

    expect(taskCardReviewCards.map((card) => [card.dimension, card.slogan, card.title])).toEqual([
      ["movement", "把电充绿", "窗边回血"],
      ["hydration", "把尿喝白", "杯子见底"],
      ["social", "把事办黄", "废话 KPI"],
      ["learning", "把股看红", "一句话笔记"],
    ]);

    expect(taskCardReviewCards.map((card) => [card.difficulty, card.sceneLabel, card.cooldownLabel])).toEqual([
      ["轻", "通用", "4天"],
      ["轻", "通用", "2天"],
      ["轻", "办公室", "3天"],
      ["中", "通用", "4天"],
    ]);

    expect(taskCardReviewCards.every((card) => card.image.includes("/assets/task-cards/raw/"))).toBe(true);
    expect(taskCardReviewCards.every((card) => card.aspectRatio === "3:4")).toBe(true);
  });

  it("has a complete theme token for every review dimension", () => {
    expect(Object.keys(taskCardThemeTokens)).toEqual(["movement", "hydration", "social", "learning"]);
    expect(taskCardThemeTokens.movement.accent).toBe("#3E9C35");
    expect(taskCardThemeTokens.hydration.accent).toBe("#278BD6");
    expect(taskCardThemeTokens.social.accent).toBe("#E1AE20");
    expect(taskCardThemeTokens.learning.accent).toBe("#D9432F");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-task-card-demo-data.test.ts
```

Expected: FAIL because `components/gamification/ui-lab/task-cards/task-card-demo-data.ts` does not exist.

- [ ] **Step 3: Create the task-card types**

Create `components/gamification/ui-lab/task-cards/types.ts`:

```ts
import type { TaskDimensionKey } from "@/content/gamification/types";

export type SupplyTaskCardAspectRatio = "3:4";

export type SupplyTaskCardPreviewData = {
  id: string;
  dimension: TaskDimensionKey;
  slogan: string;
  title: string;
  description: string;
  image: string;
  difficulty: "轻" | "中";
  sceneLabel: "通用" | "办公室" | "居家";
  cooldownLabel: string;
  completed: boolean;
  aspectRatio: SupplyTaskCardAspectRatio;
};

export type SupplyTaskCardThemeToken = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  ink: string;
};
```

- [ ] **Step 4: Create the demo data builder**

Create `components/gamification/ui-lab/task-cards/task-card-demo-data.ts`:

```ts
import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type {
  TaskCardDefinition,
  TaskDimensionKey,
  TaskEffort,
  TaskScene,
} from "@/content/gamification/types";
import type {
  SupplyTaskCardPreviewData,
  SupplyTaskCardThemeToken,
} from "./types";

const reviewCardIds = ["movement_004", "hydration_003", "social_001", "learning_005"] as const;

const taskCardArtById: Record<(typeof reviewCardIds)[number], string> = {
  movement_004: "/assets/task-cards/raw/movement_004%C2%A0%E7%AA%97%E8%BE%B9%E5%9B%9E%E8%A1%80.png",
  hydration_003: "/assets/task-cards/raw/hydration_003%C2%A0%E6%9D%AF%E5%AD%90%E8%A7%81%E5%BA%95.png",
  social_001: "/assets/task-cards/raw/social_001%C2%A0%E5%BA%9F%E8%AF%9D%20KPI.png",
  learning_005: "/assets/task-cards/raw/learning_005%C2%A0%E4%B8%80%E5%8F%A5%E8%AF%9D%E7%AC%94%E8%AE%B0.png",
};

const effortLabels: Record<TaskEffort, SupplyTaskCardPreviewData["difficulty"]> = {
  light: "轻",
  medium: "中",
};

const sceneLabels: Record<TaskScene, SupplyTaskCardPreviewData["sceneLabel"]> = {
  general: "通用",
  office: "办公室",
  home: "居家",
};

export const taskCardThemeTokens: Record<TaskDimensionKey, SupplyTaskCardThemeToken> = {
  movement: {
    accent: "#3E9C35",
    accentDark: "#14532D",
    accentSoft: "#DCFCE7",
    ink: "#0F100E",
  },
  hydration: {
    accent: "#278BD6",
    accentDark: "#075985",
    accentSoft: "#E0F2FE",
    ink: "#0F100E",
  },
  social: {
    accent: "#E1AE20",
    accentDark: "#92400E",
    accentSoft: "#FEF3C7",
    ink: "#0F100E",
  },
  learning: {
    accent: "#D9432F",
    accentDark: "#991B1B",
    accentSoft: "#FEE2E2",
    ink: "#0F100E",
  },
};

function findTaskCard(id: string): TaskCardDefinition {
  const card = TASK_CARDS.find((candidate) => candidate.id === id);

  if (card === undefined) {
    throw new Error(`Missing task-card definition: ${id}`);
  }

  return card;
}

function findDimensionTitle(dimensionKey: TaskDimensionKey): string {
  const dimension = GAMIFICATION_DIMENSIONS.find((candidate) => candidate.key === dimensionKey);

  if (dimension === undefined) {
    throw new Error(`Missing task-card dimension: ${dimensionKey}`);
  }

  return dimension.title;
}

function toPreviewCard(id: (typeof reviewCardIds)[number], completed: boolean): SupplyTaskCardPreviewData {
  const source = findTaskCard(id);

  return {
    id: source.id,
    dimension: source.dimensionKey,
    slogan: findDimensionTitle(source.dimensionKey),
    title: source.title,
    description: source.description,
    image: taskCardArtById[id],
    difficulty: effortLabels[source.effort],
    sceneLabel: sceneLabels[source.scene],
    cooldownLabel: `${source.repeatCooldownDays}天`,
    completed,
    aspectRatio: "3:4",
  };
}

export const taskCardReviewCards: SupplyTaskCardPreviewData[] = reviewCardIds.map((id, index) =>
  toPreviewCard(id, index < 3),
);
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm test -- __tests__/supply-task-card-demo-data.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add components/gamification/ui-lab/task-cards/types.ts components/gamification/ui-lab/task-cards/task-card-demo-data.ts __tests__/supply-task-card-demo-data.test.ts
git commit -m "feat: add task card review data"
```

Expected: commit includes only the new data contract and test.

---

### Task 2: Reusable 3:4 Task Card Component

**Files:**
- Create: `components/gamification/ui-lab/task-cards/TaskCardPreview.tsx`
- Test: `__tests__/supply-task-card-preview.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `__tests__/supply-task-card-preview.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCardPreview } from "@/components/gamification/ui-lab/task-cards/TaskCardPreview";
import { taskCardReviewCards } from "@/components/gamification/ui-lab/task-cards/task-card-demo-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("TaskCardPreview", () => {
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

  it("renders one 3:4 task card with dynamic text and art", async () => {
    await act(async () => {
      root.render(<TaskCardPreview card={taskCardReviewCards[0]} />);
    });

    const card = container.querySelector(".supply-task-card");
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-card-id")).toBe("movement_004");
    expect(card?.getAttribute("data-dimension")).toBe("movement");
    expect(card?.getAttribute("data-aspect-ratio")).toBe("3:4");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("窗边回血");
    expect(container.textContent).toContain("轻");
    expect(container.textContent).toContain("通用");
    expect(container.textContent).toContain("4天");
    expect(container.textContent).toContain("已完成");
    expect(container.querySelector(".supply-task-card-art img")?.getAttribute("src")).toBe(taskCardReviewCards[0].image);
  });

  it("keeps reroll as a React control instead of baked image text", async () => {
    const onReroll = vi.fn();

    await act(async () => {
      root.render(<TaskCardPreview card={taskCardReviewCards[3]} onReroll={onReroll} />);
    });

    const button = container.querySelector<HTMLButtonElement>(".supply-task-card-reroll");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("换一个");
    expect(container.querySelector(".supply-task-card-state")?.textContent).toBe("进行中");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onReroll).toHaveBeenCalledWith("learning_005");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-task-card-preview.test.tsx
```

Expected: FAIL because `TaskCardPreview.tsx` does not exist.

- [ ] **Step 3: Create the component**

Create `components/gamification/ui-lab/task-cards/TaskCardPreview.tsx`:

```tsx
"use client";

import Image from "next/image";
import type { SupplyTaskCardPreviewData } from "./types";

type TaskCardPreviewProps = {
  card: SupplyTaskCardPreviewData;
  className?: string;
  density?: "review" | "dashboard";
  onReroll?: (cardId: string) => void;
};

function joinClassNames(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function TaskCardPreview({
  card,
  className,
  density = "review",
  onReroll,
}: TaskCardPreviewProps) {
  return (
    <article
      aria-label={`${card.title}，${card.completed ? "已完成" : "进行中"}`}
      className={joinClassNames([
        "supply-task-card",
        `supply-task-card--${card.dimension}`,
        `supply-task-card--${density}`,
        className,
      ])}
      data-aspect-ratio={card.aspectRatio}
      data-card-id={card.id}
      data-complete={card.completed}
      data-dimension={card.dimension}
    >
      <div className="supply-task-card-corner supply-task-card-corner--tl" aria-hidden="true" />
      <div className="supply-task-card-corner supply-task-card-corner--tr" aria-hidden="true" />
      <div className="supply-task-card-band">
        <span aria-hidden="true">◆</span>
        <strong>{card.slogan}</strong>
      </div>
      <h3>{card.title}</h3>
      <div className="supply-task-card-art">
        <Image alt="" fill sizes="(max-width: 768px) 82vw, 300px" src={card.image} unoptimized />
      </div>
      <div className="supply-task-card-meta" aria-label="任务标签">
        <span data-level={card.difficulty}>{card.difficulty}</span>
        <span>{card.sceneLabel}</span>
        <span>{card.cooldownLabel}</span>
      </div>
      <button
        className="supply-task-card-reroll"
        onClick={() => onReroll?.(card.id)}
        type="button"
        aria-label={`更换任务：${card.title}`}
      >
        换一个
      </button>
      <span className="supply-task-card-state" data-complete={card.completed}>
        {card.completed ? "已完成" : "进行中"}
      </span>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- __tests__/supply-task-card-preview.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add components/gamification/ui-lab/task-cards/TaskCardPreview.tsx __tests__/supply-task-card-preview.test.tsx
git commit -m "feat: add 3x4 task card preview component"
```

Expected: commit includes only the component and its test.

---

### Task 3: Review Scene And Isolated Route

**Files:**
- Create: `components/gamification/ui-lab/task-cards/TaskCardReviewScene.tsx`
- Create: `app/ui-lab/supply-dashboard/task-card-review/page.tsx`
- Test: `__tests__/supply-task-card-review-scene.test.tsx`
- Test: `__tests__/supply-task-card-review-route.test.ts`

- [ ] **Step 1: Write the failing scene test**

Create `__tests__/supply-task-card-review-scene.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskCardReviewScene } from "@/components/gamification/ui-lab/task-cards/TaskCardReviewScene";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("TaskCardReviewScene", () => {
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

  it("renders the contact sheet and both Dashboard placement previews", async () => {
    await act(async () => {
      root.render(<TaskCardReviewScene />);
    });

    expect(container.querySelector(".supply-task-card-review-scene")).not.toBeNull();
    expect(container.querySelector(".supply-task-card-review-grid")).not.toBeNull();
    expect(container.querySelectorAll(".supply-task-card-review-grid .supply-task-card")).toHaveLength(4);
    expect(container.querySelector(".supply-task-card-dashboard-preview--compact")).not.toBeNull();
    expect(container.querySelector(".supply-task-card-dashboard-preview--card-first")).not.toBeNull();
    expect(container.querySelectorAll(".supply-task-card-dashboard-preview .supply-task-card")).toHaveLength(8);
    expect(container.textContent).toContain("Compact 2x2");
    expect(container.textContent).toContain("Card-first 2x2");
  });
});
```

- [ ] **Step 2: Write the failing route isolation test**

Create `__tests__/supply-task-card-review-route.test.ts`:

```ts
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task-card review route isolation", () => {
  it("adds an isolated review route without production wiring", () => {
    expect(existsSync("app/ui-lab/supply-dashboard/task-card-review/page.tsx")).toBe(true);

    const page = readFileSync("app/ui-lab/supply-dashboard/task-card-review/page.tsx", "utf8");
    const boardPage = readFileSync("app/(board)/page.tsx", "utf8");
    const navbar = readFileSync("components/navbar/Navbar.tsx", "utf8");
    const supplyStation = readFileSync("components/gamification/SupplyStation.tsx", "utf8");

    expect(page).toContain("TaskCardReviewScene");
    expect(boardPage).not.toContain("TaskCardReviewScene");
    expect(navbar).not.toContain("task-card-review");
    expect(supplyStation).not.toContain("TaskCardReviewScene");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/supply-task-card-review-scene.test.tsx __tests__/supply-task-card-review-route.test.ts
```

Expected: FAIL because review scene and route do not exist.

- [ ] **Step 4: Create the review scene**

Create `components/gamification/ui-lab/task-cards/TaskCardReviewScene.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TaskCardPreview } from "./TaskCardPreview";
import { taskCardReviewCards } from "./task-card-demo-data";
import type { SupplyTaskCardPreviewData } from "./types";

function DashboardPlacementPreview({
  cards,
  variant,
}: {
  cards: SupplyTaskCardPreviewData[];
  variant: "compact" | "card-first";
}) {
  return (
    <section
      className={`supply-task-card-dashboard-preview supply-task-card-dashboard-preview--${variant}`}
      aria-label={variant === "compact" ? "Compact 2x2 今日主线预览" : "Card-first 2x2 今日主线预览"}
    >
      <div className="supply-task-card-dashboard-preview-heading">
        <strong>{variant === "compact" ? "Compact 2x2" : "Card-first 2x2"}</strong>
        <span>进度 3/4</span>
      </div>
      <div className="supply-task-card-dashboard-preview-grid">
        {cards.map((card) => (
          <TaskCardPreview card={card} density="dashboard" key={`${variant}-${card.id}`} />
        ))}
      </div>
      <footer>
        <p>
          完成全部任务可获得 <span>EXP 200</span><span>银子 100</span><span>抽奖券 1</span>
        </p>
        <button type="button">领取奖励</button>
      </footer>
    </section>
  );
}

export function TaskCardReviewScene({
  cards = taskCardReviewCards,
}: {
  cards?: SupplyTaskCardPreviewData[];
}) {
  const [feedback, setFeedback] = useState("Review only：点击换一个只验证控件位置。");

  return (
    <main className="supply-task-card-review-scene" aria-label="任务卡 3:4 组合评审">
      <header className="supply-task-card-review-header">
        <a href="/ui-lab/supply-dashboard">返回 Dashboard</a>
        <div>
          <p>Task Card Review</p>
          <h1>3:4 今日主线任务卡</h1>
        </div>
        <span aria-live="polite">{feedback}</span>
      </header>

      <section className="supply-task-card-review-panel" aria-label="四卡 contact sheet">
        <div className="supply-task-card-review-panel-heading">
          <h2>四卡 Contact Sheet</h2>
          <p>统一检查边框、插图窗口、中文文字层、状态和换任务按钮。</p>
        </div>
        <div className="supply-task-card-review-grid">
          {cards.map((card) => (
            <TaskCardPreview
              card={card}
              key={card.id}
              onReroll={(cardId) => setFeedback(`已触发换任务预览：${cardId}`)}
            />
          ))}
        </div>
      </section>

      <section className="supply-task-card-review-panel" aria-label="Dashboard 今日主线落位预览">
        <div className="supply-task-card-review-panel-heading">
          <h2>Dashboard 今日主线落位</h2>
          <p>同屏比较当前右侧面板思路和卡牌优先思路。</p>
        </div>
        <div className="supply-task-card-dashboard-preview-list">
          <DashboardPlacementPreview cards={cards} variant="compact" />
          <DashboardPlacementPreview cards={cards} variant="card-first" />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Create the isolated route**

Create `app/ui-lab/supply-dashboard/task-card-review/page.tsx`:

```tsx
import { TaskCardReviewScene } from "@/components/gamification/ui-lab/task-cards/TaskCardReviewScene";

export const metadata = {
  title: "任务卡 3:4 Review",
};

export default function SupplyTaskCardReviewPage() {
  return <TaskCardReviewScene />;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/supply-task-card-review-scene.test.tsx __tests__/supply-task-card-review-route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add components/gamification/ui-lab/task-cards/TaskCardReviewScene.tsx app/ui-lab/supply-dashboard/task-card-review/page.tsx __tests__/supply-task-card-review-scene.test.tsx __tests__/supply-task-card-review-route.test.ts
git commit -m "feat: add task card review route"
```

Expected: commit includes only review scene, route, and tests.

---

### Task 4: CSS Contract For Card And Review Layout

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/supply-task-card-css.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

Create `__tests__/supply-task-card-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function normalizeCss(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractRuleBody(css: string, selector: string) {
  const marker = `${selector} {`;
  const markerIndex = css.indexOf(marker);
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

describe("supply task-card CSS", () => {
  it("locks task cards to 3:4 and keeps art as a cropped layer", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const card = extractRuleBody(css, ".supply-task-card");
    const art = extractRuleBody(css, ".supply-task-card-art");
    const artImage = extractRuleBody(css, ".supply-task-card-art img");
    const reviewGrid = extractRuleBody(css, ".supply-task-card-review-grid");

    expect(card).toMatch(/aspect-ratio:\s*3\s*\/\s*4/);
    expect(card).toMatch(/display:\s*grid/);
    expect(card).toMatch(/overflow:\s*hidden/);
    expect(art).toMatch(/position:\s*relative/);
    expect(art).toMatch(/overflow:\s*hidden/);
    expect(artImage).toMatch(/object-fit:\s*cover/);
    expect(reviewGrid).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*18\.75rem\)\)/);
  });

  it("defines both Dashboard placement review variants", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const compact = extractRuleBody(css, ".supply-task-card-dashboard-preview--compact");
    const cardFirst = extractRuleBody(css, ".supply-task-card-dashboard-preview--card-first");
    const placementGrid = extractRuleBody(css, ".supply-task-card-dashboard-preview-grid");

    expect(compact).toMatch(/max-width:\s*34\.25rem/);
    expect(cardFirst).toMatch(/max-width:\s*42rem/);
    expect(placementGrid).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(placementGrid).toMatch(/place-items:\s*center/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-task-card-css.test.ts
```

Expected: FAIL because `.supply-task-card` styles do not exist.

- [ ] **Step 3: Add task-card and review CSS**

Append this section to `app/globals.css` near the existing Supply UI Lab styles:

```css
/* Supply UI Lab 3:4 task-card review */
.supply-task-card-review-scene {
  min-height: 100svh;
  background: #f4e6c8;
  color: #111827;
  padding: 1rem;
}

.supply-task-card-review-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(12rem, auto);
  align-items: center;
  gap: 1rem;
  margin: 0 auto 1rem;
  max-width: 86rem;
  border: 4px solid #111827;
  background: #facc15;
  box-shadow: 5px 5px 0 #111827;
  padding: 0.75rem 1rem;
}

.supply-task-card-review-header a {
  border: 3px solid #111827;
  background: #fff8e8;
  color: #111827;
  padding: 0.45rem 0.7rem;
  font-weight: 1000;
  text-decoration: none;
}

.supply-task-card-review-header p,
.supply-task-card-review-header h1 {
  margin: 0;
}

.supply-task-card-review-header p {
  font-size: 0.75rem;
  font-weight: 1000;
  text-transform: uppercase;
}

.supply-task-card-review-header h1 {
  font-size: 1.45rem;
  line-height: 1.1;
}

.supply-task-card-review-header > span {
  border: 2px solid #111827;
  background: #fff8e8;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 900;
}

.supply-task-card-review-panel {
  margin: 0 auto 1rem;
  max-width: 86rem;
  border: 4px solid #111827;
  background: rgba(255, 248, 232, 0.96);
  box-shadow: 5px 5px 0 rgba(17, 24, 39, 0.92);
  padding: 1rem;
}

.supply-task-card-review-panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.supply-task-card-review-panel-heading h2,
.supply-task-card-review-panel-heading p {
  margin: 0;
}

.supply-task-card-review-panel-heading h2 {
  font-size: 1.2rem;
}

.supply-task-card-review-panel-heading p {
  color: #5f5546;
  font-size: 0.86rem;
  font-weight: 800;
}

.supply-task-card-review-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 18.75rem));
  justify-content: center;
  gap: 1rem;
}

.supply-task-card {
  --task-card-accent: #3e9c35;
  --task-card-accent-dark: #14532d;
  --task-card-accent-soft: #dcfce7;
  --task-card-ink: #0f100e;
  position: relative;
  display: grid;
  grid-template-rows: 2.1rem auto minmax(0, 1fr) auto;
  gap: 0.45rem;
  width: min(100%, 18.75rem);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 4px solid var(--task-card-ink);
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.38), transparent 38%),
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.46), transparent 18%),
    #f2e5c7;
  box-shadow: 5px 5px 0 rgba(15, 16, 14, 0.9);
  color: var(--task-card-ink);
  padding: 0.78rem;
}

.supply-task-card--movement {
  --task-card-accent: #3e9c35;
  --task-card-accent-dark: #14532d;
  --task-card-accent-soft: #dcfce7;
}

.supply-task-card--hydration {
  --task-card-accent: #278bd6;
  --task-card-accent-dark: #075985;
  --task-card-accent-soft: #e0f2fe;
}

.supply-task-card--social {
  --task-card-accent: #e1ae20;
  --task-card-accent-dark: #92400e;
  --task-card-accent-soft: #fef3c7;
}

.supply-task-card--learning {
  --task-card-accent: #d9432f;
  --task-card-accent-dark: #991b1b;
  --task-card-accent-soft: #fee2e2;
}

.supply-task-card-corner {
  position: absolute;
  z-index: 2;
  width: 1.05rem;
  height: 1.05rem;
  border: 3px solid var(--task-card-ink);
  background: var(--task-card-accent);
}

.supply-task-card-corner--tl {
  top: 0.45rem;
  left: 0.45rem;
}

.supply-task-card-corner--tr {
  top: 0.45rem;
  right: 0.45rem;
}

.supply-task-card-band {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  border: 3px solid var(--task-card-ink);
  background: var(--task-card-accent);
  color: #fffef5;
  font-size: 0.82rem;
  font-weight: 1000;
  line-height: 1;
  text-shadow: 1px 1px 0 var(--task-card-ink);
}

.supply-task-card h3 {
  margin: 0;
  text-align: center;
  font-size: 1.45rem;
  font-weight: 1000;
  line-height: 1.05;
}

.supply-task-card-art {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 4px solid var(--task-card-ink);
  background: var(--task-card-accent-soft);
}

.supply-task-card-art img {
  object-fit: cover;
  object-position: center top;
  image-rendering: pixelated;
}

.supply-task-card-meta {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.36rem;
}

.supply-task-card-meta span {
  display: grid;
  min-height: 1.45rem;
  place-items: center;
  border: 2px solid var(--task-card-ink);
  background: #fff7ed;
  padding: 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 1000;
  line-height: 1;
}

.supply-task-card-meta span[data-level="轻"] {
  background: #22c55e;
  color: #fff;
}

.supply-task-card-meta span[data-level="中"] {
  background: #f59e0b;
  color: #111827;
}

.supply-task-card-reroll {
  position: absolute;
  right: 0.78rem;
  bottom: 0.78rem;
  border: 3px solid var(--task-card-ink);
  background: #facc15;
  box-shadow: 2px 2px 0 var(--task-card-ink);
  color: #111827;
  padding: 0.34rem 0.52rem;
  font-size: 0.72rem;
  font-weight: 1000;
  line-height: 1;
}

.supply-task-card-state {
  position: absolute;
  top: 3.28rem;
  right: 0.78rem;
  display: grid;
  min-width: 3.2rem;
  min-height: 1.45rem;
  place-items: center;
  border: 2px solid #fffef5;
  outline: 3px solid var(--task-card-ink);
  background: #3f9b2f;
  color: #fff;
  padding: 0 0.38rem;
  font-size: 0.68rem;
  font-weight: 1000;
  line-height: 1;
}

.supply-task-card-state[data-complete="false"] {
  background: #f59e0b;
  color: #111827;
}

.supply-task-card--dashboard {
  width: min(100%, 12.75rem);
  padding: 0.58rem;
  gap: 0.32rem;
  border-width: 3px;
  box-shadow: 3px 3px 0 rgba(15, 16, 14, 0.86);
}

.supply-task-card--dashboard .supply-task-card-band {
  min-height: 1.62rem;
  font-size: 0.68rem;
}

.supply-task-card--dashboard h3 {
  font-size: 1rem;
}

.supply-task-card--dashboard .supply-task-card-meta span,
.supply-task-card--dashboard .supply-task-card-reroll,
.supply-task-card--dashboard .supply-task-card-state {
  font-size: 0.58rem;
}

.supply-task-card-dashboard-preview-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.supply-task-card-dashboard-preview {
  display: grid;
  gap: 0.7rem;
  border: 4px solid #111827;
  background: #fff8e8;
  padding: 0.85rem;
}

.supply-task-card-dashboard-preview--compact {
  max-width: 34.25rem;
}

.supply-task-card-dashboard-preview--card-first {
  max-width: 42rem;
}

.supply-task-card-dashboard-preview-heading,
.supply-task-card-dashboard-preview footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.supply-task-card-dashboard-preview-heading strong {
  font-size: 1rem;
  font-weight: 1000;
}

.supply-task-card-dashboard-preview-heading span {
  border: 2px solid #111827;
  background: #facc15;
  padding: 0.25rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 1000;
}

.supply-task-card-dashboard-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  place-items: center;
  gap: 0.72rem;
}

.supply-task-card-dashboard-preview footer {
  border: 3px solid #c7b99d;
  background: rgba(255, 251, 241, 0.9);
  padding: 0.52rem 0.68rem;
}

.supply-task-card-dashboard-preview footer p {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.76rem;
  font-weight: 900;
}

.supply-task-card-dashboard-preview footer span {
  border: 2px solid #111827;
  background: #fff7ed;
  padding: 0.12rem 0.28rem;
}

.supply-task-card-dashboard-preview footer button {
  border: 3px solid #111827;
  background: #facc15;
  box-shadow: 2px 2px 0 #111827;
  padding: 0.35rem 0.62rem;
  font-weight: 1000;
}

@media (max-width: 960px) {
  .supply-task-card-review-header,
  .supply-task-card-dashboard-preview-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .supply-task-card-review-grid {
    grid-template-columns: repeat(2, minmax(0, 18.75rem));
  }
}

@media (max-width: 640px) {
  .supply-task-card-review-grid,
  .supply-task-card-dashboard-preview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 4: Run CSS and component tests**

Run:

```bash
npm test -- __tests__/supply-task-card-css.test.ts __tests__/supply-task-card-preview.test.tsx __tests__/supply-task-card-review-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/globals.css __tests__/supply-task-card-css.test.ts
git commit -m "style: add task card review styles"
```

Expected: commit includes only CSS and CSS test.

---

### Task 5: Dashboard Integration And Mock Data Fix

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `__tests__/supply-dashboard-mock-data.test.ts`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
- Modify: `__tests__/supply-dashboard-scene-css.test.ts`

- [ ] **Step 1: Update Dashboard mock-data test first**

In `__tests__/supply-dashboard-mock-data.test.ts`, add these assertions inside `it("covers the static Dashboard state required by the spec", () => { ... })` after the existing `dailyQuests` length assertions:

```ts
    expect(supplyDashboardMock.dailyQuests.map((quest) => [quest.id, quest.dimension, quest.title, quest.subtitle])).toEqual([
      ["movement_004", "movement", "窗边回血", "把电充绿"],
      ["hydration_003", "hydration", "杯子见底", "把尿喝白"],
      ["social_001", "social", "废话 KPI", "把事办黄"],
      ["learning_005", "learning", "一句话笔记", "把股看红"],
    ]);
```

In the `uses atomic art assets plus the shared topbar logo` test in `__tests__/supply-dashboard-scene.test.tsx`, keep the image source checks but expect the Dashboard cards to render through the new shared class:

```ts
    expect(container.querySelectorAll(".supply-dashboard-quest-card.supply-task-card")).toHaveLength(4);
    expect(Array.from(container.querySelectorAll(".supply-dashboard-quest-card")).map((card) => card.getAttribute("data-card-id"))).toEqual([
      "movement_004",
      "hydration_003",
      "social_001",
      "learning_005",
    ]);
```

- [ ] **Step 2: Run Dashboard tests to verify they fail**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL because movement/hydration mock data is currently crossed and Dashboard quest cards do not use `.supply-task-card`.

- [ ] **Step 3: Fix Dashboard mock data**

In `components/gamification/ui-lab/supply-dashboard/mock-data.ts`, replace the first two entries of `dailyQuests` and update the `id` values for all four demo cards:

```ts
  dailyQuests: [
    {
      id: "movement_004",
      dimension: "movement",
      title: "窗边回血",
      subtitle: "把电充绿",
      image: supplyDashboardAssetPaths.taskCards.movement,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "4天",
      completed: true,
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    },
    {
      id: "hydration_003",
      dimension: "hydration",
      title: "杯子见底",
      subtitle: "把尿喝白",
      image: supplyDashboardAssetPaths.taskCards.hydration,
      difficulty: "轻",
      tags: ["通用"],
      durationLabel: "2天",
      completed: true,
      reward: {
        icon: "🪙",
        label: "银子",
        amount: 20,
      },
    },
    {
      id: "social_001",
      dimension: "social",
      title: "废话 KPI",
      subtitle: "把事办黄",
      image: supplyDashboardAssetPaths.taskCards.social,
      difficulty: "轻",
      tags: ["办公室"],
      durationLabel: "3天",
      completed: true,
      reward: {
        icon: "券",
        label: "抽奖券",
        amount: 1,
      },
    },
    {
      id: "learning_005",
      dimension: "learning",
      title: "一句话笔记",
      subtitle: "把股看红",
      image: supplyDashboardAssetPaths.taskCards.learning,
      difficulty: "中",
      tags: ["通用"],
      durationLabel: "4天",
      completed: false,
      reward: {
        icon: "EXP",
        label: "经验",
        amount: 50,
      },
    },
  ],
```

- [ ] **Step 4: Replace local QuestCard markup with shared card component**

In `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, add the import:

```tsx
import { TaskCardPreview } from "@/components/gamification/ui-lab/task-cards/TaskCardPreview";
import type { SupplyTaskCardPreviewData } from "@/components/gamification/ui-lab/task-cards/types";
```

Add this helper above `QuestCard`:

```tsx
function toTaskCardPreviewData(quest: SupplyDashboardQuest): SupplyTaskCardPreviewData {
  return {
    id: quest.id,
    dimension: quest.dimension,
    slogan: quest.subtitle,
    title: quest.title,
    description: "",
    image: quest.image,
    difficulty: quest.difficulty,
    sceneLabel: (quest.tags[0] ?? "通用") as SupplyTaskCardPreviewData["sceneLabel"],
    cooldownLabel: quest.durationLabel,
    completed: quest.completed,
    aspectRatio: "3:4",
  };
}
```

Replace the `QuestCard` return body with:

```tsx
  return (
    <TaskCardPreview
      card={toTaskCardPreviewData(quest)}
      className={`supply-dashboard-quest-card supply-dashboard-quest-card--${index + 1}`}
      density="dashboard"
      onReroll={() => onReroll(quest.title)}
    />
  );
```

- [ ] **Step 5: Adjust Dashboard quest-list CSS for centered 3:4 cards**

In `app/globals.css`, update `.supply-dashboard-quest-list`:

```css
.supply-dashboard-quest-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  place-items: center;
  gap: clamp(0.45rem, 0.72vw, 0.68rem);
  min-height: 0;
  flex: 1;
}
```

Update `.supply-dashboard-quest-card` so it no longer duplicates the full old card layout:

```css
.supply-dashboard-quest-card {
  max-height: 100%;
}
```

Leave the `.supply-dashboard-quest-card--1` through `--4` reset block in place so older hotspot-positioning tests continue confirming there is no absolute screenshot layer.

- [ ] **Step 6: Update Dashboard CSS test**

In `__tests__/supply-dashboard-scene-css.test.ts`, change the quest card assertions inside `it("styles semantic dashboard components instead of transparent screenshot hotspots", () => { ... })`:

```ts
    expect(questHotspot).toMatch(/max-height:\s*100%/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-quest-list\s*{[\s\S]*place-items:\s*center/);
    expect(dashboardCss).toMatch(/\.supply-task-card\s*{[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
```

Remove these old expectations from that test:

```ts
    expect(questHotspot).toMatch(/display:\s*grid/);
    expect(questHotspot).toMatch(/border:\s*3px solid #111827/);
    expect(questHotspot).toMatch(/background:\s*#fff8e8\s*!important/);
    expect(questHotspot).toMatch(/color:\s*#111827\s*!important/);
```

- [ ] **Step 7: Run Dashboard integration tests**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add components/gamification/ui-lab/supply-dashboard/mock-data.ts components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx app/globals.css __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
git commit -m "feat: use 3x4 cards in supply dashboard"
```

Expected: commit includes only Dashboard integration changes and related tests.

---

### Task 6: Verification And Visual Review Prep

**Files:**
- No new source files unless visual review finds a concrete bug.

- [ ] **Step 1: Run targeted test suite**

Run:

```bash
npm test -- __tests__/supply-task-card-demo-data.test.ts __tests__/supply-task-card-preview.test.tsx __tests__/supply-task-card-review-route.test.ts __tests__/supply-task-card-review-scene.test.tsx __tests__/supply-task-card-css.test.ts __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS for all listed tests.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build completes successfully with no TypeScript or Next.js route errors.

- [ ] **Step 3: Start local dev server for visual review**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 3001
```

Expected: dev server serves `http://127.0.0.1:3001`.

- [ ] **Step 4: Review the contact sheet route in browser**

Open:

```txt
http://127.0.0.1:3001/ui-lab/supply-dashboard/task-card-review
```

Expected visual checks:

- Four contact-sheet cards are visibly `3:4`.
- Dimension colors are distinct.
- Chinese slogan/title/tags are readable.
- Art is cropped inside the art window, not stretched.
- `已完成 / 进行中` and `换一个` controls do not cover the title or main art subject.
- Compact and Card-first Dashboard placement previews are both visible.

- [ ] **Step 5: Review the real Dashboard route in browser**

Open:

```txt
http://127.0.0.1:3001/ui-lab/supply-dashboard
```

Expected visual checks:

- 今日主线 still shows four cards in 2x2.
- Every task card keeps `3:4`; no card is squashed.
- Progress header, card grid, reward footer, and CTA do not overlap.
- Movement card is `窗边回血`; hydration card is `杯子见底`.

- [ ] **Step 6: Commit visual fixes if needed**

If visual review requires CSS-only sizing changes, make the smallest CSS edit and run:

```bash
npm test -- __tests__/supply-task-card-css.test.ts __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

Then commit only the fix:

```bash
git add app/globals.css
git commit -m "style: tune task card dashboard placement"
```

Expected: commit includes only visual sizing CSS.
