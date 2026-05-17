# Handoff: Supply Draw Pool UI Lab Prototype Layers

## Focus

Continue the `/ui-lab/supply-dashboard/draw-pool` UI Lab page with prototype fidelity as the priority. The latest user requests were to make the top menu bar, `奖池预览`, and `概率公示` match the provided prototype screenshots using the same image-layer approach already used for `当前拥有`, `保底进度`, `查看规则`, and `最近掉落`.

## Current State

- Project root: `/Users/vincent/Projects/share-project`
- Branch: `codex/ui-lab-supply-dashboard`
- Route: `/ui-lab/supply-dashboard/draw-pool`
- Prototype source: `design/ui-assets/抽卡池.png`
- Existing prior handoff: `docs/superpowers/session-handoffs/2026-05-14-supply-draw-pool-ui-lab-handoff.md`
- An older unrelated handoff also exists at `docs/handoff-AlQIAG.md`; it focuses on the task-record UI Lab page.

The draw-pool page now uses cropped prototype image layers for all major stylized surfaces:

- `public/assets/home-scenes/supply/draw-pool/draw-pool-topbar-panel.png` (`1536 x 86`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-machine-panel.png` (`948 x 590`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-wallet-panel.png` (`300 x 380`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-guide-panel.png` (`280 x 160`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-rates-panel.png` (`195 x 198`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-probability-panel.png` (`180 x 64`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-pity-panel.png` (`250 x 295`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-rules-panel.png` (`310 x 245`)
- `public/assets/home-scenes/supply/draw-pool/draw-pool-recent-panel.png` (`966 x 250`)

Key draw-pool files:

- `app/ui-lab/supply-dashboard/draw-pool/page.tsx`
- `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- `components/gamification/ui-lab/supply-draw-pool/types.ts`
- `app/globals.css`
- `__tests__/supply-draw-pool-ui-lab-route.test.ts`
- `__tests__/supply-draw-pool-mock-data.test.ts`
- `__tests__/supply-draw-pool-assets.test.ts`
- `__tests__/supply-draw-pool-scene.test.tsx`
- `__tests__/supply-draw-pool-scene-css.test.ts`

## Decisions And Constraints

- Keep this work UI Lab only. Do not wire it into production `SupplyStation`, real lottery logic, API routes, Prisma, auth, or production navigation.
- The user prefers prototype fidelity over CSS reconstruction. Use cropped component-level image layers from `design/ui-assets/抽卡池.png` when a stylized region is available.
- Do not use the full prototype as a full-page background. The accepted compromise is cropped panel-level image layers plus transparent semantic hotspots.
- Transparent hotspots should not show hover, focus, or white box styling. Existing pattern: hide visual outline on these prototype overlays.
- Keep accessible semantics in `sr-only` content for image-only panels.
- The worktree is dirty with broader UI Lab work for dashboard, backpack, shop, task-record, team-goal, and draw-pool. Do not revert unrelated changes.

## Implementation Status

Latest completed changes:

- Top menu bar:
  - Added `draw-pool-topbar-panel.png`.
  - Replaced the CSS-built topbar with a full-width image layer.
  - Kept a transparent `返回大厅` link hotspot.
- `奖池预览`:
  - Added `draw-pool-rates-panel.png`.
  - Replaced CSS-rendered rarity rows with an image layer.
  - Kept the SSR/SR/R/N percentages in `sr-only` content.
- `概率公示`:
  - Added `draw-pool-probability-panel.png`.
  - Replaced the stretched CSS link button with an image-layer link.
  - Kept the link target at `/docs?tab=rules#supply-station-probability`.
- Existing image-layer panels remain in place for current-owned wallet, guide, machine, pity, rules, and recent drops.

Useful crop references:

```bash
magick design/ui-assets/抽卡池.png -crop 1536x86+0+0 +repage public/assets/home-scenes/supply/draw-pool/draw-pool-topbar-panel.png
magick design/ui-assets/抽卡池.png -crop 195x198+27+670 +repage public/assets/home-scenes/supply/draw-pool/draw-pool-rates-panel.png
magick design/ui-assets/抽卡池.png -crop 180x64+1323+151 +repage public/assets/home-scenes/supply/draw-pool/draw-pool-probability-panel.png
```

## Verification

Fresh verification completed on May 14, 2026:

```bash
npm test -- __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
npm run lint
```

Observed results:

- Focused image-layer tests: 3 files, 7 tests passed.
- Full draw-pool test set: 5 files, 10 tests passed.
- TypeScript lint: passed.
- Playwright visual QA at `1536 x 1024`: topbar, `奖池预览`, and `概率公示` render as prototype image layers; console errors were 0.

Notes:

- In-app browser connection via `node_repl` timed out repeatedly, so Playwright CLI was used as fallback.
- Playwright artifacts were created from `/private/tmp`, not the repo root. `test ! -e .playwright-cli` passed in the repo.
- Ports `3001` and `3002` were observed as occupied by local node processes that did not respond to `curl`; `3003` was used for the latest visual QA.

## Suggested Skills

- `brainstorming` for any new UI scope or behavior changes.
- `frontend-design` for visual refinements.
- `test-driven-development` for further UI contract changes.
- `browser-use:browser` first for local browser checks; use `playwright` CLI fallback if the in-app browser connection times out.
- `verification-before-completion` before claiming completion.

## Next Steps

1. If the user asks for more pixel alignment, compare the current page against `design/ui-assets/抽卡池.png` and crop the requested region rather than rebuilding it in CSS.
2. Likely remaining polish targets are the bottom `返回大厅` button and any residual spacing differences between image-layer panels.
3. Keep draw-pool edits scoped to `components/gamification/ui-lab/supply-draw-pool/`, draw-pool tests, draw-pool assets, and the draw-pool section of `app/globals.css`.
4. Before finalizing or staging, re-run the full draw-pool test command and `npm run lint`.
5. If preparing a commit, carefully separate draw-pool-specific changes from unrelated dirty UI Lab files.
