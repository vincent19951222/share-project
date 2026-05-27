# Supply UI Lab Dashboard Static Business Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Supply UI Lab `我的状态` Dashboard page into Phase 2 business vocabulary, shared fixture usage, and local mock interaction readiness.

**Architecture:** Keep all changes isolated to the UI Lab Dashboard static scene. Reuse the shared Phase 2 fixtures produced by tasks 1-3 (`supplyUiLabResources.dashboard` and `supplyUiLabActiveEffects`) instead of duplicating resource and effect data. Convert only the Dashboard scene to a client component so reroll and reward buttons can show local mock feedback without calling API routes or mutating persistent data.

**Tech Stack:** Next.js 15 App Router, React 19 client component state, TypeScript strict mode, Vitest + jsdom, existing Supply UI Lab CSS and primitives.

---

## Scope

This plan implements the approved task-level spec:

`docs/superpowers/specs/2026-05-18-supply-ui-lab-task-04-dashboard-design.md`

It is the focused execution plan for Task 4 from:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`

## Assumptions

Tasks 1-3 are already complete. The following shared files already exist and are expected to pass their focused tests:

- `components/gamification/ui-lab/supply-data/types.ts`
- `components/gamification/ui-lab/supply-data/resources.ts`
- `components/gamification/ui-lab/supply-data/effects.ts`
- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- `__tests__/supply-ui-lab-catalog.test.ts`
- `__tests__/supply-ui-lab-primitives.test.tsx`
- `__tests__/supply-ui-lab-static-business-closure.test.tsx`

Do not try to make the global static business closure guardrail pass in this task. It may still fail because tasks 5-9 have not cleaned Backpack, Shop, Draw Pool, Task Record, and Team Goal yet.

## File Structure

- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
  - Replace the Dashboard-only resource id union with the shared Phase 2 resource ids.
  - Replace `exp` with `totalExp` and `currentLevelExp`.
  - Use the shared active effect shape so Dashboard and Backpack can share the same fixture.
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`
  - Import `supplyUiLabResources.dashboard`.
  - Import `supplyUiLabActiveEffects`.
  - Remove rendered references to `体力`, `补给券`, and `生命票`.
  - Set backpack capacity to `18/60`.
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - Add `"use client";`.
  - Render `牛马等级`, shared active effect source, summary, status, and end time.
  - Remove help, feedback, and settings entry points.
  - Add local mock feedback for task reroll and reward claim buttons.
- Modify: `__tests__/supply-dashboard-mock-data.test.ts`
  - Assert Phase 2 resource labels, level math fields, active effect fixture sharing, and banned vocabulary removal.
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
  - Assert rendered Phase 2 vocabulary and absence of old entry points.
  - Assert local mock feedback appears after button clicks.
- Optionally modify: `__tests__/supply-dashboard-scene-css.test.ts`
  - Only update if the existing CSS assertion has drifted from the shared topbar layout.

## Task 1: Update Dashboard Contract Tests First

