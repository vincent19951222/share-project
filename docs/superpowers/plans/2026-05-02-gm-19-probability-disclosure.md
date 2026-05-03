# GM-19 Probability Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, read-only lottery probability disclosure to the Docs Center and link to it from the Supply Station lottery area.

**Architecture:** Build one pure probability disclosure helper from the existing reward pool and item definitions, then render it inside `GamificationDocsSection`. Extend docs facts and table-of-contents anchors so the disclosure is deep-linkable and testable without adding APIs, database models, or gameplay changes.

**Tech Stack:** Next.js App Router, TypeScript, React, static content modules, Vitest + jsdom.

---

## File Structure

- `lib/gamification/probability-disclosure.ts`
  - New pure helper that derives active reward probability, tier weights, disabled rewards, direct coin EV, and explanatory notes from current content definitions.
- `__tests__/gamification-probability-disclosure.test.ts`
  - Unit tests for the helper.
- `content/docs-center/gamification.ts`
  - Add GM-19 probability facts and a concise rule block.
- `components/docs-center/GamificationDocsSection.tsx`
  - Render the probability disclosure section from the helper.
- `components/docs-center/DocsCenter.tsx`
  - Add `抽奖概率说明` to the rules table of contents.
- `components/gamification/SupplyStation.tsx`
  - Add a `查看抽奖概率` link in the lottery area.
- `__tests__/docs-center-gamification-content.test.ts`
  - Assert GM-19 facts are required and present.
- `__tests__/docs-center-gamification-section.test.tsx`
  - Assert the probability section renders.
- `__tests__/docs-center.test.tsx`
  - Assert the table of contents links to the probability section.
- `__tests__/supply-station-shell.test.tsx`
  - Assert the Supply Station links to the probability section.
- `docs/gamification-dev-roadmap.md`
  - Add GM-19 to the roadmap.
- `docs/gamification-acceptance-checklist.md`
  - Add GM-19 acceptance checks.

---

### Task 1: Probability Disclosure Helper

**Files:**
- Create: `lib/gamification/probability-disclosure.ts`
- Test: `__tests__/gamification-probability-disclosure.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `__tests__/gamification-probability-disclosure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGamificationProbabilityDisclosure } from "@/lib/gamification/probability-disclosure";

describe("gamification probability disclosure", () => {
  it("summarizes the active reward pool weights and direct coin expected value", () => {
    const disclosure = buildGamificationProbabilityDisclosure();

    expect(disclosure.activeTotalWeight).toBe(100);
    expect(disclosure.directCoinExpectedValue).toBeCloseTo(8.75, 5);
    expect(disclosure.tierWeights).toEqual([
      { tier: "coin", weight: 45, probabilityLabel: "45%" },
      { tier: "utility", weight: 27, probabilityLabel: "27%" },
      { tier: "social", weight: 24, probabilityLabel: "24%" },
      { tier: "cosmetic", weight: 0, probabilityLabel: "0%" },
      { tier: "rare", weight: 4, probabilityLabel: "4%" },
    ]);
    expect(disclosure.activeRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "coins_005",
          name: "摸鱼津贴",
          weight: 15,
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
        }),
        expect.objectContaining({
          id: "reward_luckin_coffee",
          name: "瑞幸咖啡券",
          weight: 1,
          probabilityLabel: "1%",
          effectSummary: "获得 1 个瑞幸咖啡券兑换资格",
        }),
      ]),
    );
    expect(disclosure.activeRewards).toHaveLength(18);
  });

  it("separates disabled rewards, inactive item notes, and required docs facts", () => {
    const disclosure = buildGamificationProbabilityDisclosure();

    expect(disclosure.disabledRewards).toEqual([
      expect.objectContaining({
        id: "reward_today_title",
        name: "今日称号",
        probabilityLabel: "0%",
        effectSummary: "获得称号 legal_slacker",
      }),
    ]);
    expect(disclosure.inactiveItemNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: "single_draw_guarantee_coupon", itemName: "保底升级券" }),
        expect.objectContaining({ itemId: "ticket_discount_90", itemName: "九折购券卡" }),
        expect.objectContaining({ itemId: "hydration_bonus", itemName: "补水加班费" }),
        expect.objectContaining({ itemId: "movement_bonus", itemName: "站立补贴" }),
      ]),
    );
    expect(disclosure.requiredFacts).toEqual(
      expect.arrayContaining([
        "active_reward_total_weight=100",
        "active_reward_tier_weights=coin45_utility27_social24_cosmetic0_rare4",
        "direct_coin_ev=8.75",
        "probability_disclosure_weights_are_relative",
        "disabled_rewards_not_drawable",
        "unsupported_items_not_in_active_pool",
      ]),
    );
  });
});
```

- [ ] **Step 2: Run helper tests to verify RED**

Run:

```bash
npm test -- __tests__/gamification-probability-disclosure.test.ts
```

Expected: FAIL because `@/lib/gamification/probability-disclosure` does not exist.

- [ ] **Step 3: Implement the helper**

Create `lib/gamification/probability-disclosure.ts`:

```ts
import type { ItemDefinition, RewardDefinition, RewardEffect, RewardTier } from "@/content/gamification/types";
import { getItemDefinitions, getRewardDefinitions } from "@/lib/gamification/content";

