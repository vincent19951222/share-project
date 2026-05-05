# Home UI 03 Coffee Receipt Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `续命咖啡` tab into the approved coffee receipt counter prototype using UI, layout, motion, and generated media assets only.

**Architecture:** Keep the current Next.js App Router, `CoffeeProvider`, API routes, mutation semantics, polling, and data contracts unchanged. Add compressed raster assets under `public/assets/home-scenes/coffee/`, then wire them into `CoffeeCheckin`, `CoffeeReceipt`, `CoffeeGrid`, and `CoffeeActivityFeed` through presentational markup and CSS class hooks. Use the existing `AssetIcon`, avatar helpers, Vitest component tests, and `app/globals.css` scene contract patterns established by the punch and shared-board UI work.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v4 through `app/globals.css`, Vitest + jsdom, built-in `imagegen` skill, chroma-key removal helper from the `imagegen` skill, ImageMagick `magick`, `cwebp`.

---

## Scope Guardrails

- Do not modify Prisma schema, coffee API route paths, response payloads, `CoffeeSnapshot`, `CoffeeProvider`, or coffee mutation semantics.
- Do not alter `calendar:refresh` or `activity-events:refresh` dispatch behavior.
- Do not add new coffee stats, leaderboards, rewards, admin controls, fake members, fake dates, or fake cup counts.
- Do not reference generated-image temp paths in app code. App code may only reference `/assets/home-scenes/coffee/<filename>`.
- Raw generated images stay in `/private/tmp/share-project-home-scenes-coffee/raw/` and never enter `public/`.
- Background assets may be opaque WebP. Decorative props must be alpha WebP after chroma-key removal.

## File Structure

- Create: `public/assets/home-scenes/coffee/`
  - Final compressed coffee scene assets.
- Create: `__tests__/home-ui-coffee-assets.test.ts`
  - Verifies required coffee scene assets exist and stay below size budgets.
- Create: `__tests__/home-ui-coffee-scene-css.test.ts`
  - Verifies scene, props, receipt, calendar paper, dialog, and reduced-motion CSS contracts.
- Modify: `__tests__/coffee-checkin.test.tsx`
  - Adds structural assertions for coffee scene layers, media paths, current-user badge, date labels, receipt/feed classes, and dialog visual hooks while preserving existing behavior tests.
- Modify: `components/coffee-checkin/CoffeeCheckin.tsx`
  - Adds `coffee-scene`, background, props, content, and shared loading/error scene states.
- Modify: `components/coffee-checkin/CoffeeReceipt.tsx`
  - Converts today receipt and realtime feed stack to ticket-style markup and stable class hooks.
- Modify: `components/coffee-checkin/CoffeeActivityFeed.tsx`
  - Adds print-log class hooks and preserves polling/aria behavior.
- Modify: `components/coffee-checkin/CoffeeGrid.tsx`
  - Adds date labels, current-user `我` badge, calendar paper hooks, cell state hooks, and receipt-style dialog hooks.
- Modify: `app/globals.css`
  - Adds coffee scene, assets, receipt, realtime feed, calendar paper, cells, dialog, responsive, and reduced-motion CSS.

## Task 1: Coffee Asset Contract Test

**Files:**
- Create: `__tests__/home-ui-coffee-assets.test.ts`
- Create directory during implementation: `public/assets/home-scenes/coffee/`

- [ ] **Step 1: Write the failing asset contract test**

