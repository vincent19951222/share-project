# GM-18 Config Observatory Design

## Goal

GM-18 adds a read-only gamification configuration observatory for admins. It answers one practical question: what game configuration is currently shipped, and is it internally consistent enough to operate?

This story complements GM-17:

- GM-17 observes live operational data: assets, redemptions, social usage, and delivery failures.
- GM-18 observes static content configuration: dimensions, task cards, rewards, item definitions, weights, and validation status.

## Scope

GM-18 includes:

- A server-side content snapshot built from `content/gamification/*`.
- A read-only admin API for refreshing the snapshot.
- A `/admin` panel that shows the current task card pools, reward pool, item definitions, and content validation result.
- Human-readable explanations for enabled, disabled, supported, and unsupported configuration entries.
- Tests for the snapshot service, admin API permissions, and panel rendering.

GM-18 does not include:

- Editing, saving, publishing, or rolling back configuration.
- Moving local TypeScript content into database tables.
- Adding feature flags or per-team config overrides.
- Changing reward weights, task card weights, item effects, or gameplay rules.
- Mutating user assets, inventory, lottery records, redemptions, social invitations, Team Dynamics, or Enterprise WeChat logs.

## Product Shape

The feature appears on `/admin` as `配置总览`, near the GM-17 `运营观察` panel.

The panel has four sections:

1. `四维任务卡池`
   - Shows each dimension: `movement`, `hydration`, `social`, `learning`.
   - For each dimension, shows enabled card count, disabled card count, total enabled weight, scenes, efforts, and top tags.
   - Lists representative enabled cards so admins can inspect the shipped task flavor without reading source files.

2. `抽奖奖池`
   - Shows active reward total weight.
   - Shows tier weights for `coin`, `utility`, `social`, `cosmetic`, and `rare`.
   - Shows direct coin expected value.
   - Lists rewards with name, tier, kind, rarity, weight, estimated probability, enabled state, and effect summary.
   - Clearly separates active rewards from disabled rewards.

3. `道具配置`
   - Groups items by category.
   - Shows item name, use timing, effect summary, stackability, use limits, admin-confirmation requirement, and enabled state.
   - Marks whether an item can currently appear in the active reward pool.
   - Highlights enabled items that exist but are intentionally excluded from active lottery rewards.

4. `配置校验`
   - Runs the same validation rules as `validateGamificationContent()`.
   - Shows pass/fail status and readable check rows.
   - Explains guardrails such as active reward total weight, active tier weights, missing item references, disabled item references, active title rewards, unsupported active item effects, duplicate IDs, invalid limits, and invalid task dimensions.

## Data Model

GM-18 does not add Prisma models.

The snapshot is derived from existing local content:

- `content/gamification/dimensions.ts`
- `content/gamification/task-cards.ts`
- `content/gamification/reward-pool.ts`
- `content/gamification/item-definitions.ts`
- `content/gamification/types.ts`
- `lib/gamification/content.ts`

Shared response types live in `lib/types.ts`, following the GM-17 pattern.

Required top-level snapshot shape:

```ts
export interface GamificationConfigObservatorySnapshot {
  generatedAt: string;
  validation: GamificationConfigValidationSnapshot;
  dimensionPools: GamificationDimensionPoolSnapshot[];
  rewardPool: GamificationRewardPoolSnapshot;
  itemCatalog: GamificationItemCatalogSnapshot;
}
```

Nested interfaces may be added for clarity, but the public snapshot must remain one pure object shared by the admin page and API.

## Service

Create `lib/gamification/config-observatory.ts`.

Primary function:

```ts
export function buildGamificationConfigObservatorySnapshot(): GamificationConfigObservatorySnapshot
```

The service:

- Read dimensions, task cards, reward definitions, and item definitions through existing content helpers.
- Calculate enabled and disabled counts.
- Calculate task-card counts and total weights by dimension.
- Calculate reward total weight and tier weights for active rewards.
- Calculate reward probability as `reward.weight / activeTotalWeight`.
- Calculate direct coin expected value from active coin rewards.
- Generate readable effect summaries for reward effects and item effects.
- Classify item reward-pool availability:
  - `active_reward_pool`: enabled item effect is supported and at least one active reward grants it.
  - `eligible_but_not_in_pool`: enabled item effect is supported but no active reward grants it.
  - `unsupported_effect`: enabled item effect is not currently allowed in the active reward pool.
  - `disabled_item`: item itself is disabled.
- Run content validation and expose either passing checks or the validation failure message.

The service is pure and read-only. It does not call Prisma.

## Admin API

Add:

```text
GET /api/admin/gamification/config-observatory
```

Behavior:

- Unauthenticated request returns `401 { error: "Unauthorized" }`.
- Non-admin request returns `403 { error: "Forbidden" }`.
- Admin request returns `200 { snapshot }`.
- Server errors return `500 { error: "Internal server error" }`.

The API only reads local content and does not mutate data.

## Admin UI

Create `components/admin/GamificationConfigObservatory.tsx`.

The component receives an initial server-built snapshot and supports refresh through the admin API.

The visual treatment matches existing `/admin` brutalist panels:

- Use `soft-card`.
- Keep cards compact and scannable.
- Avoid a landing-page layout.
- Keep rounded corners consistent with the existing admin page.
- Use clear status labels: `通过`, `注意`, `未启用`, `不可进入奖池`.

The `/admin` page builds the snapshot server-side together with the GM-17 ops snapshot and seasons list. The panel sits near GM-17 so admins can compare configuration state and operational state in one place.

## Validation Rules

GM-18 makes the current GM-16 guardrails visible to admins:

- Active reward total weight is `100`.
- Active tier weights are:
  - `coin: 45`
  - `utility: 27`
  - `social: 24`
  - `cosmetic: 0`
  - `rare: 4`
- Direct coin expected value is `8.75`.
- Active rewards do not grant titles.
- Active rewards do not grant disabled items.
- Active rewards do not grant unsupported item effects.
- Rewards that grant items reference existing items.
- Task cards reference existing dimensions.
- Task-card weights and reward weights are positive.
- Item use limits are positive when present.

The panel shows both machine checks and explanatory text. The source of truth remains `validateGamificationContent()`.

## Acceptance Criteria

1. Admins can see `配置总览` on `/admin`.
2. Ordinary members cannot access the config observatory API.
3. The panel shows all four dimensions with task card counts and enabled weights.
4. The panel shows active reward total weight, tier weights, direct coin expected value, active rewards, and disabled rewards.
5. The panel shows item categories, effect summaries, usage limits, and reward-pool availability.
6. The panel shows content validation as passing for the shipped configuration.
7. Refreshing the panel does not mutate database tables or user state.
8. Tests cover service calculations, API permissions, and component rendering.
9. `npm test`, `npm run lint`, and `npm run build` pass before committing implementation.

## Related Stories

- GM-17: Operational data observability.
- GM-19: A future story can add controlled config publishing, config diffs, or probability disclosure. GM-18 does not pre-build those mutation paths.