const TIER_ORDER: RewardTier[] = ["coin", "utility", "social", "cosmetic", "rare"];

const INACTIVE_ITEM_NOTE_IDS = [
  "single_draw_guarantee_coupon",
  "ticket_discount_90",
  "hydration_bonus",
  "movement_bonus",
] as const;

export const GAMIFICATION_PROBABILITY_REQUIRED_FACTS = [
  "active_reward_total_weight=100",
  "active_reward_tier_weights=coin45_utility27_social24_cosmetic0_rare4",
  "direct_coin_ev=8.75",
  "probability_disclosure_weights_are_relative",
  "disabled_rewards_not_drawable",
  "unsupported_items_not_in_active_pool",
] as const;

export interface GamificationProbabilityTierWeight {
  tier: RewardTier;
  weight: number;
  probabilityLabel: string;
}

export interface GamificationProbabilityRewardRow {
  id: string;
  tier: RewardTier;
  kind: string;
  rarity: string;
  name: string;
  description: string;
  weight: number;
  probability: number;
  probabilityLabel: string;
  effectSummary: string;
}

export interface GamificationProbabilityInactiveItemNote {
  itemId: string;
  itemName: string;
  reason: string;
}

export interface GamificationProbabilityDisclosure {
  activeTotalWeight: number;
  tierWeights: GamificationProbabilityTierWeight[];
  directCoinExpectedValue: number;
  activeRewards: GamificationProbabilityRewardRow[];
  disabledRewards: GamificationProbabilityRewardRow[];
  inactiveItemNotes: GamificationProbabilityInactiveItemNote[];
  notes: string[];
  requiredFacts: string[];
}

