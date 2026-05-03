# GM-16 Card Pool Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active lottery reward pool total exactly 100 weight, match the GM-16 tier model, and prevent currently unusable rewards from entering the live draw pool.

**Architecture:** This is a content and validation change, not a new gameplay system. The reward list remains in `content/gamification/reward-pool.ts`; `validateGamificationContent()` becomes the guardrail that enforces active-pool totals, tier weights, item references, and supported item effects. Lottery behavior stays in `lib/gamification/lottery.ts`, with tests proving the existing ten-draw guarantee still behaves the same under the tuned pool.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Vitest, local gamification content modules.

---

## Source Spec

- `docs/superpowers/specs/2026-05-02-gm-16-card-pool-tuning-design.md`

## File Structure

- Modify `__tests__/gamification-content.test.ts`
  - Adds failing content tests for active reward weights, direct coin EV, item usability, and disabled title rewards.
- Modify `lib/gamification/content.ts`
  - Extends shipped content validation to enforce GM-16 active pool rules.
- Modify `content/gamification/reward-pool.ts`
  - Tunes active reward weights to `100`.
  - Adds missing active reward entries for currently supported items.
  - Disables the current title reward until cosmetic inventory exists.
- Modify `__tests__/gamification-lottery.test.ts`
  - Tightens EV assertion to `8.75`.
  - Verifies ten-draw guarantee replacement comes from `utility`.
  - Verifies a new rare reward can be granted into inventory.
- Modify `components/gamification/SupplyStation.tsx`
  - Removes stale user-facing `GM-08` copy from the empty today-effects state.

No Prisma schema, route, API, or data migration change is required.

---

### Task 1: Add GM-16 Content Tests

**Files:**
- Modify: `__tests__/gamification-content.test.ts`

- [ ] **Step 1: Import reward effect types used by the tests**

At the top of `__tests__/gamification-content.test.ts`, change the type import block from:

```ts
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  TaskCardDefinition,
} from "@/content/gamification/types";
```

to:

```ts
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";
```

- [ ] **Step 2: Add local test helpers**

Add these helpers after `cloneBundle()`:

```ts
const EXPECTED_ACTIVE_TIER_WEIGHTS: Record<RewardTier, number> = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
};

const SUPPORTED_ACTIVE_ITEM_EFFECT_TYPES = new Set([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);

function getActiveRewards(rewards = getRewardDefinitions()) {
  return rewards.filter((reward) => reward.enabled && reward.weight > 0);
}

function getTierWeights(rewards = getActiveRewards()) {
  return rewards.reduce<Record<RewardTier, number>>(
    (weights, reward) => ({
      ...weights,
      [reward.tier]: weights[reward.tier] + reward.weight,
    }),
    {
      coin: 0,
      utility: 0,
      social: 0,
      cosmetic: 0,
      rare: 0,
    },
  );
}

function getDirectCoinEv(rewards = getActiveRewards()) {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);

  return rewards.reduce((sum, reward) => {
    if (reward.effect.type !== "grant_coins") {
      return sum;
    }

    return sum + (reward.weight / totalWeight) * reward.effect.amount;
  }, 0);
}
```

- [ ] **Step 3: Add the failing active-pool test**

Add this test inside `describe("gamification content", () => { ... })`, after `validates the shipped content bundle`:

```ts
  it("keeps the GM-16 active reward pool at the approved tier weights", () => {
    const activeRewards = getActiveRewards();
    const totalWeight = activeRewards.reduce((sum, reward) => sum + reward.weight, 0);

    expect(totalWeight).toBe(100);
    expect(getTierWeights(activeRewards)).toEqual(EXPECTED_ACTIVE_TIER_WEIGHTS);
    expect(getDirectCoinEv(activeRewards)).toBeCloseTo(8.75, 5);
    expect(activeRewards.map((reward) => reward.id)).not.toContain("reward_today_title");
    expect(activeRewards.some((reward) => reward.effect.type === "grant_title")).toBe(false);
  });
```

Expected before implementation: FAIL because the current active pool totals `84`, `reward_today_title` is active, and `utility/social/rare` weights do not match GM-16.

- [ ] **Step 4: Add the failing active item usability test**

Add this test after the active-pool test:

