# Handoff: drink-update 牛马水铺原型

## Focus

继续 `drink-update` 分支上的 `牛马水铺` 页面原型。用户当前最在意的是：`今天喝点什么` 中间主视觉没有贴近概念图，下一步要按概念图尽量像素级复刻，而不是继续做普通卡片式 UI。

## Current State

- Project root: `/Users/vincent/Projects/share-project`
- Current branch: `drink-update`
- Branch baseline observed: `ea1a113 fix: align supply reward visuals`
- `origin/main`、`next/mainline`、`main`、`drink-update` 当前都指向同一个提交；本次原型工作尚未提交。
- Prototype route: `/ui-prototypes/drink-update`
- User was viewing: `http://localhost:3002/ui-prototypes/drink-update`
- Main prototype files:
  - `app/ui-prototypes/drink-update/page.tsx`
  - `app/ui-prototypes/drink-update/DrinkUpdatePrototype.module.css`
- New drink asset paths:
  - `public/assets/ui-prototypes/drink-update/drink-water.svg`
  - `public/assets/ui-prototypes/drink-update/drink-milk-tea.svg`
  - `public/assets/ui-prototypes/drink-update/drink-americano.svg`
  - `public/assets/ui-prototypes/drink-update/drink-latte.svg`
  - `public/assets/ui-prototypes/drink-update/drink-other.svg`
  - `public/assets/ui-prototypes/drink-update/generated/drink-water.png`
  - `public/assets/ui-prototypes/drink-update/generated/drink-milk-tea.png`
  - `public/assets/ui-prototypes/drink-update/generated/drink-americano.png`
  - `public/assets/ui-prototypes/drink-update/generated/drink-latte.png`
  - `public/assets/ui-prototypes/drink-update/generated/drink-other.png`
- Imagegen working files:
  - `tmp/imagegen/drink-update/drink-sticker-sheet-source.png`
  - `tmp/imagegen/drink-update/drink-sticker-sheet-alpha.png`
- Other untracked local files currently present:
  - `.agents/`
  - `skills-lock.json`
  - several older `tmp/imagegen/supply-dashboard-home-checkin-icon*` files
  - `tmp/imagegen/share-project-cookies.txt`

Important git note: `git diff --stat` is empty because all current drink-update work is untracked. Use `git status --short` and `rg --files app/ui-prototypes/drink-update public/assets/ui-prototypes tmp/imagegen/drink-update` before deciding what to stage.

## Decisions And Constraints

- Feature name: `牛马水铺`.
- Scope: only the `牛马水铺` page/prototype for now. Do not redesign the production team monthly calendar flow yet.
- Drinks are fixed to exactly five:
  - 水
  - 奶茶
  - 美式
  - 拿铁
  - 其他
- The page should track cumulative counts, not only one-off check-ins.
- Personal today panel is primary. Team records/calendar are lower priority and can stay below.
- Icon direction chosen by the user: 方案 A, unified small pixel-style drink icons.
- Current TSX has working local state for add/remove, counts, latest drink, favorite drink, today sticker strip, daily log, and a lower-priority team calendar.
- User explicitly pushed for near `100%` concept-image reproduction. The last version is not considered acceptable for the `今日水铺小票` visual area.

## Current Implementation Gap

The prototype is functionally close but visually off in the area the user cares about.

What exists now:

- Top nav borrows existing supply station assets and is visually consistent with the current app.
- Main page background reuses coffee scene assets:
  - `public/assets/home-scenes/coffee/coffee-counter-bg.webp`
  - `receipt-paper-texture.webp`
  - `note-no-coffee-no-gain.webp`
  - `takeaway-cup.webp`
  - `coffee-beans.webp`
- `今日水铺小票` renders five drink tickets with transparent generated PNG icons, add/remove buttons, a count bubble, a `今日喝了` strip, and side stats.
- `今日饮品流水` and `团队喝水打卡` are present as lower sections.

What is missing:

- The center `今日水铺小票` composition still reads as a normal card grid, not as the concept art.
- The concept image likely needs more bitmap material in the middle area: sticker/card backgrounds, paper scraps, tapes, shadows, handwritten labels, maybe a full receipt artboard or per-drink paper cutouts.
- The current transparent PNG drink icons are useful, but they are not enough by themselves for pixel-level replication.
- If SVG/CSS approximation is too far, generate or extract the required visual layers with the `imagegen` skill, then place them in the TSX/CSS as real raster assets.

## Verification

Observed/read during handoff:

- `git branch --show-current` returned `drink-update`.
- `git log --oneline --decorate -6` showed `drink-update`, `origin/main`, `next/mainline`, and `main` all at `ea1a113`.
- `git status --short --branch` showed all current prototype work as untracked.
- `git diff --stat` returned no tracked diff.
- File sizes/dimensions for generated drink PNGs:
  - `drink-water.png`: 506 x 506, 160K
  - `drink-milk-tea.png`: 520 x 520, 172K
  - `drink-americano.png`: 453 x 453, 168K
  - `drink-latte.png`: 425 x 425, 180K
  - `drink-other.png`: 401 x 401, 152K
  - `drink-sticker-sheet-source.png`: 2172 x 724, 1.3M
  - `drink-sticker-sheet-alpha.png`: 2172 x 724, 844K

Not yet verified in this handoff:

- No build/lint/test run was performed for this checkpoint.
- No fresh Playwright/browser screenshot comparison was performed.
- No asset compression pass was done for the generated drink PNGs.

## Suggested Skills

- `imagegen`: generate missing bitmap layers for the concept-style middle receipt area, or generate a full reference artboard and cut it into usable transparent layers.
- `browser:control-in-app-browser` or `playwright`: capture desktop/mobile screenshots and compare against the concept.
- `frontend-design` or `redesign-existing-projects`: only after the bitmap direction is chosen, to polish layout and responsiveness.
- `verification-before-completion`: before claiming the prototype is close enough or staging changes.

## Next Steps

1. Re-open the concept image/reference and current route side by side. Identify concrete visual mismatches in `今日水铺小票`: paper shape, drink positions, sticker density, label style, count treatment, shadows, and spacing.
2. Decide whether to use a full bitmap artboard for the middle receipt area or separate transparent layers. Given the user's feedback, prefer real image assets for the central visual instead of pure CSS/SVG.
3. Use `imagegen` to generate the missing layers if existing assets are insufficient. Save raw files under `tmp/imagegen/drink-update/`, process to transparent/optimized public assets, and reference them from `public/assets/ui-prototypes/drink-update/`.
4. Refactor only `app/ui-prototypes/drink-update/page.tsx` and `DrinkUpdatePrototype.module.css` as needed. Keep the local state behavior intact while changing the visual treatment.
5. Keep team calendar low on the page. Do not over-invest there until the user approves the personal daily panel.
6. Verify with the in-app browser at `/ui-prototypes/drink-update`, including a screenshot at desktop width. Then run at least `npm run lint` and, if time permits, `npm run build`.