function formatProbability(probability: number) {
  if (probability === 0) {
    return "0%";
  }

  const percent = probability * 100;
  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`;
}

function rewardEffectSummary(effect: RewardEffect, itemNameById: Map<string, string>) {
  switch (effect.type) {
    case "grant_coins":
      return `获得 ${effect.amount} 银子`;
    case "grant_item":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}`;
    case "grant_real_world_redemption":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}兑换资格`;
    case "grant_title":
      return `获得称号 ${effect.titleId}`;
  }
}

function toRewardRow(
  reward: RewardDefinition,
  activeTotalWeight: number,
  itemNameById: Map<string, string>,
): GamificationProbabilityRewardRow {
  const probability = reward.enabled && activeTotalWeight > 0 ? reward.weight / activeTotalWeight : 0;

  return {
    id: reward.id,
    tier: reward.tier,
    kind: reward.kind,
    rarity: reward.rarity,
    name: reward.name,
    description: reward.description,
    weight: reward.weight,
    probability,
    probabilityLabel: formatProbability(probability),
    effectSummary: rewardEffectSummary(reward.effect, itemNameById),
  };
}

function inactiveItemReason(item: ItemDefinition) {
  switch (item.effect.type) {
    case "lottery_guarantee":
      return "道具定义已存在，但当前版本还没有接入使用闭环。";
    case "ticket_discount":
      return "道具定义已存在，但当前补券规则还没有接入折扣卡。";
    case "dimension_coin_bonus":
      return "道具定义已存在，但当前四维任务还没有接入维度加成结算。";
    default:
      return "当前版本未进入 active 奖池。";
  }
}

export function buildGamificationProbabilityDisclosure(): GamificationProbabilityDisclosure {
  const rewards = getRewardDefinitions();
  const items = getItemDefinitions();
  const itemNameById = new Map(items.map((item) => [item.id, item.name]));
  const activeRewards = rewards.filter((reward) => reward.enabled);
  const disabledRewards = rewards.filter((reward) => !reward.enabled);
  const activeTotalWeight = activeRewards.reduce((total, reward) => total + reward.weight, 0);
  const tierWeights = TIER_ORDER.map((tier) => {
    const weight = activeRewards
      .filter((reward) => reward.tier === tier)
      .reduce((total, reward) => total + reward.weight, 0);

    return {
      tier,
      weight,
      probabilityLabel: formatProbability(activeTotalWeight > 0 ? weight / activeTotalWeight : 0),
    };
  });
  const directCoinExpectedValue = activeRewards.reduce((total, reward) => {
    if (reward.effect.type !== "grant_coins" || activeTotalWeight === 0) {
      return total;
    }

    return total + (reward.weight / activeTotalWeight) * reward.effect.amount;
  }, 0);
  const inactiveItemNotes = INACTIVE_ITEM_NOTE_IDS.flatMap((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return item
      ? [
          {
            itemId: item.id,
            itemName: item.name,
            reason: inactiveItemReason(item),
          },
        ]
      : [];
  });

  return {
    activeTotalWeight,
    tierWeights,
    directCoinExpectedValue,
    activeRewards: activeRewards.map((reward) => toRewardRow(reward, activeTotalWeight, itemNameById)),
    disabledRewards: disabledRewards.map((reward) => toRewardRow(reward, activeTotalWeight, itemNameById)),
    inactiveItemNotes,
    notes: [
      "当前 active 奖池总权重为 100，所以权重可以近似理解为百分比。",
      "单抽没有保底；十连保留 GM-06 的实用道具、弱社交道具或稀有以上奖励保底。",
      "抽奖能抽到银子，但直接银子期望低于补券成本，不设计为无限套利入口。",
      "disabled rewards 和未接入使用闭环的道具不会进入当前 active 奖池。",
    ],
    requiredFacts: [...GAMIFICATION_PROBABILITY_REQUIRED_FACTS],
  };
}
```

- [ ] **Step 4: Run helper tests to verify GREEN**

Run:

```bash
npm test -- __tests__/gamification-probability-disclosure.test.ts
```

Expected: PASS with 1 test file and 2 tests.

- [ ] **Step 5: Commit helper slice**

Run:

```bash
git add lib/gamification/probability-disclosure.ts __tests__/gamification-probability-disclosure.test.ts
git commit -m "feat: add gamification probability disclosure helper"
```

---

### Task 2: Docs Facts And Rendering

**Files:**
- Modify: `content/docs-center/gamification.ts`
- Modify: `components/docs-center/GamificationDocsSection.tsx`
- Modify: `components/docs-center/DocsCenter.tsx`
- Test: `__tests__/docs-center-gamification-content.test.ts`
- Test: `__tests__/docs-center-gamification-section.test.tsx`
- Test: `__tests__/docs-center.test.tsx`

- [ ] **Step 1: Write failing docs content tests**

Modify `__tests__/docs-center-gamification-content.test.ts` to import the helper facts:

```ts
import { GAMIFICATION_PROBABILITY_REQUIRED_FACTS } from "@/lib/gamification/probability-disclosure";
```

Add this test:

```ts
  it("keeps probability disclosure facts in the rules", () => {
    const facts = new Set(gamificationDocs.rules.flatMap((rule) => rule.facts));

    for (const fact of GAMIFICATION_PROBABILITY_REQUIRED_FACTS) {
      expect(facts.has(fact)).toBe(true);
    }
  });
```

- [ ] **Step 2: Write failing component and TOC tests**

Modify the first test in `__tests__/docs-center-gamification-section.test.tsx` by adding these assertions:

```ts
    expect(container.textContent).toContain("抽奖概率说明");
    expect(container.textContent).toContain("Active 奖池总权重");
    expect(container.textContent).toContain("coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4");
    expect(container.textContent).toContain("直接银子期望 8.75");
    expect(container.textContent).toContain("摸鱼津贴");
    expect(container.textContent).toContain("今日称号");
```

Modify the stable anchors test in `__tests__/docs-center-gamification-section.test.tsx` by adding:

```ts
    expect(container.querySelector("#supply-station-probability")).not.toBeNull();
```