```ts
  it("only grants currently usable or redeemable items from the active reward pool", () => {
    const itemById = new Map(getItemDefinitions().map((item) => [item.id, item]));

    for (const reward of getActiveRewards()) {
      if (reward.effect.type !== "grant_item" && reward.effect.type !== "grant_real_world_redemption") {
        continue;
      }

      const item = itemById.get(reward.effect.itemId);

      expect(item, reward.id).toBeDefined();
      expect(item?.enabled, reward.effect.itemId).toBe(true);
      expect(SUPPORTED_ACTIVE_ITEM_EFFECT_TYPES.has(item!.effect.type), reward.effect.itemId).toBe(true);
    }
  });
```

Expected before implementation: this may PASS now, but it becomes a permanent guardrail for new GM-16 rewards.

- [ ] **Step 5: Add validation regression tests for unsupported active rewards**

Add these tests after `rejects rewards that grant missing items`:

```ts
  it("rejects active title rewards until cosmetic inventory exists", () => {
    const bundle = cloneBundle();
    bundle.rewards = bundle.rewards.map((reward) =>
      reward.id === "reward_today_title"
        ? {
            ...reward,
            enabled: true,
          }
        : reward,
    );

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants unsupported title/);
  });

  it("rejects active rewards that grant disabled items", () => {
    const bundle = cloneBundle();
    bundle.items = bundle.items.map((item) =>
      item.id === "task_reroll_coupon"
        ? {
            ...item,
            enabled: false,
          }
        : item,
    );

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants disabled item/);
  });

  it("rejects active rewards that grant unsupported item effects", () => {
    const bundle = cloneBundle();
    const unsupportedItem: ItemDefinition = {
      id: "unsupported_lottery_item",
      category: "lottery",
      name: "未开放彩票道具",
      description: "这个道具定义存在，但 GM-16 不允许进入 active pool。",
      useTiming: "instant",
      effect: { type: "lottery_guarantee", minTier: "utility", appliesTo: "single" },
      stackable: true,
      requiresAdminConfirmation: false,
      enabled: true,
    };
    const unsupportedReward: RewardDefinition = {
      id: "reward_unsupported_lottery_item",
      tier: "utility",
      kind: "inventory_item",
      rarity: "common",
      name: "未开放彩票道具奖励",
      description: "主动奖励一个还没有使用入口的道具。",
      weight: 1,
      effect: { type: "grant_item", itemId: unsupportedItem.id, quantity: 1 },
      enabled: true,
    };
    bundle.items.push(unsupportedItem);
    bundle.rewards.push(unsupportedReward);

    expect(() => validateGamificationContent(bundle)).toThrow(/Active reward grants unsupported item effect/);
  });
```

Expected before implementation: FAIL because `validateGamificationContent()` does not yet reject these active-pool cases.

- [ ] **Step 6: Run the content tests and verify the intended failure**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: FAIL on the GM-16 active pool and active reward validation assertions.

- [ ] **Step 7: Commit the failing tests**

```bash
git add __tests__/gamification-content.test.ts
git commit -m "test: capture gm16 reward pool rules"
```

---

### Task 2: Enforce Active Reward Pool Validation

**Files:**
- Modify: `lib/gamification/content.ts`
- Test: `__tests__/gamification-content.test.ts`

- [ ] **Step 1: Import `RewardTier`**

Change the type import in `lib/gamification/content.ts` from:

```ts
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  TaskCardDefinition,
} from "@/content/gamification/types";
```

to:

```ts
import type {
  GamificationContentBundle,
  ItemDefinition,
  RewardDefinition,
  RewardTier,
  TaskCardDefinition,
} from "@/content/gamification/types";
```

- [ ] **Step 2: Add GM-16 validation constants**

Add this block after `DEFAULT_CONTENT_BUNDLE`:

```ts
const EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT = 100;
const EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS: Record<RewardTier, number> = {
  coin: 45,
  utility: 27,
  social: 24,
  cosmetic: 0,
  rare: 4,
};

const SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES = new Set([
  "task_reroll",
  "fitness_coin_multiplier",
  "fitness_season_multiplier",
  "fitness_coin_and_season_multiplier",
  "leave_protection",
  "social_invitation",
  "real_world_redemption",
]);
```

