# Supply UI Lab Task 02 Item Assets Design

> Phase 2 task-level spec for atomic item art used by the shared catalog. This task corresponds to Task 2 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Give every visible catalog item a real atomic media asset so Shop, Backpack, Draw Pool, and Task Record can render items without cropped prototype panels or mismatched placeholder icons.

## User-Visible Changes

- Every shop product has a distinct item image.
- Backpack item slots use the same item images as the shop.
- Draw Pool prize previews and recent drops can reuse the same catalog art.
- Items that used to be text-only or borrowed from unrelated art become visually recognizable.

## Asset Changes

Create generated transparent WebP item icons under:

`public/assets/home-scenes/supply/items/`

Required generated assets:

- `fitness-leave-coupon.webp`
- `drink-water-ping.webp`
- `walk-ping.webp`
- `team-standup-ping.webp`
- `chat-ping.webp`
- `share-info-ping.webp`
- `double-niuma-coupon.webp`
- `season-sprint-coupon.webp`

Existing assets can still be reused for:

- `task_reroll_coupon`
- `small_boost_coupon`
- `team_broadcast_coupon`
- `luckin_coffee_coupon`
- coin rewards

## Non-Goals

- Do not generate full UI panels.
- Do not crop images from prototype screenshots.
- Do not redesign the page layout.
- Do not add animation sprites.

## Acceptance Criteria

- Every `assetStatus: "needs_generated"` catalog item has a committed file.
- Each generated item asset stays under the agreed size budget.
- Asset tests verify paths exist and no panel screenshot assets are used.
- Item assets are transparent or isolated enough to work in grid, card, and reward contexts.

## Plan Link

Implementation details live in Task 2 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
