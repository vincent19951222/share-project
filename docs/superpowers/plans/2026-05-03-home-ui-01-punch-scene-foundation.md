# Home UI 01 Punch Scene Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the homepage shared visual foundation and the `健身打卡` tab into the approved gym check-in wall prototype using only UI, layout, motion, and media asset changes.

**Architecture:** Keep the current Next.js App Router, `BoardProvider`, API routes, reducer actions, and existing data contracts unchanged. Add project-bound raster assets under `public/assets/home-scenes/punch/`, then wire them into existing components through CSS class hooks and presentational markup. Use `Navbar`, `PunchBoard`, `TeamHeader`, `HeatmapGrid`, and `ActivityStream` as the first reusable scene foundation without creating a broad abstraction layer yet.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v4 via `app/globals.css`, Vitest + jsdom, built-in `imagegen` skill, chroma-key removal helper from the `imagegen` skill, ImageMagick `magick`, `cwebp`.

---

## Scope Guardrails

- Do not modify Prisma schema, API route contracts, database seed logic, reducer action names, or punch reward rules.
- Do not add new statistics that do not exist in `BoardState`.
- Do not add a separate right-side “今日未打卡成员” panel.
- Keep the existing reminder/poke behavior in `ActivityStream`; only move it into the bottom activity panel visual.
- Keep the top profile area and `TeamDynamicsBell`.
- Keep actual member-driven rendering. The prototype shows 4 reminder buttons, but the code must render however many current unpunched members exist.
- Project code must reference only `/assets/home-scenes/punch/<filename>`, never `$CODEX_HOME/generated_images/...`.
- Background assets may be opaque WebP. Decorative overlays and small card art must be processed to transparent-background alpha WebP before entering `public/`.

## File Structure

- Create: `public/assets/home-scenes/punch/`
  - Final compressed project assets for the punch scene.
- Create: `__tests__/home-ui-punch-assets.test.ts`
  - Verifies required assets exist and are below agreed size budgets.
- Create: `__tests__/home-ui-punch-scene.test.tsx`
  - Covers the gym scene shell, TeamHeader media, and ActivityStream reminder cards.
- Modify: `__tests__/coffee-tab.test.tsx`
  - Update existing nav icon order expectation and TeamHeader vault asset expectation.
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
  - Add visual hook assertions for today cells and current user “我” badge without changing punch flow tests.
- Modify: `app/(board)/page.tsx`
  - Add stable scene transition class hooks to tab panels.
- Modify: `components/navbar/Navbar.tsx`
  - Reorder tabs to `punch / board / coffee / calendar / dash / supply` on desktop and mobile.
  - Add nav shell class hooks for the black bar visual.
- Modify: `components/punch-board/PunchBoard.tsx`
  - Add punch scene shell, background layer, and decorative media layer.
- Modify: `components/punch-board/TeamHeader.tsx`
  - Add vault image media and prototype-style summary structure while preserving all current values.
- Modify: `components/punch-board/HeatmapGrid.tsx`
  - Add today/current-user visual class hooks and “我” badges.
- Modify: `components/punch-board/ActivityStream.tsx`
  - Integrate unpunched-member reminder cards into the bottom activity panel.
- Modify: `app/globals.css`
  - Add shared scene motion tokens, nav skin, punch scene, TeamHeader, heatmap, ActivityStream, responsive, and reduced-motion styles.

## Task 1: Asset Contract Test

**Files:**
- Create: `__tests__/home-ui-punch-assets.test.ts`
- Create directory during implementation: `public/assets/home-scenes/punch/`

- [ ] **Step 1: Create the failing asset contract test**

Create `__tests__/home-ui-punch-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "gym-wall-bg.webp", maxBytes: 450 * 1024 },
  { file: "gym-floor-strip.webp", maxBytes: 260 * 1024 },
  { file: "poster-no-pain.webp", maxBytes: 180 * 1024 },
  { file: "stopwatch-keep-going.webp", maxBytes: 180 * 1024 },
  { file: "dumbbell-corner.webp", maxBytes: 180 * 1024 },
  { file: "poster-believe.webp", maxBytes: 180 * 1024 },
  { file: "towel-bar.webp", maxBytes: 180 * 1024 },
  { file: "vault-safe.webp", maxBytes: 80 * 1024 },
];

describe("home punch scene assets", () => {
  it("ships compressed project-bound WebP assets for the punch scene", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/punch/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
    }
  });
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-punch-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/punch/*.webp` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/home-ui-punch-assets.test.ts
git commit -m "test: add punch scene asset contract"
```

## Task 2: Generate, Cut Out, And Compress Punch Scene Assets

**Files:**
- Create: `public/assets/home-scenes/punch/gym-wall-bg.webp`
- Create: `public/assets/home-scenes/punch/gym-floor-strip.webp`
- Create: `public/assets/home-scenes/punch/poster-no-pain.webp`
- Create: `public/assets/home-scenes/punch/stopwatch-keep-going.webp`
- Create: `public/assets/home-scenes/punch/dumbbell-corner.webp`
- Create: `public/assets/home-scenes/punch/poster-believe.webp`
- Create: `public/assets/home-scenes/punch/towel-bar.webp`
- Create: `public/assets/home-scenes/punch/vault-safe.webp`

**Asset processing rules:**
- `gym-wall-bg.webp` and `gym-floor-strip.webp` are opaque background assets. Resize and compress directly from the generated source.
- `poster-no-pain.webp`, `stopwatch-keep-going.webp`, `dumbbell-corner.webp`, `poster-believe.webp`, `towel-bar.webp`, and `vault-safe.webp` are overlay assets. Generate them on a perfectly flat `#00ff00` chroma-key background, remove that background locally to alpha PNG, then compress to alpha WebP.
- If `#00ff00` appears inside a generated subject, regenerate that asset using `#ff00ff` as the chroma-key color and keep `--auto-key border` in the removal helper command so the border color is sampled automatically.
- Do not place raw generated PNGs under `public/`.
- Do not reference files from `/private/tmp/` or `$CODEX_HOME/generated_images/` in application code.