- [ ] **Step 3: Pass full item definitions into reward validation**

In `validateGamificationContent`, replace:

```ts
  validateRewards(bundle.rewards, itemIds);
```

with:

```ts
  validateRewards(bundle.rewards, bundle.items, itemIds);
```

- [ ] **Step 4: Replace `validateRewards` with active-pool validation**

Replace the entire existing `validateRewards` function with:

```ts
function validateRewards(
  rewards: RewardDefinition[],
  items: ItemDefinition[],
  itemIds: Set<string>,
) {
  const rewardIds = new Set<string>();
  const itemById = new Map(items.map((item) => [item.id, item]));
  const activeTierWeights: Record<RewardTier, number> = {
    coin: 0,
    utility: 0,
    social: 0,
    cosmetic: 0,
    rare: 0,
  };
  let activeTotalWeight = 0;

  for (const reward of rewards) {
    if (rewardIds.has(reward.id)) {
      throw new Error(`Duplicate reward id: ${reward.id}`);
    }
    rewardIds.add(reward.id);

    if (reward.weight <= 0) {
      throw new Error(`Invalid reward weight: ${reward.id}`);
    }

    if (
      (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") &&
      !itemIds.has(reward.effect.itemId)
    ) {
      throw new Error(`Unknown reward item: ${reward.effect.itemId}`);
    }

    if (!reward.enabled) {
      continue;
    }

    activeTotalWeight += reward.weight;
    activeTierWeights[reward.tier] += reward.weight;

    if (reward.effect.type === "grant_title") {
      throw new Error(`Active reward grants unsupported title: ${reward.id}`);
    }

    if (reward.effect.type !== "grant_item" && reward.effect.type !== "grant_real_world_redemption") {
      continue;
    }

    const item = itemById.get(reward.effect.itemId);

    if (!item) {
      throw new Error(`Unknown reward item: ${reward.effect.itemId}`);
    }

    if (!item.enabled) {
      throw new Error(`Active reward grants disabled item: ${reward.effect.itemId}`);
    }

    if (!SUPPORTED_ACTIVE_REWARD_ITEM_EFFECT_TYPES.has(item.effect.type)) {
      throw new Error(`Active reward grants unsupported item effect: ${reward.effect.itemId}`);
    }
  }

  if (activeTotalWeight !== EXPECTED_ACTIVE_REWARD_TOTAL_WEIGHT) {
    throw new Error(`Invalid active reward total weight: ${activeTotalWeight}`);
  }

  for (const tier of Object.keys(EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS) as RewardTier[]) {
    const expected = EXPECTED_ACTIVE_REWARD_TIER_WEIGHTS[tier];

    if (activeTierWeights[tier] !== expected) {
      throw new Error(`Invalid active reward tier weight: ${tier}=${activeTierWeights[tier]}`);
    }
  }
}
```

- [ ] **Step 5: Run the content tests and verify pool data still fails**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: validation-specific tests now PASS, but `validates the shipped content bundle` and the GM-16 active pool test still FAIL until the reward pool is tuned.

- [ ] **Step 6: Commit validation changes**

```bash
git add lib/gamification/content.ts __tests__/gamification-content.test.ts
git commit -m "feat: enforce gm16 reward pool validation"
```

---

### Task 3: Tune the Active Reward Pool

**Files:**
- Modify: `content/gamification/reward-pool.ts`
- Test: `__tests__/gamification-content.test.ts`

- [ ] **Step 1: Replace the non-coin reward block**

In `content/gamification/reward-pool.ts`, keep the six existing coin rewards unchanged. Replace every reward after `coins_120` with this block:

