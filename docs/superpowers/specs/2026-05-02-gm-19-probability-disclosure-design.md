# GM-19 Probability Disclosure Design

## Goal

GM-19 makes the active lottery pool understandable to normal users. It adds a public, read-only probability disclosure to the Docs Center so members can see what the current draw pool contains, how weights map to approximate probability, and why some configured rewards are disabled.

This story complements GM-18:

- GM-18 is an admin configuration observatory.
- GM-19 is a member-facing rule explanation for lottery probability and reward categories.

## Scope

GM-19 includes:

- A pure probability disclosure service derived from `content/gamification/reward-pool.ts` and existing item definitions.
- A Docs Center probability section under the existing gamification rules area.
- Required docs facts for active reward total weight, tier weights, direct coin expected value, ten-draw guarantee, disabled title reward, and unsupported inactive utility items.
- A Supply Station link from the lottery area to the probability section.
- Tests for the probability disclosure service, docs content guardrails, Docs Center rendering, and Supply Station link target.

GM-19 does not include:

- Changing reward weights, reward definitions, item definitions, or lottery behavior.
- Adding admin editing, config publishing, config diffs, or database-backed config.
- Adding a public API endpoint.
- Adding cosmetic collection, title inventory, stickers, or calendar decoration.
- Changing lottery history, inventory, tickets, coins, redemptions, Team Dynamics, or Enterprise WeChat behavior.

## Product Shape

The feature appears inside `/docs?tab=rules` as a new deep-linkable section:

```text
#supply-station-probability
```

The section title is `抽奖概率说明`.

It has four parts:

1. `当前 active 奖池`
   - Shows active total weight: `100`.
   - Shows tier weights:
     - `coin: 45`
     - `utility: 27`
     - `social: 24`
     - `cosmetic: 0`
     - `rare: 4`
   - Explains that these weights are relative weights, and because the active pool total is 100, the current weight is also the approximate percentage.

2. `奖励明细`
   - Lists active rewards with name, tier, rarity, weight, probability label, and effect summary.
   - Groups disabled rewards separately so users understand disabled config is not currently drawable.

3. `银子期望和补券成本`
   - Shows direct coin expected value: `8.75`.
   - Explains that 40 银子 / 张 is the ten-draw top-up price.
   - States that lottery coin rewards are not designed for infinite arbitrage.

4. `保底和不可抽内容`
   - Explains single draw has no guarantee.
   - Explains ten draw keeps the existing GM-06 guarantee.
   - Explains `今日称号`, `保底升级券`, `九折购券卡`, `补水加班费`, and `站立补贴` exist in config but are not currently in the active pool.

## Data Flow

Create `lib/gamification/probability-disclosure.ts`.

Primary function:

```ts
export function buildGamificationProbabilityDisclosure(): GamificationProbabilityDisclosure
```

The service reads:

- `getRewardDefinitions()`
- `getItemDefinitions()`

It returns a pure object with:

- `activeTotalWeight`
- `tierWeights`
- `directCoinExpectedValue`
- `activeRewards`
- `disabledRewards`
- `notes`
- `requiredFacts`

The service does not call Prisma and does not depend on GM-18 implementation.

## Docs Content

Extend `content/docs-center/gamification.ts` with probability-specific facts:

- `active_reward_total_weight=100`
- `active_reward_tier_weights=coin45_utility27_social24_cosmetic0_rare4`
- `direct_coin_ev=8.75`
- `probability_disclosure_weights_are_relative`
- `disabled_rewards_not_drawable`
- `unsupported_items_not_in_active_pool`

The existing `validateGamificationDocs()` requires these facts after GM-19.

The probability section is rendered by `components/docs-center/GamificationDocsSection.tsx` using data from the probability disclosure service, not by duplicating a manually copied reward list in docs content. This keeps the public docs aligned with the shipped reward pool.

## Supply Station Link

The lottery area in `components/gamification/SupplyStation.tsx` already links to:

```text
/docs?tab=rules#lottery-and-ten-draw
```

GM-19 keeps that rule link and adds a second lottery-area link so users can jump directly to:

```text
/docs?tab=rules#supply-station-probability
```

The link text is concise: `查看抽奖概率`.

## Acceptance Criteria

1. `/docs?tab=rules#supply-station-probability` renders a probability section.
2. The Docs Center table of contents includes `抽奖概率说明`.
3. The probability section shows active total weight `100`.
4. The probability section shows tier weights `coin 45 / utility 27 / social 24 / cosmetic 0 / rare 4`.
5. The probability section shows direct coin expected value `8.75`.
6. The probability section lists active rewards with probability labels.
7. The probability section lists disabled rewards separately and states they are not drawable.
8. The Supply Station lottery area links to the probability section.
9. Tests confirm docs facts, service calculations, component rendering, and Supply Station link target.
10. `npm test`, `npm run lint`, and `npm run build` pass before implementation is committed.

## Related Stories

- GM-16: Stabilized the active reward pool and guardrails.
- GM-18: Admin configuration observatory.
- Future config publishing or cosmetic collection stories remain separate from GM-19.