- [ ] **Step 1: Create staging and final directories**

Run:

```bash
mkdir -p /private/tmp/share-project-home-scenes-punch/raw /private/tmp/share-project-home-scenes-punch/alpha /private/tmp/share-project-home-scenes-punch/resized public/assets/home-scenes/punch
```

Expected: raw staging, alpha staging, resized staging, and final public directories exist.

- [ ] **Step 2: Generate `gym-wall-bg` with `imagegen`**

Use the `imagegen` skill with built-in tool mode. Prompt:

```text
Use case: stylized-concept
Asset type: web app scene background for the 健身打卡 tab
Primary request: a clean gym wall background for a playful brutalist Chinese fitness check-in web app
Scene/backdrop: light warm gray gym wall with subtle cement texture, faint dotted texture, soft wall seams, enough quiet negative space for UI cards
Style/medium: polished 2D raster illustration, flat-shaded, crisp edges, light texture, not photorealistic
Composition/framing: 16:9 wide background, no centered object, no people, no UI, no logos
Lighting/mood: bright indoor ambient light, friendly but work-focused
Color palette: warm off-white, light gray, slate accents, tiny muted yellow details
Constraints: no readable text, no watermarks, no oversized equipment, no dark vignette, no gradient orb decoration
```

After generation, copy the selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/gym-wall-bg.png
```

- [ ] **Step 3: Generate `gym-floor-strip` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: bottom floor strip for a web app scene
Primary request: a subtle gym floor and wall base strip for the bottom of a fitness dashboard
Scene/backdrop: low horizontal wall base, rubber gym floor texture, mild contact shadow
Style/medium: polished 2D raster illustration, crisp brutalist-friendly lines, quiet texture
Composition/framing: very wide horizontal strip, floor occupies lower half, transparent-looking empty upper area can be a flat light wall color
Lighting/mood: bright indoor ambient light
Color palette: light gray rubber floor, slate line work, warm off-white wall
Constraints: no people, no text, no logos, no equipment blocking the center
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/gym-floor-strip.png
```

- [ ] **Step 4: Generate `poster-no-pain` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative poster for a gym check-in web app
Primary request: a yellow taped paper gym poster with bold simple graphic shapes
Scene/backdrop: isolated poster on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow paper poster with black thick border, small tape strips, simple dumbbell mark
Style/medium: playful brutalist 2D illustration, crisp edges, slightly imperfect paper texture
Composition/framing: portrait poster, centered object, clean edges for cropping
Text (verbatim): "NO PAIN"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the poster for background removal; do not use #00ff00 anywhere in the poster, tape, graphic, or text; only the exact text "NO PAIN"; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/poster-no-pain.png
```

- [ ] **Step 5: Generate `stopwatch-keep-going` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative stopwatch sticker for a gym check-in web app
Primary request: a chunky round stopwatch sticker for a playful brutalist dashboard
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: round stopwatch with thick black outline, yellow button, small motion ticks
Style/medium: flat 2D raster illustration, crisp edge, subtle paper sticker texture
Composition/framing: square object, centered
Text (verbatim): "KEEP GOING"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the stopwatch for background removal; do not use #00ff00 anywhere in the stopwatch, ticks, or text; only the exact text "KEEP GOING"; no people; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/stopwatch-keep-going.png
```

- [ ] **Step 6: Generate `dumbbell-corner` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: lower corner decoration for a gym check-in web app
Primary request: a black dumbbell and weight plate corner decoration
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black dumbbell, one small weight plate, thick outline, slight yellow accent tape
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: object biased toward lower-left corner, usable as page corner decor
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the dumbbell for background removal; do not use #00ff00 anywhere in the subject; no text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/dumbbell-corner.png
```

- [ ] **Step 7: Generate `poster-believe` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative poster for a gym check-in web app
Primary request: a white taped training poster with a simple dumbbell graphic
Scene/backdrop: isolated poster on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: white paper poster, thick black outline, gray tape strips, small dumbbell line graphic
Style/medium: playful brutalist 2D illustration, crisp edge, slight paper texture
Composition/framing: portrait poster, centered object
Text (verbatim): "BELIEVE"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the poster for background removal; do not use #00ff00 anywhere in the poster, tape, graphic, or text; only the exact text "BELIEVE"; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/poster-believe.png
```

- [ ] **Step 8: Generate `towel-bar` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: right side decoration for a gym check-in web app
Primary request: a black wall bar with a yellow gym towel hanging from it
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: horizontal black wall bar, folded yellow towel, tiny tag shape without readable writing
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: portrait-ish object for right side placement, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the towel bar for background removal; do not use #00ff00 anywhere in the subject; no readable text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/towel-bar.png
```

- [ ] **Step 9: Generate `vault-safe` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: small vault illustration for the 牛马金库 card
Primary request: a yellow safe/vault icon for a playful brutalist fitness team dashboard
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow safe box with thick black outline, circular lock, a few small coin shapes
Style/medium: crisp flat 2D raster illustration, brutalist UI asset, simple and readable at small size
Composition/framing: square icon-like object, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the vault for background removal; do not use #00ff00 anywhere in the safe, lock, or coins; no text, no logo, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-punch/raw/vault-safe.png
```