```ts
  {
    id: "reward_task_reroll",
    tier: "utility",
    kind: "inventory_item",
    rarity: "common",
    name: "任务换班券",
    description: "获得 1 张任务换班券。",
    weight: 10,
    effect: { type: "grant_item", itemId: "task_reroll_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_small_boost",
    tier: "utility",
    kind: "inventory_item",
    rarity: "uncommon",
    name: "小暴击券",
    description: "获得 1 张小暴击券。",
    weight: 9,
    effect: { type: "grant_item", itemId: "small_boost_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_fitness_leave",
    tier: "utility",
    kind: "inventory_item",
    rarity: "uncommon",
    name: "健身请假券",
    description: "获得 1 张健身请假券。",
    weight: 8,
    effect: { type: "grant_item", itemId: "fitness_leave_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_drink_water_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "点名喝水令",
    description: "获得 1 张点名喝水令。",
    weight: 5,
    effect: { type: "grant_item", itemId: "drink_water_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_walk_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "出门溜达令",
    description: "获得 1 张出门溜达令。",
    weight: 5,
    effect: { type: "grant_item", itemId: "walk_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_team_standup_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "uncommon",
    name: "全员起立令",
    description: "获得 1 张全员起立令。",
    weight: 4,
    effect: { type: "grant_item", itemId: "team_standup_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_chat_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "今日闲聊令",
    description: "获得 1 张今日闲聊令。",
    weight: 4,
    effect: { type: "grant_item", itemId: "chat_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_share_info_ping",
    tier: "social",
    kind: "inventory_item",
    rarity: "common",
    name: "红盘情报令",
    description: "获得 1 张红盘情报令。",
    weight: 4,
    effect: { type: "grant_item", itemId: "share_info_ping", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_team_broadcast",
    tier: "social",
    kind: "inventory_item",
    rarity: "uncommon",
    name: "团队小喇叭",
    description: "获得 1 张团队小喇叭。",
    weight: 2,
    effect: { type: "grant_item", itemId: "team_broadcast_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_today_title",
    tier: "cosmetic",
    kind: "title",
    rarity: "common",
    name: "今日称号",
    description: "获得一个当天展示称号。",
    weight: 6,
    effect: { type: "grant_title", titleId: "legal_slacker" },
    enabled: false,
  },
  {
    id: "reward_double_niuma",
    tier: "rare",
    kind: "inventory_item",
    rarity: "epic",
    name: "双倍牛马券",
    description: "获得 1 张双倍牛马券。",
    weight: 2,
    effect: { type: "grant_item", itemId: "double_niuma_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_season_sprint",
    tier: "rare",
    kind: "inventory_item",
    rarity: "epic",
    name: "赛季冲刺券",
    description: "获得 1 张赛季冲刺券。",
    weight: 1,
    effect: { type: "grant_item", itemId: "season_sprint_coupon", quantity: 1 },
    enabled: true,
  },
  {
    id: "reward_luckin_coffee",
    tier: "rare",
    kind: "real_world_redemption",
    rarity: "epic",
    name: "瑞幸咖啡券",
    description: "获得 1 张瑞幸咖啡券。",
    weight: 1,
    effect: { type: "grant_real_world_redemption", itemId: "luckin_coffee_coupon", quantity: 1 },
    enabled: true,
  },
```

- [ ] **Step 2: Run content tests**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit reward pool tuning**

```bash
git add content/gamification/reward-pool.ts __tests__/gamification-content.test.ts lib/gamification/content.ts
git commit -m "feat: tune gm16 reward pool"
```

---

### Task 4: Tighten Lottery Regression Tests

**Files:**
- Modify: `__tests__/gamification-lottery.test.ts`

- [ ] **Step 1: Tighten the direct coin EV assertion**

Replace the existing test:

```ts
  it("keeps direct coin expected value below one ticket price", () => {
    expect(getDirectCoinExpectedValue()).toBeLessThan(40);
  });
```

with:

```ts
  it("keeps the GM-16 direct coin expected value at 8.75", () => {
    expect(getDirectCoinExpectedValue()).toBeCloseTo(8.75, 5);
    expect(getDirectCoinExpectedValue()).toBeLessThan(40);
  });
```

- [ ] **Step 2: Strengthen the ten-draw guarantee assertion**

In the test `applies ten-draw guarantee when all natural results are coin rewards`, replace:

```ts
    const tiers = draw.results.map((item) => item.rewardTier);

    expect(draw.guaranteeApplied).toBe(true);
    expect(tiers.some((tier) => ["utility", "social", "rare"].includes(tier))).toBe(true);
    expect(result.draw.guaranteeApplied).toBe(true);
```

with:

