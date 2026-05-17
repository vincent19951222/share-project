# 2026-05-14 Supply Draw Pool UI Lab Handoff

## Context

- Repo: `/Users/vincent/Projects/share-project`
- Branch: `codex/ui-lab-supply-dashboard`
- Active preview route: `http://localhost:3001/ui-lab/supply-dashboard/draw-pool`
- Product area: 牛马补给站 UI Lab
- Target prototype: `design/ui-assets/抽卡池.png`
- Current goal: pixel-level recreation of the draw-pool page, especially preserving the prototype's pixel-game textures, angled panel edges, typography, and button styling.

## User Direction

The user rejected the CSS-built version of the draw machine and normal rectangular CSS buttons as visually too poor. They explicitly prefer 1:1 prototype fidelity, even if static text and labels are baked into image assets.

Accepted implementation model:

- Use cropped image layers from `design/ui-assets/抽卡池.png` for highly stylized UI blocks.
- Keep only actual interactive areas as transparent semantic buttons over the image.
- For draw machine, only `单抽 x1` and `十连 x10` should be interactive.
- For wallet/current-owned panel, only `获取更多抽奖券` and `前往任务` should be interactive.
- Hover/click must not show extra white outlines or boxes because they break the 1:1 visual.

## Implemented Visual Strategy

Central draw machine:

- Added cropped prototype asset:
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-machine-panel.png`
- It contains the full machine visual: title, capsule window, lights, lever, knob, guarantee tag, skip-animation label, and button art.
- `DrawMachineStage` renders this as an image and overlays two transparent buttons:
  - `.supply-draw-pool-machine-hotspot--single`
  - `.supply-draw-pool-machine-hotspot--ten`

Wallet/current-owned panel:

- Added cropped prototype asset:
  - `public/assets/home-scenes/supply/draw-pool/draw-pool-wallet-panel.png`
- It contains the ribbon header, ticket icon, text, divider, and two pixel-style buttons.
- `TicketWalletPanel` renders this as an image and overlays two transparent buttons:
  - `.supply-draw-pool-wallet-hotspot--more`
  - `.supply-draw-pool-wallet-hotspot--tasks`

Removed visual debug/feedback:

- Removed hover box-shadow and focus outlines from machine/wallet hotspot buttons.
- Current hover/click should not display white border/box overlays.

## Key Files

Core draw-pool route and components:

- `app/ui-lab/supply-dashboard/draw-pool/page.tsx`
- `components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene.tsx`
- `components/gamification/ui-lab/supply-draw-pool/mock-data.ts`
- `components/gamification/ui-lab/supply-draw-pool/types.ts`
- `app/globals.css`

Draw-pool tests:

- `__tests__/supply-draw-pool-ui-lab-route.test.ts`
- `__tests__/supply-draw-pool-mock-data.test.ts`
- `__tests__/supply-draw-pool-assets.test.ts`
- `__tests__/supply-draw-pool-scene.test.tsx`
- `__tests__/supply-draw-pool-scene-css.test.ts`

Draw-pool assets:

- `public/assets/home-scenes/supply/draw-pool/draw-pool-machine-panel.png`
- `public/assets/home-scenes/supply/draw-pool/draw-pool-wallet-panel.png`
- `public/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp`
- `public/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp`
- `public/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp`
- `public/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp`

Docs updated:

- `docs/superpowers/specs/2026-05-13-supply-dashboard-draw-pool-static-scene-design.md`
- `docs/superpowers/plans/2026-05-13-supply-dashboard-draw-pool-static-scene-implementation.md`

## Current Route Wiring

Dashboard UI Lab dock entry was changed so the supply/draw entry goes to:

```text
/ui-lab/supply-dashboard/draw-pool
```

The visible label is now `抽卡池`.

File:

- `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`

Production guardrail:

- Do not wire this into production `SupplyStation`.
- Do not modify production nav, `AppTab`, API routes, Prisma, auth, or real lottery logic.

## Verification Already Run

Most recent commands run successfully:

```bash
npm test -- __tests__/supply-draw-pool-scene-css.test.ts __tests__/supply-draw-pool-scene.test.tsx
npm run lint
```

Earlier full draw-pool test suite also passed after the image-layer changes:

```bash
npm test -- __tests__/supply-draw-pool-ui-lab-route.test.ts __tests__/supply-draw-pool-mock-data.test.ts __tests__/supply-draw-pool-assets.test.ts __tests__/supply-draw-pool-scene.test.tsx __tests__/supply-draw-pool-scene-css.test.ts
```

Route status was confirmed with:

```bash
curl -I http://127.0.0.1:3001/ui-lab/supply-dashboard/draw-pool
```

Expected: `HTTP/1.1 200 OK`, with preload links for:

- `draw-pool-wallet-panel.png`
- `draw-pool-machine-panel.png`

## Dev Server State

During this session, `npm run dev` was started on port `3001`.

If the next session cannot reach the page, restart it:

```bash
npm run dev
```

Then open:

```text
http://localhost:3001/ui-lab/supply-dashboard/draw-pool
```

## Known Worktree State

The branch is dirty with many related UI Lab changes beyond draw-pool, including backpack/shop/task-record sibling pages. Do not revert them casually.

Important: draw-pool-specific changes are mixed into shared files:

- `app/globals.css`
- `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`

Before committing, review the diff carefully and separate draw-pool work from sibling UI Lab work if needed.

## Visual QA Notes

The latest visual check at `1536 x 1024` showed:

- Central machine now closely matches the prototype because it is a direct crop.
- Wallet/current-owned panel now matches the prototype's angled ribbon and pixel buttons because it is a direct crop.
- Right-side panels, recent drops, pool preview, guide card, and top bar are still partly CSS-built and therefore less pixel-faithful than the cropped blocks.

Likely next improvements if the user continues pushing for 1:1 fidelity:

- Crop and layer the right-side `保底进度` panel.
- Crop and layer the right-side `查看规则` panel.
- Crop and layer the left `奖池预览` panel.
- Crop and layer `最近掉落` as a panel background, possibly keeping individual recent drop cards as image crops or static card images.
- Replace top resource pills with cropped prototype-style assets or a reusable pixel panel component.

## Implementation Pattern To Continue

For highly stylized prototype blocks:

1. Crop the exact region from `design/ui-assets/抽卡池.png` using ImageMagick.
2. Save final assets under `public/assets/home-scenes/supply/draw-pool/`.
3. Render cropped image with `next/image`.
4. Overlay transparent `button` or `Link` hotspots only where interaction is needed.
5. Do not add hover/focus visual outlines unless the user asks for them.
6. Keep semantic labels via `aria-label` or hidden text.
7. Update tests to verify asset existence, image references, and hotspot existence.

Example crop command pattern:

```bash
magick design/ui-assets/抽卡池.png -crop <width>x<height>+<x>+<y> +repage public/assets/home-scenes/supply/draw-pool/<asset-name>.png
```

Current crop references:

- Machine panel: approximately `948x590+318+84`
- Wallet panel: approximately `300x380+20+105`

## Cautions

- Do not reintroduce visible hover white boxes on transparent hotspots.
- Do not rebuild pixel-art buttons with normal CSS rectangles if a prototype crop is available.
- Do not use the full prototype as a full-page background. The accepted compromise is cropped component-level image layers.
- Keep production untouched.
- Playwright CLI should write artifacts outside the repo, for example with `workdir=/private/tmp`, because `.playwright-cli/` inside the repo can trigger Next dev hot reload loops.