- [ ] **Step 10: Remove chroma-key backgrounds from overlay assets**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/poster-no-pain.png --out /private/tmp/share-project-home-scenes-punch/alpha/poster-no-pain.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/stopwatch-keep-going.png --out /private/tmp/share-project-home-scenes-punch/alpha/stopwatch-keep-going.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/dumbbell-corner.png --out /private/tmp/share-project-home-scenes-punch/alpha/dumbbell-corner.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/poster-believe.png --out /private/tmp/share-project-home-scenes-punch/alpha/poster-believe.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/towel-bar.png --out /private/tmp/share-project-home-scenes-punch/alpha/towel-bar.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-punch/raw/vault-safe.png --out /private/tmp/share-project-home-scenes-punch/alpha/vault-safe.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
```

Expected: six alpha PNG files are written under `/private/tmp/share-project-home-scenes-punch/alpha/`.

- [ ] **Step 11: Verify alpha channels before WebP compression**

Run:

```bash
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-punch/alpha/poster-no-pain.png /private/tmp/share-project-home-scenes-punch/alpha/stopwatch-keep-going.png /private/tmp/share-project-home-scenes-punch/alpha/dumbbell-corner.png /private/tmp/share-project-home-scenes-punch/alpha/poster-believe.png /private/tmp/share-project-home-scenes-punch/alpha/towel-bar.png /private/tmp/share-project-home-scenes-punch/alpha/vault-safe.png
```

Expected: each line reports a PNG with an alpha-bearing channel such as `srgba`. If a line reports no alpha channel or shows visible chroma fringe during visual inspection, regenerate that specific source with a flatter chroma-key background and repeat Step 10 for that file.

- [ ] **Step 12: Resize assets to performance budgets**

Run:

```bash
magick /private/tmp/share-project-home-scenes-punch/raw/gym-wall-bg.png -resize "2560x2560>" /private/tmp/share-project-home-scenes-punch/resized/gym-wall-bg.png
magick /private/tmp/share-project-home-scenes-punch/raw/gym-floor-strip.png -resize "2560x360>" /private/tmp/share-project-home-scenes-punch/resized/gym-floor-strip.png
magick /private/tmp/share-project-home-scenes-punch/alpha/poster-no-pain.png -resize "720x720>" /private/tmp/share-project-home-scenes-punch/resized/poster-no-pain.png
magick /private/tmp/share-project-home-scenes-punch/alpha/stopwatch-keep-going.png -resize "720x720>" /private/tmp/share-project-home-scenes-punch/resized/stopwatch-keep-going.png
magick /private/tmp/share-project-home-scenes-punch/alpha/dumbbell-corner.png -resize "720x720>" /private/tmp/share-project-home-scenes-punch/resized/dumbbell-corner.png
magick /private/tmp/share-project-home-scenes-punch/alpha/poster-believe.png -resize "720x720>" /private/tmp/share-project-home-scenes-punch/resized/poster-believe.png
magick /private/tmp/share-project-home-scenes-punch/alpha/towel-bar.png -resize "720x720>" /private/tmp/share-project-home-scenes-punch/resized/towel-bar.png
magick /private/tmp/share-project-home-scenes-punch/alpha/vault-safe.png -resize "384x384>" /private/tmp/share-project-home-scenes-punch/resized/vault-safe.png
```

Expected: eight resized PNG files are written under `/private/tmp/share-project-home-scenes-punch/resized/`. Background files stay within their specified bounding boxes; overlay files stay within 720px max edge; `vault-safe.png` stays within 384px max edge.

- [ ] **Step 13: Compress resized assets into `public/assets/home-scenes/punch/`**

Run:

```bash
cwebp -q 82 /private/tmp/share-project-home-scenes-punch/resized/gym-wall-bg.png -o public/assets/home-scenes/punch/gym-wall-bg.webp
cwebp -q 82 /private/tmp/share-project-home-scenes-punch/resized/gym-floor-strip.png -o public/assets/home-scenes/punch/gym-floor-strip.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/poster-no-pain.png -o public/assets/home-scenes/punch/poster-no-pain.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/stopwatch-keep-going.png -o public/assets/home-scenes/punch/stopwatch-keep-going.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/dumbbell-corner.png -o public/assets/home-scenes/punch/dumbbell-corner.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/poster-believe.png -o public/assets/home-scenes/punch/poster-believe.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/towel-bar.png -o public/assets/home-scenes/punch/towel-bar.webp
cwebp -q 86 /private/tmp/share-project-home-scenes-punch/resized/vault-safe.png -o public/assets/home-scenes/punch/vault-safe.webp
```

Expected: eight WebP files are written under `public/assets/home-scenes/punch/`; six overlay WebP files preserve transparency.

- [ ] **Step 14: Inspect final dimensions and sizes**

Run:

```bash
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/punch/gym-wall-bg.webp public/assets/home-scenes/punch/gym-floor-strip.webp public/assets/home-scenes/punch/poster-no-pain.webp public/assets/home-scenes/punch/stopwatch-keep-going.webp public/assets/home-scenes/punch/dumbbell-corner.webp public/assets/home-scenes/punch/poster-believe.webp public/assets/home-scenes/punch/towel-bar.webp public/assets/home-scenes/punch/vault-safe.webp
du -h public/assets/home-scenes/punch/*.webp
```

Expected: background files are no wider than 2560px, overlay files are no wider than 720px, `vault-safe.webp` is no wider than 384px, and file sizes fit the asset contract in Task 1.

- [ ] **Step 15: Verify assets pass the contract**

Run:

```bash
npm test -- __tests__/home-ui-punch-assets.test.ts
```

Expected: PASS.

- [ ] **Step 16: Commit generated assets**

```bash
git add public/assets/home-scenes/punch __tests__/home-ui-punch-assets.test.ts
git commit -m "feat: add punch scene media assets"
```

## Task 3: Navbar Order And Visual Test

**Files:**
- Modify: `__tests__/coffee-tab.test.tsx`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update the navbar order expectations**

In `__tests__/coffee-tab.test.tsx`, replace the `uses managed pixel SVG assets for the primary navigation tabs` expectation with:

```ts
const desktopTabs = Array.from(container.querySelectorAll(".calendar-tab-strip .tab-btn"));
const tabLabels = desktopTabs.map((button) => button.textContent?.trim());
const tabIconSources = Array.from(container.querySelectorAll(".calendar-tab-strip .tab-btn img")).map((image) =>
  image.getAttribute("src"),
);

expect(tabLabels).toEqual([
  "健身打卡",
  "共享看板",
  "续命咖啡",
  "牛马日历",
  "战报中心",
  "牛马补给站",
]);
expect(tabIconSources).toEqual([
  "/assets/icons/workout-pixel.svg",
  "/assets/icons/board-pixel.svg",
  "/assets/icons/coffee-pixel.svg",
  "/assets/icons/calendar-pixel.svg",
  "/assets/icons/report-pixel.svg",
  "/assets/icons/supply-pixel.svg",
]);
```

Also update the TeamHeader asset assertion at the bottom of the file to:

```ts
expect(
  container.querySelector('img[src*="/assets/home-scenes/punch/vault-safe.webp"]'),
).not.toBeNull();
expect(container.textContent).toContain("全队个人银子总和");
expect(container.textContent).toContain("个人长期累计资产");
```

- [ ] **Step 2: Run the updated navbar test and verify it fails**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: FAIL because the current order is still `supply / calendar / dash`, and TeamHeader still uses the old vault trophy SVG.

- [ ] **Step 3: Reorder tabs and add nav shell hooks**

In `components/navbar/Navbar.tsx`:

1. Change the `<nav>` class to:

```tsx
<nav ref={navRef} className="app-top-nav w-full shrink-0 px-2 py-2 z-50">
```

2. Change the desktop tab strip class to:

```tsx
<div className="calendar-tab-strip home-tab-strip hidden min-w-0 gap-2 overflow-x-auto rounded-full border-2 border-slate-200 bg-slate-100 p-1 min-[761px]:flex">
```

3. Move the `supply` `TabBtn` block so the desktop order is:

```tsx
健身打卡
共享看板
续命咖啡
牛马日历
战报中心
牛马补给站
```

4. Move the mobile `supply` `TabBtn` block so the mobile panel uses the same order:

```tsx
健身打卡
共享看板
续命咖啡
牛马日历
战报中心
牛马补给站
```

- [ ] **Step 4: Add the black nav bar skin**

In `app/globals.css`, add after `body`:

```css
.app-top-nav {
  color: #f8fafc;
}

.app-top-nav > div:first-child {
  border: 3px solid #111827;
  border-radius: 1.35rem;
  background: #111827;
  box-shadow: 0 5px 0 0 rgba(17, 24, 39, 0.55);
  padding: 0.45rem 0.6rem;
}

.app-top-nav .font-black.text-2xl {
  color: #f8fafc;
}

.home-tab-strip {
  border-color: rgba(248, 250, 252, 0.14);
  background: rgba(15, 23, 42, 0.78);
}

.app-top-nav .team-dynamics-bell,
.app-top-nav .mobile-nav-toggle,
.app-top-nav button[aria-label="展开导航"],
.app-top-nav button[aria-label="收起导航"] {
  border-color: #f8fafc;
}
```

Then update existing `.tab-btn.inactive` and `.tab-btn.inactive:hover` rules to keep inactive nav readable on black:

```css
.tab-btn.inactive {
  background-color: transparent;
  color: #cbd5e1;
}
.tab-btn.inactive:hover {
  background-color: rgba(248, 250, 252, 0.14);
  color: #ffffff;
}
```

Add this after the existing tab-specific active rules so the desktop scene nav keeps one yellow active language across all pages:

```css
.home-tab-strip .tab-btn.active,
.home-tab-strip .tab-btn.board-tab.active,
.home-tab-strip .tab-btn.coffee-tab.active,
.home-tab-strip .tab-btn.calendar-tab.active,
.home-tab-strip .tab-btn.report-tab.active,
.home-tab-strip .tab-btn.supply-tab.active {
  border-color: #111827;
  background-color: #fde047;
  color: #111827;
  box-shadow: 0 3px 0 0 #111827;
}
```

- [ ] **Step 5: Run the navbar test and verify it passes**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit navbar changes**

```bash
git add components/navbar/Navbar.tsx app/globals.css __tests__/coffee-tab.test.tsx
git commit -m "feat: refresh home navigation shell"
```

## Task 4: Shared Tab Stage Scene Foundation

**Files:**
- Modify: `app/(board)/page.tsx`
- Modify: `app/globals.css`
- Create: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: Create scene foundation assertions**

Create `__tests__/home-ui-punch-scene.test.tsx` with this initial content:

```tsx
import { readFileSync } from "fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityStream } from "@/components/punch-board/ActivityStream";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { BoardProvider, useBoard } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const members = Array.from({ length: 5 }, (_, index) => ({
  id: `user-${index + 1}`,
  name: `成员${index + 1}`,
  avatarKey: index % 2 === 0 ? "male1" : "female1",
  assetBalance: 0,
  seasonIncome: 0,
  slotContribution: 0,
}));

const baseState: BoardState = {
  members,
  gridData: members.map((_, index) => [index === 0]),
  teamVaultTotal: 2800,
  currentUser: {
    assetBalance: 3450,
    currentStreak: 12,
    nextReward: 40,
    seasonIncome: 0,
    isAdmin: false,
  },
  activeSeason: null,
  today: 1,
  totalDays: 1,
  currentUserId: "user-1",
  logs: [],
  activeTab: "punch",
};

function Probe() {
  const { state } = useBoard();
  return <div data-testid="state">{JSON.stringify(state)}</div>;
}

describe("home punch scene UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ events: [] }),
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("defines the shared scene motion and reduced motion CSS hooks", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("--scene-enter-y");
    expect(css).toMatch(/\.board-tab-panel[\s\S]*transform:\s*translateY\(var\(--scene-enter-y\)\)/);
    expect(css).toMatch(/\.board-tab-panel-active[\s\S]*transform:\s*translateY\(0\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.board-tab-panel/);
  });

  it("renders the punch scene shell with project-bound decorative assets", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={baseState}>
          <PunchBoard />
        </BoardProvider>,
      );
      await Promise.resolve();
    });

    expect(container.querySelector(".punch-scene-shell")).not.toBeNull();
    expect(container.querySelector(".punch-scene-bg")).not.toBeNull();
    expect(container.querySelector('img[src="/assets/home-scenes/punch/poster-no-pain.webp"]')).not.toBeNull();
    expect(container.querySelector('img[src="/assets/home-scenes/punch/vault-safe.webp"]')).not.toBeNull();
    expect(container.textContent).toContain("今日打卡");
  });

  it("renders one reminder button per currently unpunched non-current member", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={baseState}>
          <ActivityStream />
          <Probe />
        </BoardProvider>,
      );
      await Promise.resolve();
    });

    expect(container.querySelectorAll(".activity-poke-card")).toHaveLength(4);
    expect(Array.from(container.querySelectorAll(".activity-poke-button")).map((button) => button.textContent)).toEqual([
      "催促",
      "催促",
      "催促",
      "催促",
    ]);

    const firstPokeButton = container.querySelector<HTMLButtonElement>(".activity-poke-button");
    expect(firstPokeButton).not.toBeNull();

    await act(async () => {
      firstPokeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(firstPokeButton!.textContent).toBe("已催促");
    expect(container.querySelector("[data-testid='state']")?.textContent).toContain("已向 成员2 发送催促提示");
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-punch-scene.test.tsx
```

Expected: FAIL because the scene shell, CSS hooks, and ActivityStream reminder card classes do not exist yet.

- [ ] **Step 3: Add stable scene transition classes to tab panels**

In `app/(board)/page.tsx`, update each tab panel wrapper to keep `board-tab-panel` and add a tab-specific class. For the punch panel, use:

```tsx
<div
  className={`board-tab-panel board-tab-panel-punch absolute inset-0 transition-opacity duration-300 ${
    state.activeTab === "punch" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
  }`}
>
  <PunchBoard />
</div>
```

Apply the same pattern to the other panels:

```tsx
board-tab-panel-board
board-tab-panel-coffee
board-tab-panel-supply
board-tab-panel-calendar
board-tab-panel-dash
```

- [ ] **Step 4: Add shared scene motion CSS**

In `app/globals.css`, add near the existing mobile `board-tab-stage` rules:

```css
.board-tab-stage {
  --scene-enter-y: 0.75rem;
  --scene-scale: 0.995;
  isolation: isolate;
}

.board-tab-panel {
  transform: translateY(var(--scene-enter-y)) scale(var(--scene-scale));
  transition:
    opacity 220ms ease,
    transform 260ms ease;
}

.board-tab-panel-active {
  transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .board-tab-panel,
  .board-tab-panel-active,
  .punch-scene-decor,
  .activity-live-dot {
    animation: none !important;
    transform: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 5: Run scene foundation CSS assertion**

Run:

```bash
npm test -- __tests__/home-ui-punch-scene.test.tsx
```

Expected: still FAIL until the punch scene and ActivityStream tasks are complete, but the first CSS assertion should pass.

## Task 5: PunchBoard Scene Shell

**Files:**
- Modify: `components/punch-board/PunchBoard.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: Replace `PunchBoard` markup with scene layers**

Replace the return value in `components/punch-board/PunchBoard.tsx` with:

```tsx
return (
  <section className="punch-scene-shell absolute inset-0 overflow-hidden">
    <div className="punch-scene-bg" aria-hidden="true" />
    <img
      src="/assets/home-scenes/punch/poster-no-pain.webp"
      alt=""
      className="punch-scene-decor punch-scene-decor-left-top"
      aria-hidden="true"
    />
    <img
      src="/assets/home-scenes/punch/stopwatch-keep-going.webp"
      alt=""
      className="punch-scene-decor punch-scene-decor-left-mid"
      aria-hidden="true"
    />
    <img
      src="/assets/home-scenes/punch/dumbbell-corner.webp"
      alt=""
      className="punch-scene-decor punch-scene-decor-left-bottom"
      aria-hidden="true"
    />
    <img
      src="/assets/home-scenes/punch/poster-believe.webp"
      alt=""
      className="punch-scene-decor punch-scene-decor-right-top"
      aria-hidden="true"
    />
    <img
      src="/assets/home-scenes/punch/towel-bar.webp"
      alt=""
      className="punch-scene-decor punch-scene-decor-right-mid"
      aria-hidden="true"
    />
    <div className="punch-board-shell absolute inset-0 z-10 flex flex-col gap-4 transition-opacity duration-300">
      <TeamHeader />
      <HeatmapGrid />
      <ActivityStream />
    </div>
  </section>
);
```

- [ ] **Step 2: Add punch scene CSS**

In `app/globals.css`, add:

```css
.punch-scene-shell {
  border-radius: 1.75rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(248, 250, 252, 0.86)),
    url("/assets/home-scenes/punch/gym-wall-bg.webp") center / cover no-repeat;
}

.punch-scene-shell::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: min(26vh, 15rem);
  background: url("/assets/home-scenes/punch/gym-floor-strip.webp") bottom center / cover no-repeat;
  content: "";
  opacity: 0.62;
  pointer-events: none;
}

.punch-scene-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(17, 24, 39, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(253, 224, 71, 0.14), transparent 28%, transparent 72%, rgba(20, 184, 166, 0.12));
  background-size: 24px 24px, 100% 100%;
  pointer-events: none;
}

.punch-board-shell {
  padding: clamp(0.75rem, 1.6vw, 1.25rem);
}

.punch-scene-decor {
  position: absolute;
  z-index: 1;
  max-width: min(16vw, 11rem);
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.punch-scene-decor-left-top {
  top: 11%;
  left: 1.2%;
  transform: rotate(-6deg);
}

.punch-scene-decor-left-mid {
  top: 39%;
  left: 2.1%;
  max-width: min(12vw, 8.5rem);
  transform: rotate(5deg);
}

.punch-scene-decor-left-bottom {
  bottom: 2%;
  left: 0.8%;
  max-width: min(18vw, 13rem);
}

.punch-scene-decor-right-top {
  top: 12%;
  right: 1.5%;
  transform: rotate(5deg);
}

.punch-scene-decor-right-mid {
  top: 41%;
  right: 1.2%;
  max-width: min(14vw, 10rem);
}
```

- [ ] **Step 3: Add responsive decor constraints**

In the existing `@media (max-width: 760px)` block, add:

```css
.punch-scene-shell {
  position: relative;
  inset: auto;
  min-height: auto;
  overflow: visible;
  border-radius: 1.15rem;
}

.punch-scene-decor {
  display: none;
}
```

Also update the existing mobile `.punch-board-shell` rule to keep the scene padding:

```css
.punch-board-shell {
  position: relative;
  inset: auto;
  min-height: auto;
  padding: 0.75rem 0.75rem 1rem;
}
```

- [ ] **Step 4: Run scene test**

Run:

```bash
npm test -- __tests__/home-ui-punch-scene.test.tsx
```

Expected: the punch scene shell assertion passes; TeamHeader and ActivityStream assertions still fail until later tasks.

## Task 6: TeamHeader Gym Notice Board Visual

**Files:**
- Modify: `components/punch-board/TeamHeader.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/coffee-tab.test.tsx`
- Test: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: Replace the left vault icon block in `TeamHeader`**

In `components/punch-board/TeamHeader.tsx`, remove the `AssetIcon` import if it is no longer used. Replace the first child `<div className="flex shrink-0 items-center gap-4">...</div>` with:

```tsx
<div className="team-header-vault flex shrink-0 items-center gap-4">
  <div className="team-header-vault-visual" aria-hidden="true">
    <img
      src="/assets/home-scenes/punch/vault-safe.webp"
      alt=""
      className="h-full w-full object-contain"
    />
  </div>
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
    <div className="text-2xl font-extrabold flex items-baseline gap-1">
      {teamVaultTotal.toLocaleString("zh-CN")}
    </div>
    <span className="text-xs font-medium text-sub">全队个人银子总和</span>
  </div>
</div>
```

Do not change the calculation for `teamVaultTotal`, `assetBalance`, `currentStreak`, `nextReward`, or `todayPunchedCount`.

- [ ] **Step 2: Add TeamHeader visual CSS**

In `app/globals.css`, update `.team-header` to:

```css
.team-header {
  display: flex;
  min-height: 6.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 2rem;
  border-color: #111827;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 251, 235, 0.92)),
    radial-gradient(circle at 12% 15%, rgba(253, 224, 71, 0.32), transparent 28%);
  box-shadow: 0 8px 0 0 rgba(17, 24, 39, 0.72);
}
```

Add:

```css
.team-header-vault {
  min-width: 15rem;
}

.team-header-vault-visual {
  width: 4.3rem;
  height: 4.3rem;
  flex: 0 0 auto;
  border: 3px solid #111827;
  border-radius: 1.1rem;
  background: #fde047;
  box-shadow: 0 4px 0 0 #111827;
  padding: 0.35rem;
}
```

- [ ] **Step 3: Update mobile TeamHeader constraints**

In the existing `@media (max-width: 760px)` block, add:

```css
.team-header-vault {
  min-width: 0;
}

.team-header-vault-visual {
  width: 3.6rem;
  height: 3.6rem;
}
```

- [ ] **Step 4: Run TeamHeader-related tests**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx __tests__/home-ui-punch-scene.test.tsx
```

Expected: TeamHeader asset assertions pass. ActivityStream assertion may still fail until Task 8.

## Task 7: Heatmap Wall Visual Hooks

**Files:**
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add visual hook assertions to the existing compact rail test**

In `__tests__/heatmap-grid-punch.test.tsx`, inside `renders a compact member rail structure that can hold all mobile avatars`, add:

```ts
expect(container.querySelectorAll(".heatmap-me-badge")).toHaveLength(2);
expect(container.querySelectorAll(".cell-today").length).toBeGreaterThanOrEqual(5);
expect(container.querySelectorAll(".heatmap-member-item-current")).toHaveLength(1);
```

This expects one desktop “我” badge and one mobile “我” badge for the current member.

- [ ] **Step 2: Run the heatmap test and verify it fails**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: FAIL because the new class hooks are missing.

- [ ] **Step 3: Add a cell class helper**

In `components/punch-board/HeatmapGrid.tsx`, add this helper inside `HeatmapGrid` before `renderPunchCell`:

```tsx
function getCellClassName(rowIndex: number, index: number, stateClass: string, extra = "") {
  const day = index + 1;
  const isToday = day === state.today;
  const isCurrentUser = rowIndex === currentUserIndex;

  return [
    "cell",
    stateClass,
    isToday ? "cell-today" : "",
    isCurrentUser ? "cell-current-user" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
```

- [ ] **Step 4: Use the helper in `renderPunchCell`**

Replace the class strings inside `renderPunchCell` with:

```tsx
if (day < state.today) {
  return (
    <div key={day} className={getCellClassName(rowIndex, index, status ? "cell-punched" : "cell-missed")}>
      {status ? "✓" : ""}
    </div>
  );
}

if (day === state.today && !status && isCurrentUser) {
  return (
    <PunchPopup
      key={day}
      busy={submitting}
      error={error}
      onConfirm={handlePunchConfirm}
      triggerClassName={getCellClassName(
        rowIndex,
        index,
        "my-punch-btn",
        "text-xl cursor-pointer disabled:opacity-50",
      )}
      helperText="确认后会记为今日健身打卡，并获得 1 张健身券。"
    />
  );
}

if (day === state.today && status && isCurrentUser) {
  return (
    <PunchPopup
      key={day}
      busy={submitting}
      error={error}
      onConfirm={handlePunchUndo}
      triggerContent="✓"
      triggerClassName={getCellClassName(
        rowIndex,
        index,
        "cell-punched",
        "cursor-pointer disabled:opacity-50",
      )}
      title="撤销今天打卡"
      description="确认撤销今天的打卡吗？"
      helperText="撤销后会回滚今天获得的银子、连签、赛季进度和未使用的健身券。"
      confirmLabel="确认撤销"
      busyLabel="撤销中..."
    />
  );
}

if (day === state.today && status) {
  return <div key={day} className={getCellClassName(rowIndex, index, "cell-punched")}>✓</div>;
}

return <div key={day} className={getCellClassName(rowIndex, index, "cell-future", "opacity-50")} />;
```

- [ ] **Step 5: Add current member class and badge in desktop member rail**

In the desktop `state.members.map`, change the member item class to:

```tsx
className={`heatmap-member-item flex flex-col items-center gap-1 relative ${
  index === currentUserIndex ? "heatmap-member-item-current" : ""
}`}
```

Inside `.heatmap-member-avatar`, after the `<img>`, add:

```tsx
{index === currentUserIndex ? <span className="heatmap-me-badge">我</span> : null}
```

- [ ] **Step 6: Add current member badge in mobile member rail**

Inside `.heatmap-mobile-avatar`, after the `<img>`, add:

```tsx
{rowIndex === currentUserIndex ? <span className="heatmap-me-badge">我</span> : null}
```

- [ ] **Step 7: Add heatmap wall CSS**

In `app/globals.css`, add:

```css
.heatmap-shell,
.heatmap-mobile-shell {
  border-color: #111827;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.96)),
    repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.04) 0 1px, transparent 1px 3rem);
  box-shadow: 0 8px 0 0 rgba(17, 24, 39, 0.72);
}

.heatmap-members-column,
.heatmap-mobile-member,
.heatmap-mobile-member-head {
  background-color: rgba(255, 255, 255, 0.94);
}

.heatmap-member-item-current .heatmap-member-avatar,
.heatmap-mobile-avatar:has(.heatmap-me-badge) {
  border-color: #111827;
  box-shadow: 0 3px 0 0 #111827;
}

.heatmap-me-badge {
  position: absolute;
  right: -0.45rem;
  bottom: -0.3rem;
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;
  align-items: center;
  justify-content: center;
  border: 2px solid #111827;
  border-radius: 9999px;
  background: #fde047;
  color: #111827;
  font-size: 0.62rem;
  font-weight: 900;
  line-height: 1;
}

.cell-today {
  outline: 3px solid rgba(253, 224, 71, 0.82);
  outline-offset: 2px;
}

.cell-current-user.cell-today {
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.12), 0 4px 0 0 rgba(17, 24, 39, 0.72);
}
```

- [ ] **Step 8: Run heatmap tests**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS. Existing punch behavior tests must still pass.

- [ ] **Step 9: Commit heatmap changes**

```bash
git add components/punch-board/HeatmapGrid.tsx app/globals.css __tests__/heatmap-grid-punch.test.tsx
git commit -m "feat: style punch heatmap wall"
```

## Task 8: ActivityStream Reminder Cards

**Files:**
- Modify: `components/punch-board/ActivityStream.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: Replace the footer body layout in `ActivityStream`**

Keep `unpunchedMembers`, `pokedMembers`, `fetchEvents`, `sortedEvents`, and the dispatch logic. Replace the scroll body and old reminder button block with this structure inside the footer after the header:

```tsx
<div className="activity-stream-body grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)] gap-3 p-3 px-6">
  <div ref={streamRef} className="activity-log-panel flex min-h-0 flex-col gap-2 overflow-y-auto pr-1 text-sm">
    {!hasActivity ? (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-3 text-xs font-bold text-sub">
        最近 24 小时还没有新动态
      </div>
    ) : null}

    {sortedEvents.map((event) => {
      const timestamp = new Date(event.createdAt);

      return (
        <div key={event.id} className="flex w-full items-start gap-2 text-main">
          <span className="mt-1 shrink-0 font-mono text-[10px] text-slate-300">
            [{formatTime(timestamp)}]
          </span>
          <img
            src={getAvatarUrl(event.user.avatarKey)}
            alt={event.user.name}
            className="h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-cover"
          />
          <span className="flex-1 text-xs font-bold leading-relaxed text-slate-700">
            {event.text}
          </span>
        </div>
      );
    })}

    {state.logs.map((log) => (
      <div key={log.id} className={`flex w-full items-start gap-2 ${getLogColorClass(log.type)}`}>
        <span className="mt-1 shrink-0 font-mono text-[10px] text-slate-300">
          [{formatTime(log.timestamp)}]
        </span>
        <span className="flex items-center pt-0.5" dangerouslySetInnerHTML={{ __html: getLogIcon(log.type) }} />
        <span className="flex-1 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: log.text }} />
      </div>
    ))}
  </div>

  <aside className="activity-poke-panel min-w-0 rounded-2xl border-2 border-slate-900 bg-yellow-50/90 p-3 shadow-[0_4px_0_0_#111827]">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">今日催促</span>
      <span className="rounded-full border border-slate-900 bg-white px-2 py-0.5 text-[10px] font-black text-slate-800">
        {unpunchedMembers.length}
      </span>
    </div>

    {unpunchedMembers.length > 0 ? (
      <div className="activity-poke-grid grid grid-cols-4 gap-2">
        {unpunchedMembers.map((member) => {
          const isPoked = pokedMembers.has(member.id);

          return (
            <div key={member.id} className="activity-poke-card flex min-w-0 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-center">
              <img
                src={getAvatarUrl(member.avatarKey)}
                alt={member.name}
                className="h-9 w-9 rounded-full border-2 border-slate-900 bg-slate-50 object-cover"
              />
              <span className="max-w-full truncate text-[10px] font-black text-slate-700">{member.name}</span>
              <button
                type="button"
                className={`activity-poke-button quest-btn w-full px-2 py-1 text-[10px] tracking-wide ${
                  isPoked ? "cursor-not-allowed opacity-50" : ""
                }`}
                onClick={() => {
                  if (isPoked) return;
                  setPokedMembers((current) => new Set(current).add(member.id));
                  dispatch({
                    type: "ADD_LOG",
                    log: {
                      id: `poke-${Date.now()}`,
                      text: `${SvgIcons.signal} <span class="align-middle">已向 ${member.name} 发送催促提示。</span>`,
                      type: "system",
                      timestamp: new Date(),
                    },
                  });
                }}
                disabled={isPoked}
              >
                {isPoked ? "已催促" : "催促"}
              </button>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/75 px-3 py-4 text-center text-xs font-black text-slate-500">
        今日全员已完成
      </div>
    )}
  </aside>
</div>
```

- [ ] **Step 2: Add ActivityStream CSS**

In `app/globals.css`, add:

```css
.activity-stream {
  border-color: #111827;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 0 0 rgba(17, 24, 39, 0.72);
}

.activity-stream > div:first-child {
  border-color: #111827;
  background: #111827;
  color: #f8fafc;
}

.activity-live-dot {
  animation: activity-live-pulse 1.6s ease-in-out infinite;
}

.activity-log-panel {
  scrollbar-width: thin;
}

.activity-poke-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.activity-poke-card {
  min-height: 6.8rem;
}

@keyframes activity-live-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}
```

In the existing sync dot span, add `activity-live-dot` to the class list:

```tsx
className={`activity-live-dot inline-block h-2 w-2 rounded-full ${
  syncState === "error" ? "bg-orange-500" : "animate-pulse bg-green-500"
}`}
```

- [ ] **Step 3: Add mobile ActivityStream layout**

In the existing `@media (max-width: 760px)` block, add:

```css
.activity-stream-body {
  grid-template-columns: minmax(0, 1fr);
  padding-inline: 0.85rem;
}

.activity-poke-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] **Step 4: Run ActivityStream scene test**

Run:

```bash
npm test -- __tests__/home-ui-punch-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit ActivityStream changes**

```bash
git add components/punch-board/ActivityStream.tsx app/globals.css __tests__/home-ui-punch-scene.test.tsx
git commit -m "feat: integrate punch reminder cards"
```

## Task 9: Responsive And Reduced Motion Polish

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/p3-responsive-css.test.ts`
- Test: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: Extend responsive CSS assertions**

In `__tests__/p3-responsive-css.test.ts`, inside `adds the mobile safety rules for the team header and dropdown`, add:

```ts
expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.punch-scene-decor\s*\{[\s\S]*display:\s*none/);
expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.activity-stream-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
expect(css).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.punch-scene-decor/);
```

- [ ] **Step 2: Run responsive CSS test**

Run:

```bash
npm test -- __tests__/p3-responsive-css.test.ts
```

Expected: PASS if previous CSS was added correctly.

- [ ] **Step 3: Add high-density desktop guardrails**

In `app/globals.css`, add:

```css
@media (max-width: 1180px) {
  .punch-scene-decor {
    opacity: 0.42;
  }

  .punch-scene-decor-left-mid,
  .punch-scene-decor-right-mid {
    display: none;
  }

  .activity-poke-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 4: Run focused UI tests**

Run:

```bash
npm test -- __tests__/p3-responsive-css.test.ts __tests__/home-ui-punch-scene.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/coffee-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit responsive polish**

```bash
git add app/globals.css __tests__/p3-responsive-css.test.ts
git commit -m "feat: polish punch scene responsiveness"
```

## Task 10: Full Verification

**Files:**
- No new files unless visual QA exposes a UI-only bug.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run type checking**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3001`.

- [ ] **Step 4: Browser visual verification**

Open `http://localhost:3001` in the in-app browser and verify:

- Black top navigation is visible.
- Desktop tab order is `健身打卡 / 共享看板 / 续命咖啡 / 牛马日历 / 战报中心 / 牛马补给站`.
- Bell icon and profile dropdown remain usable.
- Punch page uses the gym wall background and side decorations.
- Top summary still shows `牛马金库`, `我的银子`, `连签`, `下次奖励`, and exactly one `今日打卡`.
- Heatmap remains the main surface and today cells are highlighted.
- Current user is labeled with `我`.
- Bottom activity panel contains activity logs plus per-member reminder cards.
- Clicking one `催促` button changes only that button to `已催促` and appends the existing local log.
- Mobile width around 390px has no overlapping text, hidden side decorations, and stacked activity/reminder panels.
- With reduced motion enabled in browser/devtools, scene transitions and decorative motion do not animate.

- [ ] **Step 5: Stop the dev server**

Stop the `npm run dev` process from the terminal session.

- [ ] **Step 6: Final status check**

Run:

```bash
git status --short
```

Expected: only intentional committed changes remain, or no output if everything was committed.

## Self-Review Checklist

- Spec coverage:
  - UI audit and media gaps are covered by the spec and Tasks 1-2.
  - Media checklist generation, transparent cutout processing, compression, dimension checks, and project storage are covered by Tasks 1-2.
  - Shared visual foundation is covered by Tasks 3-5 and Task 9.
  - Fitness check-in sample page is covered by Tasks 5-8.
  - ActivityStream reminder boundary is covered by Task 8 without removing existing behavior.
  - Reduced motion is covered by Task 4 and Task 9.
- Placeholder scan:
  - No banned placeholder markers or deferred-work instructions are used.
  - Every code-touching task lists exact files, snippets, commands, and expected outcomes.
- Type consistency:
  - Existing tab keys stay `punch`, `board`, `coffee`, `calendar`, `dash`, `supply`.
  - Existing `BoardState` fields stay unchanged.
  - Existing `ADD_LOG` reminder behavior stays in `ActivityStream`.
  - CSS class names introduced in tests match implementation snippets.