**Files:**
- Modify: `__tests__/supply-dashboard-mock-data.test.ts`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`

- [ ] **Step 1: Import the shared effect fixture in the mock data test**

In `__tests__/supply-dashboard-mock-data.test.ts`, add this import:

```typescript
import { supplyUiLabActiveEffects } from "@/components/gamification/ui-lab/supply-data/effects";
```

Keep the existing import:

```typescript
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";
```

- [ ] **Step 2: Replace the Dashboard state expectations**

In `__tests__/supply-dashboard-mock-data.test.ts`, inside `it("covers the static Dashboard state required by the spec", () => { ... })`, replace the current assertions with:

```typescript
expect(supplyDashboardMock.dailyQuests).toHaveLength(4);
expect(supplyDashboardMock.dailyQuests.filter((quest) => quest.completed)).toHaveLength(3);
expect(supplyDashboardMock.dailyQuests.some((quest) => !quest.completed)).toBe(true);
expect(supplyDashboardMock.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
expect(supplyDashboardMock.resources.map((resource) => resource.id)).toEqual(["coins", "ticket", "backpack"]);
expect(supplyDashboardMock.inventoryPreview.usedSlots).toBe(18);
expect(supplyDashboardMock.inventoryPreview.totalSlots).toBe(60);
expect(supplyDashboardMock.supplyPreview.remainingDraws).toBe(999);
expect(supplyDashboardMock.profile.totalExp).toBe(27_720);
expect(supplyDashboardMock.profile.level).toBe(28);
expect(supplyDashboardMock.profile.currentLevelExp).toBe(720);
expect(supplyDashboardMock.profile.nextLevelExp).toBe(1000);
expect(supplyDashboardMock.activeEffects).toBe(supplyUiLabActiveEffects);
expect(supplyDashboardMock.activeEffects).toHaveLength(2);
expect(supplyDashboardMock.activeEffects.every((effect) => effect.endsAtLabel === "今日 23:59")).toBe(true);
expect(JSON.stringify(supplyDashboardMock)).not.toContain("补给券");
expect(JSON.stringify(supplyDashboardMock)).not.toContain("生命票");
expect(JSON.stringify(supplyDashboardMock)).not.toContain("体力");
```

- [ ] **Step 3: Add rendered vocabulary assertions**

In `__tests__/supply-dashboard-scene.test.tsx`, inside `it("renders the isolated layered Dashboard scene from static mock data", async () => { ... })`, replace the old energy resource assertion:

```typescript
expect(container.querySelector(".supply-ui-lab-resource--energy")?.textContent).toContain("18/100");
```

with:

```typescript
expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
```

Then replace:

```typescript
expect(container.querySelectorAll(".supply-dashboard-effect-card")).toHaveLength(3);
```

with:

```typescript
expect(container.querySelectorAll(".supply-dashboard-effect-card")).toHaveLength(2);
expect(container.textContent).toContain("牛马等级");
expect(container.textContent).toContain("今日待生效");
expect(container.textContent).toContain("今日已生效");
expect(container.textContent).toContain("今日 23:59");
expect(container.textContent).not.toContain("补给券");
expect(container.textContent).not.toContain("生命票");
expect(container.textContent).not.toContain("体力");
expect(container.textContent).not.toContain("帮助中心");
expect(container.textContent).not.toContain("意见反馈");
expect(container.textContent).not.toContain("设置");
expect(container.querySelector('a[href="#help"]')).toBeNull();
expect(container.querySelector('a[href="#feedback"]')).toBeNull();
```

- [ ] **Step 4: Add local feedback interaction test**

Append this test inside `describe("supply dashboard static scene", () => { ... })` in `__tests__/supply-dashboard-scene.test.tsx`:

```typescript
it("shows local mock feedback for reroll and reward claim actions", async () => {
  await act(async () => {
    root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
  });

  const feedback = container.querySelector("[data-dashboard-feedback]");
  expect(feedback?.textContent).toContain("本地预览");

  const rerollButton = container.querySelector<HTMLButtonElement>(".supply-dashboard-quest-reroll");
  expect(rerollButton).not.toBeNull();

  await act(async () => {
    rerollButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("已触发换班预览");

  const claimButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    button.textContent?.includes("领取奖励"),
  );
  expect(claimButton).toBeDefined();

  await act(async () => {
    claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("奖励领取预览");
});
```

- [ ] **Step 5: Run the focused Dashboard tests and verify failure**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx
```

Expected: FAIL. The failures should mention old Dashboard resource/effect fields, missing `牛马等级`, old help links, or missing local feedback.

## Task 2: Update Dashboard Types And Mock Data

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`

- [ ] **Step 1: Replace the Dashboard type file**

Replace the full contents of `components/gamification/ui-lab/supply-dashboard/types.ts` with:

```typescript
import type {
  SupplyUiLabActiveEffect,
  SupplyUiLabResourceId,
} from "../supply-data/types";

export type SupplyDashboardResource = {
  id: SupplyUiLabResourceId;
  label: string;
  value: number;
  maxValue?: number;
  icon: string;
};

export type SupplyDashboardActiveEffect = SupplyUiLabActiveEffect;

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

export type SupplyDashboardShortcutLink = {
  id: "home" | "backpack" | "draw-pool" | "task-record";
  href: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string | null;
};

export type SupplyDashboardPreview = {
  profile: {
    username: string;
    avatar: string;
    title: string;
    level: number;
    totalExp: number;
    currentLevelExp: number;
    nextLevelExp: number;
    streakDays: number;
  };
  motto: string;
  resources: SupplyDashboardResource[];
  activeEffects: SupplyDashboardActiveEffect[];
  dailyQuests: SupplyDashboardQuest[];
  shortcutLinks: SupplyDashboardShortcutLink[];
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

- [ ] **Step 2: Import shared fixtures in mock data**

At the top of `components/gamification/ui-lab/supply-dashboard/mock-data.ts`, replace:

```typescript
import type { SupplyDashboardPreview } from "./types";
```

with:

```typescript
import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyDashboardPreview, SupplyDashboardResource } from "./types";
```

- [ ] **Step 3: Add a shared resource mapper**

In `components/gamification/ui-lab/supply-dashboard/mock-data.ts`, after `supplyDashboardAssetPaths`, add:

```typescript
function toDashboardResource(resource: { id: string; label: string; value: string; icon: string }): SupplyDashboardResource {
  const [currentValue, maxValue] = resource.value.split("/");

  return {
    id: resource.id as SupplyDashboardResource["id"],
    label: resource.label,
    value: Number(currentValue.replace(/,/g, "")),
    maxValue: maxValue === undefined ? undefined : Number(maxValue.replace(/,/g, "")),
    icon: resource.icon,
  };
}
```

- [ ] **Step 4: Replace profile fields**

In `supplyDashboardMock.profile`, replace:

```typescript
exp: 720,
nextLevelExp: 1000,
```

with:

```typescript
totalExp: 27720,
currentLevelExp: 720,
nextLevelExp: 1000,
```

This matches the spec formula:

```text
level = floor(totalExp / 1000) + 1
currentLevelExp = totalExp % 1000
nextLevelExp = 1000
```

- [ ] **Step 5: Replace resources with shared Phase 2 resources**

In `supplyDashboardMock`, replace the full `resources: [...]` array with:

```typescript
resources: supplyUiLabResources.dashboard.map(toDashboardResource),
```

- [ ] **Step 6: Replace active effects with the shared fixture**

In `supplyDashboardMock`, replace the full `activeEffects: [...]` array with:

```typescript
activeEffects: supplyUiLabActiveEffects,
```

- [ ] **Step 7: Replace old ticket and capacity vocabulary in mock data**

In `supplyDashboardMock.dailyQuests`, change the social quest reward:

```typescript
reward: {
  icon: "券",
  label: "抽奖券",
  amount: 1,
},
```

In `supplyDashboardMock.shortcutLinks`, update the backpack badge:

```typescript
badge: "18/60",
```

In the draw pool shortcut, replace the subtitle:

```typescript
subtitle: "随机获取道具、银子或真实福利！",
```

In `supplyDashboardMock.inventoryPreview`, update capacity:

```typescript
usedSlots: 18,
totalSlots: 60,
```

In `supplyDashboardMock.supplyPreview.featuredRewards`, replace the `ticket` item:

```typescript
{
  id: "ticket",
  name: "抽奖券",
  icon: "券",
  quantity: 1,
},
```

- [ ] **Step 8: Run the mock data test and verify the data contract passes**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts
```

Expected: PASS.

## Task 3: Update Dashboard Scene Rendering And Local Feedback

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`

- [ ] **Step 1: Convert the scene to a client component**

At the top of `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, before imports, add:

```typescript
"use client";
```

Then add the React import:

```typescript
import { useState } from "react";
```

- [ ] **Step 2: Render 牛马等级 in the status panel**

In `CharacterStatusPanel`, replace:

```tsx
<div className="supply-dashboard-title-card">
  <span>称号</span>
  <strong>
    {data.profile.title}
    <b aria-hidden="true">◎</b>
  </strong>
</div>
```

with:

```tsx
<div className="supply-dashboard-title-card">
  <span>称号 / 牛马等级</span>
  <strong>
    {data.profile.title}
    <b>Lv.{data.profile.level}</b>
  </strong>
</div>
```

- [ ] **Step 3: Render shared active effect details**

In `CharacterStatusPanel`, replace the effect card body:

```tsx
<span aria-hidden="true">{effect.icon}</span>
<div>
  <strong>
    {effect.label} {effect.value}
  </strong>
  <time>{effect.expiresIn}</time>
</div>
```

with:

```tsx
<span aria-hidden="true">效</span>
<div>
  <strong>{effect.label}</strong>
  <small>{effect.businessSource}</small>
  <p>{effect.effectSummary}</p>
  <time>
    {effect.statusLabel} · {effect.endsAtLabel}
  </time>
</div>
```

- [ ] **Step 4: Use currentLevelExp for hero progress**

In `HeroCharacterStage`, replace:

```typescript
const remainingExp = data.profile.nextLevelExp - data.profile.exp;
```

with:

```typescript
const remainingExp = data.profile.nextLevelExp - data.profile.currentLevelExp;
```

Then replace:

```tsx
<SupplyUiLabProgress current={data.profile.exp} label="等级经验" max={data.profile.nextLevelExp} />
```

with:

```tsx
<SupplyUiLabProgress current={data.profile.currentLevelExp} label="等级经验" max={data.profile.nextLevelExp} />
```

- [ ] **Step 5: Add reroll feedback callback to QuestCard**

Change the `QuestCard` function signature from:

```typescript
function QuestCard({ quest, index }: { quest: SupplyDashboardQuest; index: number }) {
```

to:

```typescript
function QuestCard({
  index,
  onReroll,
  quest,
}: {
  index: number;
  onReroll: (questTitle: string) => void;
  quest: SupplyDashboardQuest;
}) {
```

Then replace the reroll button:

```tsx
<button className="supply-dashboard-quest-reroll" type="button" aria-label={`更换任务：${quest.title}`}>
  换
</button>
```

with:

```tsx
<button
  className="supply-dashboard-quest-reroll"
  onClick={() => onReroll(quest.title)}
  type="button"
  aria-label={`更换任务：${quest.title}`}
>
  换
</button>
```

- [ ] **Step 6: Add reward claim feedback to DailyQuestPanel**

Change the `DailyQuestPanel` function signature from:

```typescript
function DailyQuestPanel({ quests }: { quests: SupplyDashboardQuest[] }) {
```

to:

```typescript
function DailyQuestPanel({
  onClaimRewards,
  onRerollQuest,
  quests,
}: {
  onClaimRewards: () => void;
  onRerollQuest: (questTitle: string) => void;
  quests: SupplyDashboardQuest[];
}) {
```

Replace the quest render call:

```tsx
<QuestCard index={index} key={quest.id} quest={quest} />
```

with:

```tsx
<QuestCard index={index} key={quest.id} onReroll={onRerollQuest} quest={quest} />
```

Replace the reward footer copy:

```tsx
<span>券 1</span>
```

with:

```tsx
<span>抽奖券 1</span>
```

Replace the footer button:

```tsx
<SupplyUiLabActionButton tone="primary">已领取</SupplyUiLabActionButton>
```

with a native button that preserves the existing primitive classes and adds local click behavior:

```tsx
<button
  className="supply-ui-lab-action supply-ui-lab-action--primary"
  onClick={onClaimRewards}
  type="button"
>
  领取奖励
</button>
```

- [ ] **Step 7: Remove unused primitive import**

At the top of `SupplyDashboardScene.tsx`, remove `SupplyUiLabActionButton` from this import:

```typescript
import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
} from "./SupplyUiLabPrimitives";
```

The import should become:

```typescript
import {
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
} from "./SupplyUiLabPrimitives";
```

- [ ] **Step 8: Remove help, feedback, and settings entry points**

In `TeamAnnouncementBar`, replace:

```tsx
<aside className="supply-dashboard-announcement" aria-label="团队公告">
  <span aria-hidden="true">📣</span>
  <p>{message}</p>
  <nav aria-label="补给站帮助入口">
    <a href="#help">帮助中心</a>
    <a href="#feedback">意见反馈</a>
    <button type="button" aria-label="打开设置">⚙</button>
  </nav>
</aside>
```

with:

```tsx
<aside className="supply-dashboard-announcement" aria-label="团队公告">
  <span aria-hidden="true">📣</span>
  <p>{message}</p>
</aside>
```

- [ ] **Step 9: Add local feedback state to the scene root**

Inside `SupplyDashboardScene`, before the `return`, add:

```typescript
const [feedbackMessage, setFeedbackMessage] = useState("本地预览：任务换班和奖励领取不会写入后端。");

function handleRerollQuest(questTitle: string) {
  setFeedbackMessage(`已触发换班预览：${questTitle}。mock 数据保持不变。`);
}

function handleClaimRewards() {
  setFeedbackMessage("奖励领取预览：EXP、银子和抽奖券只展示反馈，不写入后端。");
}
```

Then replace:

```tsx
<DailyQuestPanel quests={data.dailyQuests} />
```

with:

```tsx
<DailyQuestPanel
  onClaimRewards={handleClaimRewards}
  onRerollQuest={handleRerollQuest}
  quests={data.dailyQuests}
/>
```

After the `DailyQuestPanel` call and before `DashboardShortcutDock`, add:

```tsx
<p aria-live="polite" className="supply-dashboard-local-feedback" data-dashboard-feedback>
  {feedbackMessage}
</p>
```

- [ ] **Step 10: Run the Dashboard scene test and verify it passes**

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx
```

Expected: PASS.

## Task 4: Focused Verification

**Files:**
- Optionally modify: `__tests__/supply-dashboard-scene-css.test.ts`

- [ ] **Step 1: Run Dashboard focused verification**

Run:

```bash
npm test -- __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Update CSS assertion only if needed**

If `__tests__/supply-dashboard-scene-css.test.ts` fails only because the topbar padding assertion expects an old value, update that assertion to:

```typescript
expect(content).toMatch(/padding:\s*var\(--supply-ui-lab-topbar-height\)\s*0\s*0/);
```

Then rerun:

```bash
npm test -- __tests__/supply-dashboard-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run shared data and primitive regression tests**

Run:

```bash
npm test -- __tests__/supply-ui-lab-catalog.test.ts __tests__/supply-ui-lab-primitives.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run typecheck/lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Check global guardrail status without requiring it to pass**

Run:

```bash
npm test -- __tests__/supply-ui-lab-static-business-closure.test.tsx
```

Expected: It may still FAIL because tasks 5-9 are not complete. Acceptable result for task04 is either:

- PASS if tasks 5-9 have already cleaned the remaining scenes.
- FAIL only on non-Dashboard rendered terms or anchors.

If the failure output mentions Dashboard text, fix Dashboard before completing task04.

## Task 5: Stage And Commit Task 4

**Files:**
- Stage only files touched by this task.

- [ ] **Step 1: Review changed files**

Run:

```bash
git status --short
```

Expected: Changes should be limited to:

```text
 M __tests__/supply-dashboard-mock-data.test.ts
 M __tests__/supply-dashboard-scene.test.tsx
 M components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx
 M components/gamification/ui-lab/supply-dashboard/mock-data.ts
 M components/gamification/ui-lab/supply-dashboard/types.ts
```

`__tests__/supply-dashboard-scene-css.test.ts` may also appear if Step 4.2 required it.

- [ ] **Step 2: Stage task04 files**

Run:

```bash
git add components/gamification/ui-lab/supply-dashboard/types.ts components/gamification/ui-lab/supply-dashboard/mock-data.ts components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx __tests__/supply-dashboard-mock-data.test.ts __tests__/supply-dashboard-scene.test.tsx
```

If CSS test was updated, also run:

```bash
git add __tests__/supply-dashboard-scene-css.test.ts
```

- [ ] **Step 3: Commit**

Run:

```bash
git commit -m "feat: close supply dashboard mock business rules"
```

Expected: Commit succeeds and includes only task04 Dashboard changes.

## Acceptance Checklist

- [ ] Dashboard topbar renders `银子 / 抽奖券 / 背包`.
- [ ] Dashboard rendered text includes `牛马等级`.
- [ ] Dashboard rendered text does not include `体力`, `补给券`, `生命票`, `帮助中心`, `意见反馈`, or `设置`.
- [ ] Dashboard backpack preview capacity is `60`.
- [ ] Dashboard `activeEffects` directly references `supplyUiLabActiveEffects`.
- [ ] Today effects show item source, effect summary, status, and end time.
- [ ] Task reroll button shows local mock feedback.
- [ ] Reward claim button shows local mock feedback.
- [ ] No Prisma, API route, session, or production navigation changes are made.

## Self-Review

Spec coverage:

- Topbar vocabulary is covered by Task 1.2, Task 2.5, and Task 1.3.
- Removal of `体力`, `补给券`, and `生命票` is covered by Task 1.2, Task 1.3, Task 2.7, and Task 3.6.
- Removal of help, feedback, and settings is covered by Task 1.3 and Task 3.8.
- `牛马等级` is covered by Task 1.3 and Task 3.2.
- Today effect source, summary, status, and end time are covered by Task 3.3.
- Local mock feedback is covered by Task 1.4 and Task 3.5-3.9.
- Shared fixtures are covered by Task 1.2, Task 2.5, and Task 2.6.

Placeholder scan:

- No unresolved placeholders are required for implementation.
- Every changed behavior has a concrete test, code snippet, and verification command.

Type consistency:

- `SupplyDashboardActiveEffect` aliases `SupplyUiLabActiveEffect`, so Dashboard effect rendering uses fields already defined in `components/gamification/ui-lab/supply-data/types.ts`.
- Dashboard resources use `SupplyUiLabResourceId`, matching `coins`, `ticket`, and `backpack` from `supplyUiLabResources.dashboard`.
