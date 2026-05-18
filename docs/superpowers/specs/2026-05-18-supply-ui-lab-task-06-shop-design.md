# Supply UI Lab Task 06 Shop Design

> Phase 2 task-level spec for the Supply Shop page. This task corresponds to Task 6 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Make the shop a catalog-driven static storefront where every active non-coin draw reward can be bought, inspected, filtered, and mock-redeemed.

## User-Visible Changes

- Shop products are the same items that can appear in the draw pool.
- Product images, names, effects, prices, limits, and ownership all come from the shared catalog.
- Clicking a product changes the detail panel.
- Category and filter buttons switch local state.
- Redeem button changes local feedback, such as `已加入背包` or `兑换中`.
- `了解更多规则` dead anchor is removed and replaced with an in-page rules disclosure.
- `补给券` is replaced by `抽奖券`.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-shop/types.ts`
- `components/gamification/ui-lab/supply-shop/mock-data.ts`
- `components/gamification/ui-lab/supply-shop/SupplyShopScene.tsx`
- `__tests__/supply-shop-mock-data.test.ts`
- `__tests__/supply-shop-scene.test.tsx`

Shop products derive from:

- `supplyUiLabCatalog.filter((item) => item.shop.buyable)`

## Non-Goals

- Do not perform real purchase or inventory mutation.
- Do not call redemption APIs.
- Do not sell coin rewards as products.
- Do not add admin confirmation workflows beyond local mock status.

## Acceptance Criteria

- Product list includes all active non-coin draw reward item ids.
- Every product has source, effect, timing, price, and limit information.
- Clicking a product changes selected detail.
- Real-world items show admin-confirmation language and local `兑换中` feedback.
- No dead `href="#rules"` anchor remains.

## Plan Link

Implementation details live in Task 6 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