```ts
    const nonCoinResults = draw.results.filter((item) => item.rewardTier !== "coin");
    const nonCoinSnapshots = result.draw.rewards.filter((reward) => reward.rewardTier !== "coin");

    expect(draw.guaranteeApplied).toBe(true);
    expect(nonCoinResults).toHaveLength(1);
    expect(nonCoinResults[0]?.rewardTier).toBe("utility");
    expect(result.draw.guaranteeApplied).toBe(true);
    expect(nonCoinSnapshots).toHaveLength(1);
    expect(nonCoinSnapshots[0]?.rewardTier).toBe("utility");
```

- [ ] **Step 3: Add a rare item inventory regression**

Add this test after `grants inventory for item rewards`:

```ts
  it("grants inventory for the GM-16 season sprint rare reward", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });

    const result = await drawLottery({
      userId,
      drawType: "SINGLE",
      rng: sequenceRng([0.985]),
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: {
        userId_itemId: {
          userId,
          itemId: "season_sprint_coupon",
        },
      },
    });

    expect(result.draw.rewards[0]).toMatchObject({
      rewardId: "reward_season_sprint",
      rewardTier: "rare",
      rewardKind: "inventory_item",
    });
    expect(inventory.quantity).toBe(1);
  });
```

The `0.985` RNG value lands in the `reward_season_sprint` range after the active weights are tuned to `100`.

- [ ] **Step 4: Run lottery tests**

Run:

```bash
npm test -- __tests__/gamification-lottery.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit lottery regression tests**

```bash
git add __tests__/gamification-lottery.test.ts
git commit -m "test: cover gm16 lottery behavior"
```

---

### Task 5: Remove Stale Supply Station Copy

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Test: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Replace the empty today-effects copy**

In `TodayEffectsPanel`, replace:

```tsx
        今天还没有待生效道具。GM-08 后可以先用道具，再去健身触发结算。
```

with:

```tsx
        今天还没有待生效道具。可以先使用暴击券，再去真实健身触发结算。
```

- [ ] **Step 2: Remove the unused placeholder button component**

Delete this component from `components/gamification/SupplyStation.tsx`:

```tsx
function PlaceholderButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-full border-[3px] border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Remove the unreachable GM-12 placeholder block**

Near the bottom of `SupplyStation`, delete this unreachable block:

```tsx
            {false ? (
            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">弱社交雷达</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot!.social.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-black">
                <div className="rounded-[1rem] bg-orange-100 p-3">我发出的 {snapshot!.social.pendingSentCount}</div>
                <div className="rounded-[1rem] bg-sky-100 p-3">我收到的 {snapshot!.social.pendingReceivedCount}</div>
              </div>
              <div className="mt-4">
                <PlaceholderButton>响应 GM-12</PlaceholderButton>
              </div>
            </section>
            ) : null}
```

- [ ] **Step 4: Run the supply station shell tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Confirm no GM story placeholder copy remains in the component**

Run:

```bash
rg -n "GM-0|GM-1|后续.*开放|再开放" components/gamification/SupplyStation.tsx
```

Expected: no matches.

- [ ] **Step 6: Commit copy cleanup**

```bash
git add components/gamification/SupplyStation.tsx
git commit -m "fix: remove stale supply station copy"
```

---

### Task 6: Full Verification and Final Commit Check

**Files:**
- Verify only.

- [ ] **Step 1: Run the focused GM-16 test set**

Run:

```bash
npm test -- __tests__/gamification-content.test.ts __tests__/gamification-lottery.test.ts __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected:

- `git status --short` shows no untracked implementation files except intentional local artifacts.
- `git diff --stat` is empty if each task was committed.

- [ ] **Step 6: Confirm acceptance criteria manually**

Run:

```bash
git log --oneline -5
```

Expected: the recent commits include the GM-16 tests, validation, reward pool tuning, lottery tests, and copy cleanup.

Manual acceptance checks:

- Active reward pool total is `100`.
- Tier weights are `coin 45 / utility 27 / social 24 / rare 4 / cosmetic 0`.
- Direct coin EV is `8.75`.
- `reward_today_title` is not active.
- `single_draw_guarantee_coupon`, `ticket_discount_90`, `hydration_bonus`, and `movement_bonus` are not granted by any active reward.
- Ten-draw guarantee still replaces all-coin draws with one `utility` reward.
- Full tests, lint, and build pass.