Create `__tests__/home-ui-coffee-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "coffee-counter-bg.webp", maxBytes: 450 * 1024 },
  { file: "receipt-paper-texture.webp", maxBytes: 320 * 1024 },
  { file: "takeaway-cup.webp", maxBytes: 180 * 1024 },
  { file: "note-no-coffee-no-gain.webp", maxBytes: 160 * 1024 },
  { file: "note-but-first-coffee.webp", maxBytes: 160 * 1024 },
  { file: "sugar-packet.webp", maxBytes: 120 * 1024 },
  { file: "coffee-beans.webp", maxBytes: 120 * 1024 },
  { file: "coffee-ring-stain.webp", maxBytes: 100 * 1024 },
  { file: "coffee-stamp-paper.webp", maxBytes: 160 * 1024 },
  { file: "receipt-clip.webp", maxBytes: 120 * 1024 },
] as const;

describe("home coffee scene assets", () => {
  it("ships compressed project-bound WebP assets for the coffee receipt counter", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/coffee/${asset.file}`;

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
npm test -- __tests__/home-ui-coffee-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/coffee/*.webp` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/home-ui-coffee-assets.test.ts
git commit -m "test: add coffee scene asset contract"
```

## Task 2: Coffee Scene Structure And CSS Contract Tests

**Files:**
- Create: `__tests__/home-ui-coffee-scene-css.test.ts`
- Modify: `__tests__/coffee-checkin.test.tsx`

- [ ] **Step 1: Add CSS contract test**

Create `__tests__/home-ui-coffee-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function extractBlock(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

function extractRuleBody(css: string, selector: string) {
  const selectorIndex = css.indexOf(selector);
  expect(selectorIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", selectorIndex);
  expect(blockStart).toBeGreaterThan(selectorIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

describe("home coffee scene CSS", () => {
  it("styles the coffee tab as a layered receipt counter scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".coffee-scene {");
    const backgroundRule = extractRuleBody(css, ".coffee-scene-background");
    const propsRule = extractRuleBody(css, ".coffee-scene-props");
    const contentRule = extractRuleBody(css, ".coffee-scene-content");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/border-radius:\s*inherit/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/border-radius:\s*inherit/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
  });

  it("styles receipt, realtime feed, calendar paper, and coffee dialog surfaces", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const receiptRule = extractRuleBody(css, ".coffee-receipt-ticket");
    const feedRule = extractRuleBody(css, ".coffee-activity-ticket");
    const calendarRule = extractRuleBody(css, ".coffee-calendar-paper");
    const todayColumnRule = extractRuleBody(css, ".coffee-day-column-today");
    const dialogRule = extractRuleBody(css, ".coffee-dialog-ticket");

    expect(receiptRule).toMatch(/border:\s*4px solid #111827/);
    expect(receiptRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(feedRule).toMatch(/border:\s*4px solid #111827/);
    expect(feedRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(calendarRule).toMatch(/border:\s*4px solid #111827/);
    expect(calendarRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(todayColumnRule).toMatch(/background:\s*rgba\(20,\s*184,\s*166,\s*0\.16\)/);
    expect(dialogRule).toMatch(/border:\s*4px solid #111827/);
  });

  it("includes responsive and reduced-motion coverage for the coffee scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlock = extractBlock(css, "@media (max-width: 980px)");
    const reducedMotionBlock = extractBlock(css, "@media (prefers-reduced-motion: reduce)");

    expect(mobileBlock).toContain(".coffee-counter-layout");
    expect(mobileBlock).toContain(".coffee-scene-props");
    expect(reducedMotionBlock).toContain(".coffee-scene *");
    expect(reducedMotionBlock).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
```

- [ ] **Step 2: Add component structure assertions**

Append this test to the `describe("CoffeeCheckin", () => { ... })` block in `__tests__/coffee-checkin.test.tsx`:

```ts
  it("renders the coffee receipt counter scene with media layers and stable visual hooks", async () => {
    mockCoffeeFetch({
      stateSnapshots: [snapshot(2)],
    });

    await act(async () => {
      root.render(renderCoffeeCheckin());
      await Promise.resolve();
    });

    expect(container.querySelector(".coffee-scene")).not.toBeNull();
    expect(container.querySelector(".coffee-scene-background")).not.toBeNull();
    expect(container.querySelector(".coffee-scene-props")).not.toBeNull();
    expect(container.querySelector(".coffee-scene-content")).not.toBeNull();
    expect(container.querySelector(".coffee-receipt-ticket")).not.toBeNull();
    expect(container.querySelector(".coffee-activity-ticket")).not.toBeNull();
    expect(container.querySelector(".coffee-calendar-paper")).not.toBeNull();
    expect(container.querySelector(".coffee-current-user-badge")?.textContent).toBe("我");
    expect(container.textContent).toContain("今天");

    expect(
      container.querySelector('img[src="/assets/home-scenes/coffee/takeaway-cup.webp"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('img[src="/assets/home-scenes/coffee/note-no-coffee-no-gain.webp"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('img[src="/assets/home-scenes/coffee/note-but-first-coffee.webp"]'),
    ).not.toBeNull();
  });
```

- [ ] **Step 3: Add dialog visual hook assertion**

Inside the existing `"asks for confirmation before adding the first cup from the calendar"` test in `__tests__/coffee-checkin.test.tsx`, after `const dialog = container.querySelector('[role="dialog"]');`, add:

```ts
    expect(dialog?.querySelector(".coffee-dialog-ticket")).not.toBeNull();
```

- [ ] **Step 4: Run the new tests and verify they fail**

Run:

```bash
npm test -- __tests__/home-ui-coffee-scene-css.test.ts __tests__/coffee-checkin.test.tsx
```

Expected: FAIL because `coffee-scene`, `coffee-receipt-ticket`, `coffee-calendar-paper`, media references, dialog hooks, and coffee CSS contract do not exist yet.

- [ ] **Step 5: Commit the failing tests**

```bash
git add __tests__/home-ui-coffee-scene-css.test.ts __tests__/coffee-checkin.test.tsx
git commit -m "test: add coffee scene visual contracts"
```

## Task 3: Asset Staging Directories

**Files:**
- Create directory: `public/assets/home-scenes/coffee/`
- Use temp directories under `/private/tmp/share-project-home-scenes-coffee/`

- [ ] **Step 1: Create staging and final directories**

Run:

```bash
mkdir -p /private/tmp/share-project-home-scenes-coffee/raw /private/tmp/share-project-home-scenes-coffee/alpha /private/tmp/share-project-home-scenes-coffee/resized public/assets/home-scenes/coffee
```

Expected: raw, alpha, resized, and final public directories exist.

- [ ] **Step 2: Confirm final directory is empty before asset work**

Run:

```bash
find public/assets/home-scenes/coffee -maxdepth 1 -type f | sort
```

Expected: no output before the asset tasks begin.

## Task 4: Asset - `coffee-counter-bg.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/coffee-counter-bg.webp`

- [ ] **Step 1: Generate `coffee-counter-bg` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: web app scene background for the 续命咖啡 tab
Primary request: a clean coffee counter paper background for a playful brutalist Chinese team coffee check-in web app
Scene/backdrop: light warm desk surface covered by off-white receipt paper texture, subtle coffee stains, faint dotted texture, quiet negative space for UI panels
Style/medium: polished 2D raster illustration, flat-shaded, crisp edges, light texture, not photorealistic
Composition/framing: 16:9 wide background, no centered object, no people, no UI, no logos
Lighting/mood: bright indoor ambient light, friendly and work-focused
Color palette: warm off-white, light beige, pale gray, tiny muted coffee-brown marks
Constraints: no readable text, no watermarks, no dark vignette, no gradient orb decoration, no large objects blocking center
```

Copy the selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/coffee-counter-bg.png
```

- [ ] **Step 2: Resize and compress `coffee-counter-bg`**

Run:

```bash
magick /private/tmp/share-project-home-scenes-coffee/raw/coffee-counter-bg.png -resize "2560x1440>" /private/tmp/share-project-home-scenes-coffee/resized/coffee-counter-bg.png
cwebp -q 82 /private/tmp/share-project-home-scenes-coffee/resized/coffee-counter-bg.png -o public/assets/home-scenes/coffee/coffee-counter-bg.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/coffee-counter-bg.webp
du -h public/assets/home-scenes/coffee/coffee-counter-bg.webp
```

Expected: final WebP exists, is no larger than 2560x1440, and stays under 450 KB.

- [ ] **Step 3: Commit `coffee-counter-bg`**

```bash
git add public/assets/home-scenes/coffee/coffee-counter-bg.webp
git commit -m "feat: add coffee counter background asset"
```

## Task 5: Asset - `receipt-paper-texture.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/receipt-paper-texture.webp`

- [ ] **Step 1: Generate `receipt-paper-texture` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: receipt paper texture for web app surfaces
Primary request: a clean white receipt paper texture for coffee statistics cards
Scene/backdrop: plain off-white paper, subtle fibers, faint gray edge marks, very light print-paper grain
Style/medium: polished 2D raster texture, crisp but quiet, not photorealistic
Composition/framing: portrait paper texture, no centered object, no UI, no people
Lighting/mood: bright soft indoor light
Color palette: white, warm off-white, pale gray
Constraints: no readable text, no logos, no heavy stains, no watermark, no dark vignette
```

Copy the selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/receipt-paper-texture.png
```

- [ ] **Step 2: Resize and compress `receipt-paper-texture`**

Run:

```bash
magick /private/tmp/share-project-home-scenes-coffee/raw/receipt-paper-texture.png -resize "1400x1800>" /private/tmp/share-project-home-scenes-coffee/resized/receipt-paper-texture.png
cwebp -q 84 /private/tmp/share-project-home-scenes-coffee/resized/receipt-paper-texture.png -o public/assets/home-scenes/coffee/receipt-paper-texture.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/receipt-paper-texture.webp
du -h public/assets/home-scenes/coffee/receipt-paper-texture.webp
```

Expected: final WebP exists, is no larger than 1400x1800, and stays under 320 KB.

- [ ] **Step 3: Commit `receipt-paper-texture`**

```bash
git add public/assets/home-scenes/coffee/receipt-paper-texture.webp
git commit -m "feat: add coffee receipt paper texture"
```

## Task 6: Asset - `takeaway-cup.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/takeaway-cup.webp`

- [ ] **Step 1: Generate `takeaway-cup` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative takeaway coffee cup for a coffee check-in web app
Primary request: a tall takeaway coffee cup with a kraft paper sleeve
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: white lidded takeaway coffee cup, kraft paper sleeve, thick black outline, slight paper texture, playful brutalist style
Style/medium: polished 2D raster illustration, crisp edge, flat shaded
Composition/framing: tall object centered, similar to a left-side page prop
Text (verbatim): "COFFEE\nFUEL YOUR GRIND"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the cup for background removal; do not use #00ff00 anywhere in the cup, sleeve, or text; only the exact text; no other readable text; no watermark; no brand logo
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/takeaway-cup.png
```

- [ ] **Step 2: Cut out, resize, and compress `takeaway-cup`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/takeaway-cup.png --out /private/tmp/share-project-home-scenes-coffee/alpha/takeaway-cup.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/takeaway-cup.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/takeaway-cup.png -resize "720x900>" /private/tmp/share-project-home-scenes-coffee/resized/takeaway-cup.png
cwebp -q 86 /private/tmp/share-project-home-scenes-coffee/resized/takeaway-cup.png -o public/assets/home-scenes/coffee/takeaway-cup.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/takeaway-cup.webp
du -h public/assets/home-scenes/coffee/takeaway-cup.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 720x900, and stays under 180 KB.

- [ ] **Step 3: Commit `takeaway-cup`**

```bash
git add public/assets/home-scenes/coffee/takeaway-cup.webp
git commit -m "feat: add coffee takeaway cup asset"
```

## Task 7: Asset - `note-no-coffee-no-gain.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/note-no-coffee-no-gain.webp`

- [ ] **Step 1: Generate `note-no-coffee-no-gain` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: taped paper note for a coffee check-in web app
Primary request: a white torn paper note with coffee motivation text and a small cup line drawing
Scene/backdrop: isolated paper note on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white paper note, torn edge, small tape strips, simple coffee cup line drawing, thick black lettering
Style/medium: playful brutalist 2D illustration, crisp edges, light paper texture
Composition/framing: portrait note, centered object
Text (verbatim): "NO COFFEE\nNO GAIN"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the note for background removal; do not use #00ff00 anywhere in the paper, tape, line drawing, or text; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/note-no-coffee-no-gain.png
```

- [ ] **Step 2: Cut out, resize, and compress `note-no-coffee-no-gain`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/note-no-coffee-no-gain.png --out /private/tmp/share-project-home-scenes-coffee/alpha/note-no-coffee-no-gain.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/note-no-coffee-no-gain.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/note-no-coffee-no-gain.png -resize "720x720>" /private/tmp/share-project-home-scenes-coffee/resized/note-no-coffee-no-gain.png
cwebp -q 86 /private/tmp/share-project-home-scenes-coffee/resized/note-no-coffee-no-gain.png -o public/assets/home-scenes/coffee/note-no-coffee-no-gain.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/note-no-coffee-no-gain.webp
du -h public/assets/home-scenes/coffee/note-no-coffee-no-gain.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 720x720, and stays under 160 KB.

- [ ] **Step 3: Commit `note-no-coffee-no-gain`**

```bash
git add public/assets/home-scenes/coffee/note-no-coffee-no-gain.webp
git commit -m "feat: add no coffee no gain note asset"
```

## Task 8: Asset - `note-but-first-coffee.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/note-but-first-coffee.webp`

- [ ] **Step 1: Generate `note-but-first-coffee` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: taped paper note for a coffee check-in web app
Primary request: a small white taped note with bold coffee-first text
Scene/backdrop: isolated paper note on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white square paper note, tan tape strips at top corners, slightly rotated feel, thick black lettering
Style/medium: playful brutalist 2D illustration, crisp edges, light paper texture
Composition/framing: square note, centered object
Text (verbatim): "BUT FIRST,\nCOFFEE"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the note for background removal; do not use #00ff00 anywhere in the paper, tape, or text; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/note-but-first-coffee.png
```

- [ ] **Step 2: Cut out, resize, and compress `note-but-first-coffee`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/note-but-first-coffee.png --out /private/tmp/share-project-home-scenes-coffee/alpha/note-but-first-coffee.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/note-but-first-coffee.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/note-but-first-coffee.png -resize "720x720>" /private/tmp/share-project-home-scenes-coffee/resized/note-but-first-coffee.png
cwebp -q 86 /private/tmp/share-project-home-scenes-coffee/resized/note-but-first-coffee.png -o public/assets/home-scenes/coffee/note-but-first-coffee.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/note-but-first-coffee.webp
du -h public/assets/home-scenes/coffee/note-but-first-coffee.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 720x720, and stays under 160 KB.

- [ ] **Step 3: Commit `note-but-first-coffee`**

```bash
git add public/assets/home-scenes/coffee/note-but-first-coffee.webp
git commit -m "feat: add but first coffee note asset"
```

## Task 9: Asset - `sugar-packet.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/sugar-packet.webp`

- [ ] **Step 1: Generate `sugar-packet` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative sugar packet for a coffee check-in web app
Primary request: a yellow sugar packet with playful brutalist black outline
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: rectangular yellow sugar packet, crimped paper edges, thick black outline, tiny coffee energy mark
Style/medium: polished 2D raster illustration, crisp edge, flat shaded, slight paper wrinkle
Composition/framing: horizontal packet, centered object
Text (verbatim): "SUGAR"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the packet for background removal; do not use #00ff00 anywhere in the packet or text; only the exact text; no other readable text; no watermark; no brand logo
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/sugar-packet.png
```

- [ ] **Step 2: Cut out, resize, and compress `sugar-packet`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/sugar-packet.png --out /private/tmp/share-project-home-scenes-coffee/alpha/sugar-packet.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/sugar-packet.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/sugar-packet.png -resize "640x420>" /private/tmp/share-project-home-scenes-coffee/resized/sugar-packet.png
cwebp -q 86 /private/tmp/share-project-home-scenes-coffee/resized/sugar-packet.png -o public/assets/home-scenes/coffee/sugar-packet.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/sugar-packet.webp
du -h public/assets/home-scenes/coffee/sugar-packet.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 640x420, and stays under 120 KB.

- [ ] **Step 3: Commit `sugar-packet`**

```bash
git add public/assets/home-scenes/coffee/sugar-packet.webp
git commit -m "feat: add coffee sugar packet asset"
```

## Task 10: Asset - `coffee-beans.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/coffee-beans.webp`

- [ ] **Step 1: Generate `coffee-beans` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative coffee bean cluster for a web app scene
Primary request: a small cluster of coffee beans for repeated page decoration
Scene/backdrop: isolated objects on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: five to seven coffee beans, rich brown, thick black outline, subtle highlights, varied rotations
Style/medium: polished 2D raster illustration, crisp edge, flat shaded
Composition/framing: compact scattered cluster, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the beans for background removal; do not use #00ff00 anywhere in the beans; no text, no cup, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/coffee-beans.png
```

- [ ] **Step 2: Cut out, resize, and compress `coffee-beans`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/coffee-beans.png --out /private/tmp/share-project-home-scenes-coffee/alpha/coffee-beans.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/coffee-beans.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/coffee-beans.png -resize "640x640>" /private/tmp/share-project-home-scenes-coffee/resized/coffee-beans.png
cwebp -q 88 /private/tmp/share-project-home-scenes-coffee/resized/coffee-beans.png -o public/assets/home-scenes/coffee/coffee-beans.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/coffee-beans.webp
du -h public/assets/home-scenes/coffee/coffee-beans.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 640x640, and stays under 120 KB.

- [ ] **Step 3: Commit `coffee-beans`**

```bash
git add public/assets/home-scenes/coffee/coffee-beans.webp
git commit -m "feat: add coffee beans scene asset"
```

## Task 11: Asset - `coffee-ring-stain.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/coffee-ring-stain.webp`

- [ ] **Step 1: Generate `coffee-ring-stain` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: subtle coffee ring stain overlay for a web app scene
Primary request: a transparent-looking coffee cup ring stain with light splatter
Scene/backdrop: isolated stain on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: thin circular coffee ring stain, pale brown watercolor edge, tiny droplets, quiet and low contrast
Style/medium: polished 2D raster illustration, soft but clean edge
Composition/framing: circular ring centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the stain for background removal; do not use #00ff00 anywhere in the stain; no cup, no text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/coffee-ring-stain.png
```

- [ ] **Step 2: Cut out, resize, and compress `coffee-ring-stain`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/coffee-ring-stain.png --out /private/tmp/share-project-home-scenes-coffee/alpha/coffee-ring-stain.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/coffee-ring-stain.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/coffee-ring-stain.png -resize "640x640>" /private/tmp/share-project-home-scenes-coffee/resized/coffee-ring-stain.png
cwebp -q 88 /private/tmp/share-project-home-scenes-coffee/resized/coffee-ring-stain.png -o public/assets/home-scenes/coffee/coffee-ring-stain.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/coffee-ring-stain.webp
du -h public/assets/home-scenes/coffee/coffee-ring-stain.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 640x640, and stays under 100 KB.

- [ ] **Step 3: Commit `coffee-ring-stain`**

```bash
git add public/assets/home-scenes/coffee/coffee-ring-stain.webp
git commit -m "feat: add coffee ring stain asset"
```

## Task 12: Asset - `coffee-stamp-paper.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/coffee-stamp-paper.webp`

- [ ] **Step 1: Generate `coffee-stamp-paper` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: decorative stamped paper for a coffee check-in web app
Primary request: a stack of off-white papers with a round coffee stamp
Scene/backdrop: isolated paper stack on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: two uneven off-white paper sheets, tan tape scraps, round brown coffee stamp, thick black outline
Style/medium: playful brutalist 2D illustration, crisp edge, light paper texture
Composition/framing: portrait object, centered
Text (verbatim): "COFFEE\nKEEP GOING"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the papers for background removal; do not use #00ff00 anywhere in the paper, tape, stamp, or text; only the exact text; no other readable text; no watermark; no brand logo
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/coffee-stamp-paper.png
```

- [ ] **Step 2: Cut out, resize, and compress `coffee-stamp-paper`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/coffee-stamp-paper.png --out /private/tmp/share-project-home-scenes-coffee/alpha/coffee-stamp-paper.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/coffee-stamp-paper.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/coffee-stamp-paper.png -resize "720x820>" /private/tmp/share-project-home-scenes-coffee/resized/coffee-stamp-paper.png
cwebp -q 86 /private/tmp/share-project-home-scenes-coffee/resized/coffee-stamp-paper.png -o public/assets/home-scenes/coffee/coffee-stamp-paper.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/coffee-stamp-paper.webp
du -h public/assets/home-scenes/coffee/coffee-stamp-paper.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 720x820, and stays under 160 KB.

- [ ] **Step 3: Commit `coffee-stamp-paper`**

```bash
git add public/assets/home-scenes/coffee/coffee-stamp-paper.webp
git commit -m "feat: add coffee stamp paper asset"
```

## Task 13: Asset - `receipt-clip.webp`

**Files:**
- Create: `public/assets/home-scenes/coffee/receipt-clip.webp`

- [ ] **Step 1: Generate `receipt-clip` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: black receipt clip decoration for a coffee check-in web app
Primary request: a chunky black receipt clip with metal highlights
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black binder clip or receipt clamp, thick black outline, gray metal highlights, front-facing enough to read clearly
Style/medium: playful brutalist 2D illustration, crisp edge, flat shaded
Composition/framing: square object, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the clip for background removal; do not use #00ff00 anywhere in the clip; no text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-coffee/raw/receipt-clip.png
```

- [ ] **Step 2: Cut out, resize, and compress `receipt-clip`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-coffee/raw/receipt-clip.png --out /private/tmp/share-project-home-scenes-coffee/alpha/receipt-clip.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-coffee/alpha/receipt-clip.png
magick /private/tmp/share-project-home-scenes-coffee/alpha/receipt-clip.png -resize "640x640>" /private/tmp/share-project-home-scenes-coffee/resized/receipt-clip.png
cwebp -q 88 /private/tmp/share-project-home-scenes-coffee/resized/receipt-clip.png -o public/assets/home-scenes/coffee/receipt-clip.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/coffee/receipt-clip.webp
du -h public/assets/home-scenes/coffee/receipt-clip.webp
```

Expected: alpha output reports `srgba` or another alpha-bearing channel; final WebP exists, preserves transparency, is no larger than 640x640, and stays under 120 KB.

- [ ] **Step 3: Run full asset contract and commit `receipt-clip`**

Run:

```bash
npm test -- __tests__/home-ui-coffee-assets.test.ts
```

Expected: PASS because all required assets now exist and meet size budgets.

Then commit:

```bash
git add public/assets/home-scenes/coffee/receipt-clip.webp
git commit -m "feat: add coffee receipt clip asset"
```

## Task 14: Coffee Scene Shell

**Files:**
- Modify: `components/coffee-checkin/CoffeeCheckin.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/coffee-checkin.test.tsx`
- Test: `__tests__/home-ui-coffee-scene-css.test.ts`

- [ ] **Step 1: Update `CoffeeCheckin` scene markup**

Replace the direct loading/error sections and final grid section in `components/coffee-checkin/CoffeeCheckin.tsx` with a shared scene wrapper pattern:

```tsx
"use client";

import { useCoffee } from "@/lib/coffee-store";
import { CoffeeGrid } from "./CoffeeGrid";
import { CoffeeReceipt } from "./CoffeeReceipt";

const coffeeSceneProps = [
  { src: "/assets/home-scenes/coffee/takeaway-cup.webp", alt: "", className: "coffee-scene-prop coffee-scene-cup" },
  { src: "/assets/home-scenes/coffee/note-no-coffee-no-gain.webp", alt: "", className: "coffee-scene-prop coffee-scene-note-left" },
  { src: "/assets/home-scenes/coffee/note-but-first-coffee.webp", alt: "", className: "coffee-scene-prop coffee-scene-note-right" },
  { src: "/assets/home-scenes/coffee/sugar-packet.webp", alt: "", className: "coffee-scene-prop coffee-scene-sugar" },
  { src: "/assets/home-scenes/coffee/coffee-beans.webp", alt: "", className: "coffee-scene-prop coffee-scene-beans-left" },
  { src: "/assets/home-scenes/coffee/coffee-beans.webp", alt: "", className: "coffee-scene-prop coffee-scene-beans-right" },
  { src: "/assets/home-scenes/coffee/coffee-ring-stain.webp", alt: "", className: "coffee-scene-prop coffee-scene-ring" },
  { src: "/assets/home-scenes/coffee/coffee-stamp-paper.webp", alt: "", className: "coffee-scene-prop coffee-scene-stamp" },
  { src: "/assets/home-scenes/coffee/receipt-clip.webp", alt: "", className: "coffee-scene-prop coffee-scene-clip" },
] as const;

function CoffeeSceneFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="coffee-scene">
      <div className="coffee-scene-background" aria-hidden="true" />
      <div className="coffee-scene-props" aria-hidden="true">
        {coffeeSceneProps.map((prop) => (
          <img key={prop.className} src={prop.src} alt={prop.alt} className={prop.className} />
        ))}
      </div>
      <div className="coffee-scene-content">{children}</div>
    </section>
  );
}

export function CoffeeCheckin() {
  const { snapshot, busy, error, addCup, removeCup } = useCoffee();

  if (!snapshot) {
    if (error) {
      return (
        <CoffeeSceneFrame>
          <section className="coffee-scene-state" aria-live="polite">
            <div className="max-w-md">
              <h2 className="text-3xl font-black leading-tight">咖啡小票没打出来</h2>
              <p className="mt-3 text-sm font-bold text-orange-800">{error}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a href="/login" className="coffee-scene-state-action coffee-scene-state-action-primary">
                  重新登录
                </a>
                <button type="button" onClick={() => window.location.reload()} className="coffee-scene-state-action">
                  刷新重试
                </button>
              </div>
            </div>
          </section>
        </CoffeeSceneFrame>
      );
    }

    return (
      <CoffeeSceneFrame>
        <section className="coffee-scene-state" aria-live="polite">
          正在打印今日咖啡小票...
        </section>
      </CoffeeSceneFrame>
    );
  }

  return (
    <CoffeeSceneFrame>
      <section className="coffee-counter-layout">
        <CoffeeReceipt
          snapshot={snapshot}
          busy={busy}
          error={error}
          onAddCup={() => void addCup()}
          onRemoveCup={() => void removeCup()}
        />
        <CoffeeGrid
          snapshot={snapshot}
          busy={busy}
          onAddCup={() => void addCup()}
          onRemoveCup={() => void removeCup()}
        />
      </section>
    </CoffeeSceneFrame>
  );
}
```

- [ ] **Step 2: Add base coffee scene CSS**

Append this coffee scene base section near the existing punch/shared-board scene CSS in `app/globals.css`:

```css
.coffee-scene {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  overflow: hidden;
  border-radius: 1.65rem;
  padding: clamp(0.85rem, 1.5vw, 1.4rem);
  background: #f5efe3;
}

.coffee-scene-background,
.coffee-scene-props {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.coffee-scene-background {
  z-index: 0;
  background-image: url("/assets/home-scenes/coffee/coffee-counter-bg.webp");
  background-size: cover;
  background-position: center;
}

.coffee-scene-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 252, 244, 0.28);
}

.coffee-scene-props {
  z-index: 1;
}

.coffee-scene-content {
  position: relative;
  z-index: 2;
  min-height: 0;
  height: 100%;
  padding-inline: clamp(7.25rem, 9vw, 11.5rem);
}

.coffee-counter-layout {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-columns: minmax(320px, 0.95fr) minmax(520px, 1.9fr);
  gap: clamp(1rem, 1.6vw, 1.35rem);
}

.coffee-scene-prop {
  position: absolute;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 10px 10px rgba(63, 42, 29, 0.2));
  user-select: none;
}

.coffee-scene-cup {
  left: clamp(0.35rem, 1.5vw, 1.25rem);
  top: clamp(1.25rem, 3vw, 2.25rem);
  width: clamp(5.5rem, 8vw, 8.75rem);
  transform: rotate(-10deg);
}

.coffee-scene-note-left {
  left: clamp(0.8rem, 2vw, 2rem);
  top: clamp(14rem, 28vh, 21rem);
  width: clamp(4.75rem, 7vw, 7.25rem);
  transform: rotate(8deg);
}

.coffee-scene-note-right {
  right: clamp(0.8rem, 2vw, 2rem);
  top: clamp(1.75rem, 5vh, 4rem);
  width: clamp(5.25rem, 7vw, 7.5rem);
  transform: rotate(-7deg);
}

.coffee-scene-sugar {
  left: clamp(0.3rem, 1.4vw, 1.2rem);
  bottom: clamp(5.25rem, 10vh, 8rem);
  width: clamp(4.75rem, 7vw, 7.5rem);
  transform: rotate(-14deg);
}

.coffee-scene-beans-left {
  left: clamp(1.4rem, 2vw, 2.5rem);
  bottom: clamp(1.25rem, 4vh, 2.75rem);
  width: clamp(3.75rem, 5vw, 5.5rem);
  transform: rotate(12deg);
}

.coffee-scene-beans-right {
  right: clamp(1.3rem, 2vw, 2.5rem);
  top: clamp(12rem, 24vh, 18rem);
  width: clamp(3.75rem, 5vw, 5.25rem);
  transform: rotate(-12deg);
}

.coffee-scene-ring {
  left: clamp(1.25rem, 2vw, 2.4rem);
  bottom: clamp(0.8rem, 3vh, 2rem);
  width: clamp(4.5rem, 6vw, 6.5rem);
  opacity: 0.72;
}

.coffee-scene-stamp {
  right: clamp(0.35rem, 1.5vw, 1.35rem);
  bottom: clamp(5rem, 10vh, 8.5rem);
  width: clamp(6.25rem, 8.5vw, 9rem);
  transform: rotate(8deg);
}

.coffee-scene-clip {
  right: clamp(1.1rem, 2vw, 2.1rem);
  bottom: clamp(1rem, 4vh, 2.5rem);
  width: clamp(4.25rem, 6vw, 6.75rem);
  transform: rotate(-3deg);
}

.coffee-scene-state {
  display: grid;
  min-height: min(34rem, 100%);
  place-items: center;
  border: 4px solid #111827;
  border-radius: 1.35rem;
  background: rgba(255, 251, 235, 0.94);
  padding: 2rem;
  text-align: center;
  color: #3f250c;
  font-weight: 900;
  box-shadow: 0 6px 0 0 #111827;
}

.coffee-scene-state-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #111827;
  border-radius: 999px;
  background: #ffffff;
  padding: 0.75rem 1.1rem;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 900;
  box-shadow: 0 4px 0 0 #111827;
}

.coffee-scene-state-action-primary {
  background: #fde047;
}
```

- [ ] **Step 3: Run scene tests and verify partial progress**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx __tests__/home-ui-coffee-scene-css.test.ts
```

Expected: component structure assertions for `coffee-scene` and media props pass; receipt/calendar/dialog CSS assertions still fail until later tasks.

- [ ] **Step 4: Commit scene shell**

```bash
git add components/coffee-checkin/CoffeeCheckin.tsx app/globals.css
git commit -m "feat: add coffee receipt counter scene shell"
```

## Task 15: Receipt And Activity Feed Visual Hooks

**Files:**
- Modify: `components/coffee-checkin/CoffeeReceipt.tsx`
- Modify: `components/coffee-checkin/CoffeeActivityFeed.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/coffee-checkin.test.tsx`
- Test: `__tests__/home-ui-coffee-scene-css.test.ts`

- [ ] **Step 1: Update `CoffeeReceipt` markup hooks**

In `components/coffee-checkin/CoffeeReceipt.tsx`, change the root section class to include `coffee-receipt-ticket`, change the stats wrapper to `coffee-receipt-stats`, and add icon spans in `StatTile`:

```tsx
function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "mint" | "latte" | "yellow" | "plain";
}) {
  const toneClass = {
    mint: "coffee-stat-mint",
    latte: "coffee-stat-latte",
    yellow: "coffee-stat-yellow",
    plain: "coffee-stat-plain",
  }[tone];

  const icon = {
    mint: "☕",
    latte: "●",
    yellow: "☕",
    plain: "♕",
  }[tone];

  return (
    <article className={`coffee-stat-tile ${toneClass}`}>
      <div className="coffee-stat-label">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="coffee-stat-value">{value}</div>
    </article>
  );
}
```

Update the rendered receipt section with these class hooks:

```tsx
<section className="coffee-receipt coffee-receipt-ticket">
  <header className="coffee-receipt-header">
    ...
  </header>

  <div className="coffee-receipt-stats">
    ...
  </div>

  <div className="coffee-receipt-body">
    <div className="coffee-today-panel">
      ...
    </div>
    <CoffeeActivityFeed />
  </div>
</section>
```

Keep all existing text, props, `onAddCup`, `onRemoveCup`, disabled rules, `CupStack`, and error rendering.

- [ ] **Step 2: Update `CoffeeActivityFeed` hooks**

In `components/coffee-checkin/CoffeeActivityFeed.tsx`, change the section and child classes:

```tsx
return (
  <section aria-label="咖啡实时动态" className="coffee-activity-ticket">
    <div className="coffee-activity-header">
      ...
    </div>

    <div ref={streamRef} className="coffee-activity-list">
      {sortedEvents.length === 0 ? (
        <div className="coffee-activity-empty">
          今天还没有咖啡打卡
        </div>
      ) : null}

      {sortedEvents.map((event) => {
        ...
        return (
          <div key={event.id} className="coffee-activity-row text-main">
            ...
          </div>
        );
      })}
    </div>
  </section>
);
```

Keep the existing `fetchEvents`, interval, refresh event listener, sorting, timestamp formatting, avatar rendering, and sync-state text.

- [ ] **Step 3: Add receipt and activity CSS**

Append:

```css
.coffee-receipt-ticket,
.coffee-activity-ticket {
  position: relative;
  overflow: hidden;
  border: 4px solid #111827;
  border-radius: 1.1rem 1.1rem 0.5rem 0.5rem;
  background-color: rgba(255, 253, 247, 0.97);
  background-image: url("/assets/home-scenes/coffee/receipt-paper-texture.webp");
  background-size: 360px auto;
  color: #2f1d0c;
  box-shadow: 8px 8px 0 0 rgba(63, 42, 29, 0.88);
}

.coffee-receipt-ticket::after,
.coffee-activity-ticket::after,
.coffee-dialog-ticket::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 0.75rem;
  background:
    linear-gradient(135deg, transparent 50%, #111827 50%) 0 0 / 1rem 0.75rem repeat-x,
    linear-gradient(225deg, transparent 50%, #111827 50%) 0 0 / 1rem 0.75rem repeat-x;
  opacity: 0.95;
  pointer-events: none;
}

.coffee-receipt {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.coffee-receipt-header {
  border-bottom: 3px dashed rgba(63, 42, 29, 0.55);
  padding: clamp(1.1rem, 2vw, 1.65rem);
  text-align: center;
}

.coffee-receipt-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  border-bottom: 3px dashed rgba(63, 42, 29, 0.3);
  padding: 1rem;
}

.coffee-stat-tile {
  min-height: 6rem;
  border: 2px solid rgba(17, 24, 39, 0.45);
  border-radius: 0.45rem;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.85rem;
}

.coffee-stat-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #3f250c;
  font-size: 0.8rem;
  font-weight: 900;
}

.coffee-stat-label span {
  display: inline-grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 999px;
  background: #111827;
  color: #fff7ed;
  font-size: 0.85rem;
}

.coffee-stat-value {
  margin-top: 0.55rem;
  color: #111827;
  font-size: clamp(1.75rem, 2.4vw, 2.6rem);
  font-weight: 900;
  line-height: 1;
}

.coffee-receipt-body {
  display: grid;
  min-height: 0;
  gap: 0.9rem;
  padding: 1rem 1rem 1.35rem;
}

.coffee-today-panel {
  border: 3px solid #111827;
  border-radius: 0.65rem;
  background: rgba(255, 247, 237, 0.8);
  padding: 1rem;
}

.coffee-today-controls {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
}

.coffee-cup-action {
  min-height: 3.45rem;
  border: 3px solid #111827;
  border-radius: 0.55rem;
  background: #ffffff;
  padding-inline: 1rem;
  color: #111827;
  font-size: 1rem;
  font-weight: 900;
  box-shadow: 0 4px 0 0 #111827;
}

.coffee-cup-action:last-child {
  background: #14b8a6;
  color: #ffffff;
}

.coffee-cup-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 3px solid #111827;
  border-radius: 0.65rem;
  background: #ffffff;
  padding: 0.75rem 0.9rem;
}

.coffee-activity-ticket {
  min-height: 11rem;
  box-shadow: 6px 6px 0 0 rgba(63, 42, 29, 0.76);
}

.coffee-activity-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid rgba(63, 42, 29, 0.18);
  padding: 0.65rem 0.9rem;
  color: #3f250c;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.coffee-activity-list {
  display: flex;
  max-height: 12rem;
  flex-direction: column;
  overflow-y: auto;
  padding: 0.85rem 0.95rem 1.2rem;
}

.coffee-activity-row {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.5rem;
  border-bottom: 1px dashed rgba(63, 42, 29, 0.22);
  padding-block: 0.45rem;
}

.coffee-activity-empty {
  border: 2px dashed rgba(63, 42, 29, 0.28);
  border-radius: 0.45rem;
  background: rgba(255, 247, 237, 0.76);
  padding: 0.75rem;
  color: #92400e;
  font-size: 0.8rem;
  font-weight: 900;
}
```

- [ ] **Step 4: Run tests and verify receipt/feed hooks pass**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx __tests__/home-ui-coffee-scene-css.test.ts
```

Expected: receipt and activity assertions pass; calendar and dialog assertions may still fail until later tasks.

- [ ] **Step 5: Commit receipt/feed visuals**

```bash
git add components/coffee-checkin/CoffeeReceipt.tsx components/coffee-checkin/CoffeeActivityFeed.tsx app/globals.css
git commit -m "feat: style coffee receipt and realtime feed"
```

## Task 16: Coffee Calendar Paper And Cell States

**Files:**
- Modify: `components/coffee-checkin/CoffeeGrid.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/coffee-checkin.test.tsx`
- Test: `__tests__/home-ui-coffee-scene-css.test.ts`

- [ ] **Step 1: Add date label helper in `CoffeeGrid.tsx`**

Add these helpers below `CoffeeGridProps`:

```tsx
const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "Asia/Shanghai" });

function getCoffeeDateLabel(day: number, today: number) {
  const now = new Date();
  const date = new Date(now);
  date.setDate(now.getDate() + (day - today));

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateNumber = String(date.getDate()).padStart(2, "0");

  return {
    date: `${month}-${dateNumber}`,
    weekday: day === today ? "今天" : weekdayFormatter.format(date),
  };
}
```

- [ ] **Step 2: Update `CoffeeCell` class hooks**

Use these class names inside `CoffeeCell` while preserving aria labels and click behavior:

```tsx
if (isFuture) {
  return (
    <div className="coffee-calendar-cell coffee-calendar-cell-future">
      <span aria-hidden="true">-</span>
    </div>
  );
}

if (isTodayForCurrentUser) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onOpenActions}
      aria-label={cups === 0 ? "确认今天咖啡打卡" : "调整今天咖啡杯数"}
      className={`coffee-calendar-cell coffee-calendar-cell-today-user ${
        cups === 0 ? "coffee-calendar-cell-empty-today" : "coffee-calendar-cell-filled-today"
      }`}
    >
      {cups === 0 ? (
        <span className="coffee-cell-plus">+</span>
      ) : (
        <CoffeeCupIcon cups={cups} />
      )}
      <span className="coffee-cell-today-caption">{cups === 0 ? "今天还没续命" : `今天已续命 ${cups} 杯`}</span>
    </button>
  );
}

if (cups > 0) {
  return (
    <div className="coffee-calendar-cell coffee-calendar-cell-filled">
      <CoffeeCupIcon cups={cups} />
    </div>
  );
}

return <div className="coffee-calendar-cell coffee-calendar-cell-empty" />;
```

- [ ] **Step 3: Update desktop calendar markup**

Change the desktop root section class to:

```tsx
<section className="coffee-grid-desktop-shell coffee-calendar-paper">
```

Update the desktop header and date header map:

```tsx
<header className="coffee-calendar-header">
  <div>
    <div className="coffee-calendar-eyebrow">Team Coffee Calendar</div>
    <h2 className="coffee-calendar-title">团队续命月历</h2>
  </div>
  <div className="coffee-calendar-header-icon" aria-hidden="true">
    <AssetIcon name="coffee" className="h-10 w-10 object-contain" />
  </div>
</header>
```

For each day header:

```tsx
const label = getCoffeeDateLabel(day, snapshot.today);
return (
  <div
    key={day}
    ref={day === snapshot.today ? desktopTodayColumnRef : undefined}
    className={`coffee-day-heading ${day === snapshot.today ? "coffee-day-column-today" : ""}`}
  >
    <span>{label.date}</span>
    <span>{label.weekday}</span>
  </div>
);
```

In the members rail, render current user badge:

```tsx
{member.id === snapshot.currentUserId ? (
  <span className="coffee-current-user-badge">我</span>
) : null}
```

- [ ] **Step 4: Update mobile calendar markup**

Change the mobile root section class to:

```tsx
<section className="coffee-grid-mobile-shell coffee-calendar-paper coffee-calendar-paper-mobile">
```

Use `getCoffeeDateLabel(day, snapshot.today)` in mobile headers too, with:

```tsx
<div
  key={day}
  ref={day === snapshot.today ? mobileTodayColumnRef : undefined}
  className={`coffee-grid-mobile-day coffee-day-heading ${day === snapshot.today ? "coffee-day-column-today" : ""}`}
>
  <span>{label.date}</span>
  <span>{label.weekday}</span>
</div>
```

Also render the same `coffee-current-user-badge` in mobile member cells.

- [ ] **Step 5: Add calendar CSS**

Append:

```css
.coffee-calendar-paper {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 4px solid #111827;
  border-radius: 1.25rem;
  background-color: rgba(255, 253, 247, 0.97);
  background-image: url("/assets/home-scenes/coffee/receipt-paper-texture.webp");
  background-size: 440px auto;
  color: #2f1d0c;
  box-shadow: 8px 8px 0 0 rgba(63, 42, 29, 0.78);
}

.coffee-calendar-header {
  display: flex;
  min-height: 5.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 4px solid #111827;
  padding: 1rem 1.35rem;
}

.coffee-calendar-eyebrow {
  color: #92400e;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.coffee-calendar-title {
  margin-top: 0.25rem;
  color: #111827;
  font-size: clamp(1.75rem, 2.3vw, 2.35rem);
  font-weight: 900;
  line-height: 1;
}

.coffee-calendar-header-icon {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border-radius: 999px;
  color: #111827;
}

.coffee-member-rail {
  border-right: 2px solid rgba(17, 24, 39, 0.16);
  background: rgba(255, 247, 237, 0.68);
}

.coffee-current-user-badge {
  display: inline-grid;
  min-width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border: 2px solid #111827;
  border-radius: 999px;
  background: #fde047;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 900;
  box-shadow: 0 2px 0 0 #111827;
}

.coffee-day-heading {
  display: grid;
  width: 3.7rem;
  height: 3.1rem;
  flex: 0 0 3.7rem;
  place-items: center;
  align-content: center;
  border-radius: 0.6rem;
  color: #3f250c;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.15;
}

.coffee-day-column-today {
  border: 2px solid #0f766e;
  background: rgba(20, 184, 166, 0.16);
  color: #0f766e;
  box-shadow: inset 0 0 0 999px rgba(20, 184, 166, 0.08);
}

.coffee-calendar-cell {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  flex: 0 0 3.25rem;
  place-items: center;
  border-radius: 0.55rem;
  font-weight: 900;
}

.coffee-calendar-cell-filled,
.coffee-calendar-cell-filled-today {
  border: 2px solid #f3d99c;
  background: #fff7df;
  color: #3f250c;
  box-shadow: 0 2px 0 0 rgba(63, 42, 29, 0.18);
}

.coffee-calendar-cell-empty {
  border: 2px dashed rgba(17, 24, 39, 0.16);
  background: rgba(255, 255, 255, 0.38);
}

.coffee-calendar-cell-future {
  border: 2px dashed rgba(17, 24, 39, 0.12);
  background: rgba(255, 255, 255, 0.25);
  color: rgba(17, 24, 39, 0.32);
}

.coffee-calendar-cell-today-user {
  border: 2px solid #0f766e;
  background: #ccfbf1;
  color: #0f766e;
  box-shadow: 0 3px 0 0 #0f766e;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.coffee-calendar-cell-today-user:hover {
  transform: translateY(-1px);
}

.coffee-cell-today-caption {
  display: none;
}
```

Then update existing desktop/mobile class names in `CoffeeGrid.tsx` to match these hooks:

- Add `coffee-member-rail` to desktop `<aside>`.
- Keep existing `coffee-grid-mobile-*` classes used by current responsive CSS.
- Keep `coffee-calendar-cell` on all cells.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx __tests__/home-ui-coffee-scene-css.test.ts
```

Expected: calendar paper, current-user badge, and today label assertions pass; dialog CSS assertion may still fail.

- [ ] **Step 7: Commit calendar visuals**

```bash
git add components/coffee-checkin/CoffeeGrid.tsx app/globals.css
git commit -m "feat: style coffee team calendar paper"
```

## Task 17: Coffee Dialog Ticket

**Files:**
- Modify: `components/coffee-checkin/CoffeeGrid.tsx`
- Modify: `app/globals.css`
- Test: `__tests__/coffee-checkin.test.tsx`
- Test: `__tests__/home-ui-coffee-scene-css.test.ts`

- [ ] **Step 1: Add dialog ticket class hooks**

In `components/coffee-checkin/CoffeeGrid.tsx`, update the dialog overlay and inner container:

```tsx
<div
  className="coffee-dialog-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/25 p-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="coffee-calendar-dialog-title"
>
  <div className="coffee-dialog-ticket">
    <div className="coffee-dialog-eyebrow">Today Coffee</div>
    <h3 id="coffee-calendar-dialog-title" className="coffee-dialog-title">
      {currentUserTodayCups === 0 ? "确认今天喝咖啡？" : "调整今天的杯数"}
    </h3>
    <p className="coffee-dialog-description">
      {currentUserTodayCups === 0
        ? "确认后会先记录为 1 杯，后面如果继续喝，可以再从这里加。"
        : `当前记录 ${currentUserTodayCups} 杯，可以继续 +1，也可以撤回最新一杯。`}
    </p>
    <div className="coffee-dialog-actions">
      ...
    </div>
  </div>
</div>
```

Keep button text, disabled conditions, `setActionsOpen(false)`, `runAndClose(onRemoveCup)`, and `runAndClose(onAddCup)` unchanged.

- [ ] **Step 2: Add dialog CSS**

Append:

```css
.coffee-dialog-backdrop {
  backdrop-filter: blur(2px);
}

.coffee-dialog-ticket {
  position: relative;
  width: min(100%, 24rem);
  overflow: hidden;
  border: 4px solid #111827;
  border-radius: 1rem 1rem 0.45rem 0.45rem;
  background-color: #fffdf7;
  background-image: url("/assets/home-scenes/coffee/receipt-paper-texture.webp");
  background-size: 360px auto;
  padding: 1.35rem 1.35rem 1.75rem;
  color: #2f1d0c;
  box-shadow: 8px 8px 0 0 rgba(63, 42, 29, 0.9);
}

.coffee-dialog-eyebrow {
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.coffee-dialog-title {
  margin-top: 0.35rem;
  color: #111827;
  font-size: 1.65rem;
  font-weight: 900;
  line-height: 1.1;
}

.coffee-dialog-description {
  margin-top: 0.85rem;
  color: #78350f;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.6;
}

.coffee-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.coffee-dialog-actions button {
  border: 3px solid #111827;
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 900;
  box-shadow: 0 3px 0 0 #111827;
}
```

- [ ] **Step 3: Run tests and verify all contract tests pass**

Run:

```bash
npm test -- __tests__/coffee-checkin.test.tsx __tests__/home-ui-coffee-scene-css.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit dialog visuals**

```bash
git add components/coffee-checkin/CoffeeGrid.tsx app/globals.css
git commit -m "feat: style coffee cup dialog ticket"
```

## Task 18: Responsive And Reduced Motion Polish

**Files:**
- Modify: `app/globals.css`
- Test: `__tests__/home-ui-coffee-scene-css.test.ts`
- Test: `__tests__/coffee-checkin.test.tsx`

- [ ] **Step 1: Add coffee responsive CSS**

Add this inside the existing `@media (max-width: 980px)` block, or create one if needed:

```css
@media (max-width: 980px) {
  .coffee-scene {
    border-radius: 1.2rem;
    padding: 0.75rem;
  }

  .coffee-scene-content {
    padding-inline: 0;
  }

  .coffee-counter-layout {
    height: auto;
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    overflow-y: auto;
    padding-bottom: 1rem;
  }

  .coffee-scene-props {
    opacity: 0.35;
  }

  .coffee-scene-cup,
  .coffee-scene-note-left,
  .coffee-scene-note-right,
  .coffee-scene-sugar,
  .coffee-scene-stamp,
  .coffee-scene-clip {
    display: none;
  }

  .coffee-receipt-ticket {
    min-height: max-content;
    overflow: visible;
  }

  .coffee-today-controls {
    grid-template-columns: minmax(3.6rem, auto) minmax(0, 1fr) minmax(3.6rem, auto);
    gap: 0.5rem;
  }

  .coffee-cup-action {
    min-height: 2.65rem;
    padding-inline: 0.75rem;
    border-width: 2px;
    font-size: 0.78rem;
    box-shadow: 0 3px 0 0 #111827;
  }

  .coffee-cup-summary {
    gap: 0.5rem;
    border-width: 2px;
    padding: 0.55rem 0.7rem;
  }
}
```

- [ ] **Step 2: Add coffee reduced-motion CSS**

Inside the existing `@media (prefers-reduced-motion: reduce)` block, add:

```css
.coffee-scene *,
.coffee-scene *::before,
.coffee-scene *::after {
  animation-duration: 0.01ms;
  animation-iteration-count: 1;
  scroll-behavior: auto;
  transition-duration: 0.01ms;
}
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- __tests__/home-ui-coffee-scene-css.test.ts __tests__/coffee-checkin.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit responsive polish**

```bash
git add app/globals.css
git commit -m "fix: polish coffee scene responsive behavior"
```

## Task 19: Full Verification And Browser Check

**Files:**
- No source files expected unless visual QA finds issues.

- [ ] **Step 1: Run coffee-focused test suite**

Run:

```bash
npm test -- __tests__/home-ui-coffee-assets.test.ts __tests__/home-ui-coffee-scene-css.test.ts __tests__/coffee-checkin.test.tsx __tests__/coffee-api.test.ts __tests__/coffee-api-helpers.test.ts __tests__/coffee-state.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. If the build fails because the local SQLite dev database is missing, run `npx prisma db push` and `npx tsx prisma/seed.ts` only in the development directory, then rerun `npm run build`.

- [ ] **Step 4: Start local dev server for browser verification**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Expected: server starts at `http://127.0.0.1:3000`.

- [ ] **Step 5: Browser-check the coffee tab**

Open the app, log in with a seeded development user if needed, switch to `续命咖啡`, and verify:

- Desktop around 1672x941: scene matches the prototype structure, left receipt stack is narrower, right calendar paper dominates.
- Desktop 1280x800: no prop overlaps receipt, calendar, feed, or dialog.
- Mobile 390x844: receipt appears before calendar, controls remain usable, calendar horizontal scroll works, props are hidden or subdued.
- `+1 杯`, `-1 杯`, and calendar dialog still work.
- `CoffeeActivityFeed` still shows sync state and events.

- [ ] **Step 6: Stop the dev server**

Stop the `npm run dev` process with Ctrl-C in its terminal session.

- [ ] **Step 7: Commit visual QA fixes if any were needed**

If Step 5 required CSS adjustments, commit them:

```bash
git add app/globals.css components/coffee-checkin/CoffeeCheckin.tsx components/coffee-checkin/CoffeeReceipt.tsx components/coffee-checkin/CoffeeActivityFeed.tsx components/coffee-checkin/CoffeeGrid.tsx
git commit -m "fix: align coffee scene with prototype"
```

If Step 5 required no source changes, do not create an empty commit.

## Self-Review Checklist

- Spec coverage:
  - Asset checklist is covered by Tasks 1 and 4-13.
  - Scene shell is covered by Task 14.
  - Receipt and activity feed are covered by Task 15.
  - Calendar paper, date labels, current-user badge, and cell states are covered by Task 16.
  - Dialog is covered by Task 17.
  - Responsive and reduced motion are covered by Task 18.
  - Verification and browser checks are covered by Task 19.
- Scope:
  - No task changes Prisma, API contracts, `CoffeeSnapshot`, `CoffeeProvider`, polling semantics, or mutation semantics.
  - No task adds fake data or new stats.
- Test-first:
  - Asset, CSS, and component structure tests fail before implementation.
  - Existing behavior tests remain part of the focused verification suite.