Modify `__tests__/docs-center.test.tsx` in the `shows gamification rules inside the docs center` test by adding:

```ts
    expect(container.textContent).toContain("抽奖概率说明");
    expect(container.querySelector("#supply-station-probability")).not.toBeNull();
    expect(container.querySelector('a[href="/docs?tab=rules#supply-station-probability"]')).not.toBeNull();
```

- [ ] **Step 3: Run docs tests to verify RED**

Run:

```bash
npm test -- __tests__/docs-center-gamification-content.test.ts __tests__/docs-center-gamification-section.test.tsx __tests__/docs-center.test.tsx
```

Expected: FAIL because probability facts, rendered section, anchor, and TOC link do not exist yet.

- [ ] **Step 4: Add probability facts and rule block**

Modify `content/docs-center/gamification.ts`:

1. Add this import at the top:

```ts
import { GAMIFICATION_PROBABILITY_REQUIRED_FACTS } from "@/lib/gamification/probability-disclosure";
```

2. Add these facts to `GAMIFICATION_REQUIRED_RULE_FACTS` after `spent_resources_not_refunded`:

```ts
  ...GAMIFICATION_PROBABILITY_REQUIRED_FACTS,
```

3. Add this rule block after `lottery-and-ten-draw`:

```ts
    {
      id: "lottery-probability-rules",
      title: "抽奖概率说明",
      summary: "当前 active 奖池总权重是 100，权重可以直接近似理解为百分比。",
      bullets: [
        "当前 active 奖池总权重为 100。",
        "分层权重为：coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4。",
        "当前直接银子期望是 8.75 银子。",
        "disabled rewards 不会被抽到，未接入使用闭环的道具也不进入 active 奖池。",
      ],
      facts: [...GAMIFICATION_PROBABILITY_REQUIRED_FACTS],
      tone: "highlight",
    },
```

- [ ] **Step 5: Render the probability section**

Modify `components/docs-center/GamificationDocsSection.tsx`:

1. Add import:

```tsx
import { buildGamificationProbabilityDisclosure } from "@/lib/gamification/probability-disclosure";
```

2. Inside `GamificationDocsSection`, before `return`, add:

```tsx
  const probability = buildGamificationProbabilityDisclosure();
  const tierWeightSummary = probability.tierWeights
    .map((tier) => `${tier.tier} ${tier.weight}`)
    .join(" / ");
```

3. Insert this article after the rules block and before the help block:

```tsx
      <article id="supply-station-probability" className="docs-block docs-block--highlight">
        <p className="docs-eyebrow">抽奖透明度</p>
        <h3>抽奖概率说明</h3>
        <p>
          Active 奖池总权重 {probability.activeTotalWeight}。当前权重可以近似理解为百分比。
        </p>
        <ul>
          <li>分层权重：{tierWeightSummary}</li>
          <li>直接银子期望 {probability.directCoinExpectedValue.toFixed(2)} 银子。</li>
          {probability.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>

        <div className="docs-probability-grid" aria-label="Active rewards">
          {probability.activeRewards.map((reward) => (
            <div key={reward.id} className="docs-probability-card">
              <span>{reward.probabilityLabel}</span>
              <strong>{reward.name}</strong>
              <p>
                {reward.tier} · {reward.rarity} · {reward.effectSummary}
              </p>
            </div>
          ))}
        </div>

        <div className="docs-probability-disabled">
          <h4>当前不可抽</h4>
          <ul>
            {probability.disabledRewards.map((reward) => (
              <li key={reward.id}>
                {reward.name}：{reward.effectSummary}
              </li>
            ))}
            {probability.inactiveItemNotes.map((item) => (
              <li key={item.itemId}>
                {item.itemName}：{item.reason}
              </li>
            ))}
          </ul>
        </div>
      </article>
```

- [ ] **Step 6: Add TOC link**

Modify `components/docs-center/DocsCenter.tsx`:

Change:

```tsx
          { id: "supply-station-rules", label: "补给站玩法规则" },
```

to:

```tsx
          { id: "supply-station-rules", label: "补给站玩法规则" },
          { id: "supply-station-probability", label: "抽奖概率说明" },
```

- [ ] **Step 7: Add minimal docs probability CSS**

Modify `app/globals.css` after the existing `.docs-block ul` rule:

```css
.docs-probability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.docs-probability-card {
  border: 2px solid #1f2937;
  border-radius: 0.9rem;
  background: #ffffff;
  padding: 0.75rem;
  box-shadow: 3px 3px 0 #1f2937;
}

.docs-probability-card span {
  display: inline-flex;
  border: 2px solid #1f2937;
  border-radius: 999px;
  background: #fde047;
  padding: 0.12rem 0.5rem;
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 900;
}

.docs-probability-card strong {
  display: block;
  margin-top: 0.45rem;
  color: #0f172a;
  font-weight: 900;
}

.docs-probability-card p {
  margin-top: 0.35rem;
  font-size: 0.82rem;
}

.docs-probability-disabled {
  margin-top: 1rem;
  border: 2px dashed #94a3b8;
  border-radius: 0.9rem;
  background: #fff;
  padding: 0.85rem;
}

.docs-probability-disabled h4 {
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 900;
}
```

- [ ] **Step 8: Run docs tests to verify GREEN**

Run:

```bash
npm test -- __tests__/docs-center-gamification-content.test.ts __tests__/docs-center-gamification-section.test.tsx __tests__/docs-center.test.tsx
```

Expected: PASS with 3 test files.

- [ ] **Step 9: Commit docs slice**

Run:

```bash
git add content/docs-center/gamification.ts components/docs-center/GamificationDocsSection.tsx components/docs-center/DocsCenter.tsx app/globals.css __tests__/docs-center-gamification-content.test.ts __tests__/docs-center-gamification-section.test.tsx __tests__/docs-center.test.tsx
git commit -m "feat: disclose lottery probabilities in docs"
```

---

### Task 3: Supply Station Link

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Test: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Write failing Supply Station link test**

In `__tests__/supply-station-shell.test.tsx`, after the existing `links to the supply station docs rules` test, add:

```tsx
  it("links to the lottery probability docs from the lottery area", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const probabilityLink = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("抽奖概率"),
    );

    expect(probabilityLink).toBeDefined();
    expect(probabilityLink?.getAttribute("href")).toBe("/docs?tab=rules#supply-station-probability");
  });
```

- [ ] **Step 2: Run Supply Station test to verify RED**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: FAIL because no `抽奖概率` link exists in the lottery area.

- [ ] **Step 3: Add the probability link**

Modify the lottery area in `components/gamification/SupplyStation.tsx`.

Change:

```tsx
              <a className="supply-inline-link mt-3" href="/docs?tab=rules#lottery-and-ten-draw">
                查看抽奖规则
              </a>
```

to:

```tsx
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="supply-inline-link" href="/docs?tab=rules#lottery-and-ten-draw">
                  查看抽奖规则
                </a>
                <a className="supply-inline-link" href="/docs?tab=rules#supply-station-probability">
                  查看抽奖概率
                </a>
              </div>
```

- [ ] **Step 4: Run Supply Station test to verify GREEN**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Supply Station slice**

Run:

```bash
git add components/gamification/SupplyStation.tsx __tests__/supply-station-shell.test.tsx
git commit -m "feat: link lottery probability docs"
```

---

### Task 4: Roadmap And Acceptance Docs

**Files:**
- Modify: `docs/gamification-dev-roadmap.md`
- Modify: `docs/gamification-acceptance-checklist.md`

- [ ] **Step 1: Update roadmap summary table**

In `docs/gamification-dev-roadmap.md`, add this row after GM-17 because GM-18 implementation is currently paused:

```md
| GM-19 | Probability Disclosure | 已完成 | 是 |
```

Also update the GM-01 foundation sentence from:

```md
后面 GM-02 到 GM-17 都来查这套配置
```

to:

```md
后面 GM-02 到 GM-19 都来查这套配置
```

- [ ] **Step 2: Add GM-19 roadmap section**

Insert this section after the latest completed GM section and before `## 相关文档`:

```md
## GM-19: Probability Disclosure

GM-19 做的是“把抽奖概率公开讲清楚”：它不改奖池、不改抽奖算法、不做配置编辑，而是在文档中心展示当前 active 奖池、分层权重、奖励明细、直接银子期望、保底边界和不可抽内容。

### 已完成内容

1. 新增概率披露 helper

新增 `lib/gamification/probability-disclosure.ts`，核心入口是：

- `buildGamificationProbabilityDisclosure()`

它从当前 reward pool 和 item definitions 推导概率展示，不读取或写入 Prisma。

2. 文档中心新增抽奖概率说明

`/docs?tab=rules#supply-station-probability` 现在展示：

- active 奖池总权重 100
- coin / utility / social / cosmetic / rare 分层权重
- 直接银子期望 8.75
- active rewards 概率明细
- disabled rewards 和当前不可抽道具说明

3. 补给站抽奖机增加概率入口

抽奖机区域保留“查看抽奖规则”，并新增“查看抽奖概率”，直接跳到文档中心概率说明。

### GM-19 总结

GM-19 把抽奖从“规则可用”推进到“概率可解释”：用户可以在抽奖前看到当前奖池结构和概率口径，运营也不用靠口头说明解释 disabled reward 或未接入道具。它仍然保持只读边界，配置发布、称号外观和收藏玩法继续留给后续 story。
```

- [ ] **Step 3: Update related docs and update log**

In `## 相关文档`, add:

```md
- `docs/superpowers/specs/2026-05-02-gm-19-probability-disclosure-design.md`
- `docs/superpowers/plans/2026-05-02-gm-19-probability-disclosure.md`
```

At the top of `## 更新记录`, add:

```md
- 2026-05-02: GM-19 完成，新增抽奖概率披露 helper、Docs Center 抽奖概率说明、概率相关规则 facts、补给站抽奖概率入口和对应测试覆盖；未修改奖池权重、抽奖算法、道具配置或任何用户资产。
```

- [ ] **Step 4: Update acceptance checklist**

In `docs/gamification-acceptance-checklist.md`, change the opening goal from GM-18 to GM-19:

```md
> 目标：用一份固定测试数据，把 GM-01 到 GM-19 的主链路验收到“能闭环、能解释、能运营观察”的状态。
```

Under `## 1. 端到端冒烟测试`, in the `抽奖和背包` subsection, add:

```md
- [ ] 点击抽奖机区域的“查看抽奖概率”，能跳到 `/docs?tab=rules#supply-station-probability`。
- [ ] 抽奖概率说明显示 active 总权重 100、分层权重、直接银子期望和 active rewards。
```

Under `## 4. 文档总表更新`, add GM-19 checks:

```md
- [ ] `docs/gamification-dev-roadmap.md` 当前状态表包含 GM-19。
- [ ] 文档中有 `## GM-19: Probability Disclosure` 章节。
- [ ] 相关文档列表包含 GM-19 spec 和 plan。
- [ ] 更新记录包含 `2026-05-02: GM-19 完成`。
```

Under `## 5. 奖池 / 道具 / 兑换运营风险清单`, add:

```md
| 概率披露与实际奖池不一致 | 文档写死概率，奖池代码已变 | GM-19 概率明细从 reward pool helper 推导，不手抄奖励列表 |
| 用户误解权重为承诺出货 | 单次抽奖结果和百分比不一致 | 文档说明权重是长期近似概率，单抽不保证 |
```

Under `必过`, add:

```md
- GM-19 抽奖概率说明、Docs Center 深链和补给站概率入口通过。
```

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/gamification-dev-roadmap.md docs/gamification-acceptance-checklist.md
git commit -m "docs: update gamification roadmap for gm19"
```

---

### Task 5: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused GM-19 tests**

Run:

```bash
npm test -- __tests__/gamification-probability-disclosure.test.ts __tests__/docs-center-gamification-content.test.ts __tests__/docs-center-gamification-section.test.tsx __tests__/docs-center.test.tsx __tests__/supply-station-shell.test.tsx
```

Expected: PASS with 5 test files.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS. The current baseline before GM-19 is 84 test files and 436 tests because GM-18 implementation is paused; GM-19 adds 1 new helper test file and several tests in existing files, so the expected total is 85 test files plus the added test count.

- [ ] **Step 3: Run type check**

Run:

```bash
npm run lint
```

Expected: PASS. This project uses `tsc --noEmit` for lint.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short --branch
git diff --stat HEAD~4..HEAD
```

Expected:

- Branch is `epic/gamification-p4`.
- There are no unstaged files.
- GM-19 changes are limited to probability helper, docs center content/rendering, Supply Station link, tests, roadmap, and acceptance docs.
- There are no Prisma schema changes and no lottery algorithm changes.

- [ ] **Step 6: Report completion**

Final response includes:

- GM-19 commit hashes created during execution.
- Verification commands and pass/fail status.
- Reminder that GM-19 is read-only and only discloses probability; it does not change reward odds.
