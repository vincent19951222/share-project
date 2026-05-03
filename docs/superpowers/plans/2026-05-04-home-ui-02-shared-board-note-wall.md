# Home UI 02 Shared Board Note Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `共享看板` tab into the office sticky-note wall shown in `design/ui-assets/tab-共享看板.png`, while preserving the existing board-note API, polling, author/delete permissions, and note data model.

**Architecture:** Keep `SharedBoard` as the client-owned container for fetching, polling, publishing, deleting, and status messaging. Add project-bound raster scene props under `public/assets/home-scenes/shared-board/`, then wire them into `SharedBoard`, `NoteComposer`, `NoteMasonry`, `NoteCard`, and `SyncStatus` through presentational markup and CSS class hooks. Note paper colors, folded corners, masonry placement, composer controls, and responsive behavior should be CSS-driven; generated media should only cover scene texture and decorative props that are hard to reproduce cleanly in CSS.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v4 via `app/globals.css`, Vitest + jsdom, built-in `imagegen` skill, chroma-key removal helper from the `imagegen` skill, ImageMagick `magick`, `cwebp`.

---

## Scope Guardrails

- Do not modify Prisma schema, `BoardNote` fields, API routes, auth, polling cadence, or delete authorization rules.
- Do not add comments, likes, reactions, channels, unread counts, online member lists, task links, calendar links, leaderboards, pinned-note management, or admin-only controls.
- Do not change `BOARD_NOTE_MAX_LENGTH`, `BoardNoteType`, `BoardNoteColor`, or server validation semantics.
- Keep `SyncStatus`, `NoteComposer`, `BoardMessage`, `NoteMasonry`, and `NoteCard` as the only real shared-board modules.
- Project code must reference only `/assets/home-scenes/shared-board/<filename>`, never `$CODEX_HOME/generated_images/...` or `/private/tmp/...`.
- Raw generated PNGs stay outside `public/`. Only compressed final WebP assets enter `public/assets/home-scenes/shared-board/`.
- Background assets may be opaque WebP. Decorative props must be generated on a flat chroma-key background, cut to alpha, and compressed as alpha WebP.
- The desktop target is pixel-level visual alignment with `design/ui-assets/tab-共享看板.png`; mobile should adapt the same components into a usable single-column wall instead of forcing the full desk scene.

## Current UI Audit

### Prototype Target

`design/ui-assets/tab-共享看板.png` shows:

- Black top nav from spec-01, with `共享看板` highlighted yellow.
- Off-white dotted wall background.
- A large central cork/clipboard board with aged paper texture and thick black outline.
- A top composer mounted like a clipped paper form: avatar, textarea, type segmented control, color swatches, publish button, character counter, and sync pill.
- A green success row directly below the composer when a note publishes.
- Sticky notes arranged in a loose masonry grid on the cork board.
- Note cards use paper colors, pushpins, folded corners, tape, heavy shadows, author avatar/name/type badge/time, title-like first line, content body, and visible close affordance.
- Announcement cards are visually stronger: black `团队通告` ribbon, yellow paper, larger title, separator line.
- Side props around the board: taped motivational posters, dumbbell edge, paperclip, marker pen, tape pieces.

### Current Shared Board

Current implementation already has:

- `SharedBoard`: active-tab gated fetch, 30s polling, profile refresh listener, publish/delete flows, success/error `BoardMessage`.
- `NoteComposer`: avatar, textarea, type selector, color buttons, counter, submit button.
- `NoteMasonry`: empty state and note list mapping.
- `NoteCard`: author avatar, type badge, relative time, delete button, announcement color class.
- `SyncStatus`: idle/syncing/error status pill.
- CSS for masonry columns, paper colors, announcement contrast, touch delete visibility, and sync status.

Missing against prototype:

- No office wall scene shell or cork-board surface.
- Composer is a generic `soft-card`; it does not read as a clipped board form.
- Type control is a native select instead of a two-option segmented control.
- Color swatches are circular, not square paper-color chips with selected check state.
- Publish button lacks the paper-plane icon-like visual from the prototype.
- Success message is a floating rounded alert, not the board-mounted green row under composer.
- Notes are generic rounded cards, not square sticky notes with pins, tape, folded corners, varied rotation, and paper shadows.
- Announcement cards lack the black ribbon and stronger hierarchy from the screenshot.
- Empty state is a generic card, not an empty cork-board placeholder.
- No media props for posters, marker, dumbbell edge, metal clip, cork, tape, paperclip, or pushpins.

## Missing Media Checklist

Create all assets under `public/assets/home-scenes/shared-board/`.

| Asset | Final file | Source type | Max dimensions | Max size | Usage |
| --- | --- | --- | --- | --- | --- |
| Off-white dotted office wall | `office-wall-bg.webp` | Opaque background | 2560x1440 | 420 KB | Full shared-board backdrop |
| Aged cork board surface | `cork-board-bg.webp` | Opaque tile/board texture | 2200x1200 | 520 KB | Central note wall background |
| Metal clipboard clip | `clipboard-clip.webp` | Alpha prop | 640x360 | 140 KB | Top center of composer |
| Left taped poster | `poster-no-excuses.webp` | Alpha prop | 720x720 | 180 KB | Left wall poster |
| Right yellow training poster | `poster-focus-train-win.webp` | Alpha prop | 720x720 | 180 KB | Right wall poster |
| Small discipline paper | `discipline-note.webp` | Alpha prop | 720x720 | 160 KB | Lower-left wall note |
| Black dumbbell edge | `dumbbell-edge.webp` | Alpha prop | 720x720 | 160 KB | Left edge decoration |
| Black marker pen | `marker-pen.webp` | Alpha prop | 720x720 | 160 KB | Right edge decoration |
| Red pushpin | `pushpin-red.webp` | Alpha prop | 256x256 | 48 KB | Sticky note pin variant |
| Blue pushpin | `pushpin-blue.webp` | Alpha prop | 256x256 | 48 KB | Sticky note pin variant |
| Yellow pushpin | `pushpin-yellow.webp` | Alpha prop | 256x256 | 48 KB | Sticky note pin variant |
| Torn masking tape | `paper-tape.webp` | Alpha prop | 512x256 | 80 KB | Note/poster tape overlay |
| Silver paperclip | `paperclip.webp` | Alpha prop | 512x512 | 80 KB | Board lower-left detail |

CSS-only elements:

- Sticky-note paper colors and gradients.
- Folded note corners.
- Card shadow, rotation, and hover lift.
- Announcement ribbon base shape if generated text accuracy is unreliable.
- Selected color swatch checkmark.
- Composer separator line and dashed dividers.

## File Structure

- Create: `public/assets/home-scenes/shared-board/`
  - Final compressed project assets for the shared-board scene.
- Create: `__tests__/home-ui-shared-board-assets.test.ts`
  - Verifies required assets exist and stay under size budgets.
- Create: `__tests__/home-ui-shared-board-scene.test.tsx`
  - Covers scene shell, composer controls, status row, note wall hooks, announcement ribbon, and decorative asset references.
- Modify: `__tests__/shared-board-css.test.ts`
  - Updates CSS assertions from old rounded-card styling to sticky-note wall styling while preserving touch delete visibility.
- Modify: `components/shared-board/SharedBoard.tsx`
  - Adds scene shell, media layer, board surface, composer/status placement, and message row hooks.
- Modify: `components/shared-board/NoteComposer.tsx`
  - Replaces native select with segmented buttons and updates color swatches to prototype-style chips.
- Modify: `components/shared-board/NoteMasonry.tsx`
  - Adds cork-board layout wrapper and prototype-style empty state.
- Modify: `components/shared-board/NoteCard.tsx`
  - Adds pin/tape/fold/ribbon hooks and stable card variant classes.
- Modify: `components/shared-board/SyncStatus.tsx`
  - Adds check/sync/error symbol hooks while preserving text labels.
- Modify: `app/globals.css`
  - Adds shared-board scene, media props, composer, note wall, note card, responsive, and reduced-motion styles.

## Task 1: Asset Contract Test

**Files:**
- Create: `__tests__/home-ui-shared-board-assets.test.ts`
- Create during implementation: `public/assets/home-scenes/shared-board/`

- [ ] **Step 1: Create the failing asset contract test**

Create `__tests__/home-ui-shared-board-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "office-wall-bg.webp", maxBytes: 420 * 1024 },
  { file: "cork-board-bg.webp", maxBytes: 520 * 1024 },
  { file: "clipboard-clip.webp", maxBytes: 140 * 1024 },
  { file: "poster-no-excuses.webp", maxBytes: 180 * 1024 },
  { file: "poster-focus-train-win.webp", maxBytes: 180 * 1024 },
  { file: "discipline-note.webp", maxBytes: 160 * 1024 },
  { file: "dumbbell-edge.webp", maxBytes: 160 * 1024 },
  { file: "marker-pen.webp", maxBytes: 160 * 1024 },
  { file: "pushpin-red.webp", maxBytes: 48 * 1024 },
  { file: "pushpin-blue.webp", maxBytes: 48 * 1024 },
  { file: "pushpin-yellow.webp", maxBytes: 48 * 1024 },
  { file: "paper-tape.webp", maxBytes: 80 * 1024 },
  { file: "paperclip.webp", maxBytes: 80 * 1024 },
] as const;

describe("home shared board scene assets", () => {
  it("ships compressed project-bound WebP assets for the office note wall", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/shared-board/${asset.file}`;

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
npm test -- __tests__/home-ui-shared-board-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/shared-board/*.webp` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/home-ui-shared-board-assets.test.ts
git commit -m "test: add shared board scene asset contract"
```

## Task 2: Asset Workspace Setup

**Files:**
- Create: `public/assets/home-scenes/shared-board/`
- Create staging directories under `/private/tmp/share-project-home-scenes-shared-board/`

**Asset processing rules for every image task:**

- Use built-in `imagegen` tool mode, one call per asset.
- Use `imagegen` exactly for the raster media assets. Do not substitute CSS/SVG for the checklist images.
- Treat every generated image as its own progress task. When a generated image is processed, saved to `public/assets/home-scenes/shared-board/`, and verified, that asset task can be marked complete.
- `office-wall-bg.webp` and `cork-board-bg.webp` are opaque scene assets. Resize and compress directly from the generated source.
- All other assets are overlay props. Generate on a perfectly flat `#00ff00` chroma-key background, remove the background locally to alpha PNG, then compress to alpha WebP.
- If `#00ff00` appears inside a subject, regenerate that asset with `#ff00ff` as the chroma-key background and keep `--auto-key border` in the removal command.
- Do not place raw generated PNGs under `public/`.
- Do not reference files from `/private/tmp/` or `$CODEX_HOME/generated_images/` in application code.

- [ ] **Step 1: Create staging and final directories**

Run:

```bash
mkdir -p /private/tmp/share-project-home-scenes-shared-board/raw /private/tmp/share-project-home-scenes-shared-board/alpha /private/tmp/share-project-home-scenes-shared-board/resized public/assets/home-scenes/shared-board
```

Expected: staging and final public directories exist.

- [ ] **Step 2: Commit directory setup when needed**

No commit is required if this only creates empty directories. Git will not track them.

## Task 3: Asset - `office-wall-bg.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/office-wall-bg.webp`

- [ ] **Step 1: Generate `office-wall-bg` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: web app scene background for the 共享看板 tab
Primary request: an off-white office wall background for a playful brutalist Chinese sticky-note wall
Scene/backdrop: light warm white wall, subtle dotted paper texture, faint smudges, gentle desk-board ambience, enough quiet negative space for UI cards
Style/medium: polished 2D raster illustration, flat-shaded, crisp edges, lightly textured, not photorealistic
Composition/framing: 16:9 wide background, no centered object, no UI, no people, no logos
Lighting/mood: bright indoor ambient light, clean but lived-in
Color palette: warm off-white, light gray, slate speckles, tiny muted beige marks
Constraints: no readable text, no watermark, no gradient orb decoration, no dark vignette
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/office-wall-bg.png
```

- [ ] **Step 2: Resize and compress `office-wall-bg`**

Run:

```bash
magick /private/tmp/share-project-home-scenes-shared-board/raw/office-wall-bg.png -resize "2560x1440>" /private/tmp/share-project-home-scenes-shared-board/resized/office-wall-bg.png
cwebp -q 82 /private/tmp/share-project-home-scenes-shared-board/resized/office-wall-bg.png -o public/assets/home-scenes/shared-board/office-wall-bg.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/office-wall-bg.webp
du -h public/assets/home-scenes/shared-board/office-wall-bg.webp
```

Expected: final WebP exists, is no larger than 2560x1440, and stays under 420 KB.

- [ ] **Step 3: Commit `office-wall-bg`**

```bash
git add public/assets/home-scenes/shared-board/office-wall-bg.webp
git commit -m "feat: add shared board office wall asset"
```

## Task 4: Asset - `cork-board-bg.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/cork-board-bg.webp`

- [ ] **Step 1: Generate `cork-board-bg` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: cork board surface for a web app note wall
Primary request: a large aged cork bulletin board surface with a thick black rim
Scene/backdrop: rectangular cork board, worn beige cork texture, darker stained edges, subtle pin marks, black brutalist outline
Style/medium: polished 2D raster illustration, crisp edge, light paper texture, not photorealistic
Composition/framing: wide 16:9 board surface, mostly empty center, no notes, no UI, no people
Lighting/mood: bright indoor ambient light
Color palette: beige cork, warm brown speckles, black rim, slight gray shadows
Constraints: no readable text, no logos, no existing sticky notes, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/cork-board-bg.png
```

- [ ] **Step 2: Resize and compress `cork-board-bg`**

Run:

```bash
magick /private/tmp/share-project-home-scenes-shared-board/raw/cork-board-bg.png -resize "2200x1200>" /private/tmp/share-project-home-scenes-shared-board/resized/cork-board-bg.png
cwebp -q 82 /private/tmp/share-project-home-scenes-shared-board/resized/cork-board-bg.png -o public/assets/home-scenes/shared-board/cork-board-bg.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/cork-board-bg.webp
du -h public/assets/home-scenes/shared-board/cork-board-bg.webp
```

Expected: final WebP exists, is no larger than 2200x1200, and stays under 520 KB.

- [ ] **Step 3: Commit `cork-board-bg`**

```bash
git add public/assets/home-scenes/shared-board/cork-board-bg.webp
git commit -m "feat: add shared board cork asset"
```

## Task 5: Asset - `clipboard-clip.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/clipboard-clip.webp`

- [ ] **Step 1: Generate `clipboard-clip` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: metal clipboard clip overlay for a web app composer
Primary request: a black and silver metal clipboard clip, chunky and readable at medium size
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: centered top clipboard clip, black hinge, silver metal body, thick black outline, subtle highlights
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: horizontal clip, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the clip for background removal; do not use #00ff00 anywhere in the subject; no text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/clipboard-clip.png
```

- [ ] **Step 2: Cut out, resize, and compress `clipboard-clip`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/clipboard-clip.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/clipboard-clip.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/clipboard-clip.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/clipboard-clip.png -resize "640x360>" /private/tmp/share-project-home-scenes-shared-board/resized/clipboard-clip.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/clipboard-clip.png -o public/assets/home-scenes/shared-board/clipboard-clip.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/clipboard-clip.webp
du -h public/assets/home-scenes/shared-board/clipboard-clip.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 640x360, preserves transparency, and stays under 140 KB.

- [ ] **Step 3: Commit `clipboard-clip`**

```bash
git add public/assets/home-scenes/shared-board/clipboard-clip.webp
git commit -m "feat: add shared board clipboard clip asset"
```

## Task 6: Asset - `poster-no-excuses.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/poster-no-excuses.webp`

- [ ] **Step 1: Generate `poster-no-excuses` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: taped poster for an office sticky-note wall
Primary request: a small off-white taped motivational paper poster
Scene/backdrop: isolated poster on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white paper poster, gray tape strips on corners, slightly wrinkled, thick black lettering
Style/medium: playful brutalist 2D illustration, crisp edges, lightly imperfect paper texture
Composition/framing: portrait poster, centered object
Text (verbatim): "NO EXCUSES\nJUST\nRESULTS"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the poster for background removal; do not use #00ff00 anywhere in the poster, tape, or text; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/poster-no-excuses.png
```

- [ ] **Step 2: Cut out, resize, and compress `poster-no-excuses`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/poster-no-excuses.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/poster-no-excuses.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/poster-no-excuses.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/poster-no-excuses.png -resize "720x720>" /private/tmp/share-project-home-scenes-shared-board/resized/poster-no-excuses.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/poster-no-excuses.png -o public/assets/home-scenes/shared-board/poster-no-excuses.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/poster-no-excuses.webp
du -h public/assets/home-scenes/shared-board/poster-no-excuses.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 720x720, preserves transparency, and stays under 180 KB.

- [ ] **Step 3: Commit `poster-no-excuses`**

```bash
git add public/assets/home-scenes/shared-board/poster-no-excuses.webp
git commit -m "feat: add shared board no excuses poster asset"
```

## Task 7: Asset - `poster-focus-train-win.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/poster-focus-train-win.webp`

- [ ] **Step 1: Generate `poster-focus-train-win` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: yellow side poster for an office fitness note wall
Primary request: a yellow taped training poster with a simple black dumbbell mark
Scene/backdrop: isolated poster on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow paper poster, tape at top, simple dumbbell icon, thick black lettering, slight paper curl
Style/medium: playful brutalist 2D illustration, crisp edge, light paper texture
Composition/framing: portrait poster, centered object
Text (verbatim): "FOCUS\nTRAIN\nWIN"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the poster for background removal; do not use #00ff00 anywhere in the poster, tape, icon, or text; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/poster-focus-train-win.png
```

- [ ] **Step 2: Cut out, resize, and compress `poster-focus-train-win`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/poster-focus-train-win.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/poster-focus-train-win.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/poster-focus-train-win.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/poster-focus-train-win.png -resize "720x720>" /private/tmp/share-project-home-scenes-shared-board/resized/poster-focus-train-win.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/poster-focus-train-win.png -o public/assets/home-scenes/shared-board/poster-focus-train-win.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/poster-focus-train-win.webp
du -h public/assets/home-scenes/shared-board/poster-focus-train-win.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 720x720, preserves transparency, and stays under 180 KB.

- [ ] **Step 3: Commit `poster-focus-train-win`**

```bash
git add public/assets/home-scenes/shared-board/poster-focus-train-win.webp
git commit -m "feat: add shared board focus poster asset"
```

## Task 8: Asset - `discipline-note.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/discipline-note.webp`

- [ ] **Step 1: Generate `discipline-note` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: small pinned paper note for office wall decoration
Primary request: a small off-white paper note clipped with a black pushpin
Scene/backdrop: isolated note on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white paper note, black pushpin at top, slight wrinkled paper, thick black lettering
Style/medium: playful brutalist 2D illustration, crisp edge, paper texture
Composition/framing: portrait note, centered object
Text (verbatim): "DISCIPLINE\nBEATS\nMOTIVATION"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the note for background removal; do not use #00ff00 anywhere in the note, pin, or text; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/discipline-note.png
```

- [ ] **Step 2: Cut out, resize, and compress `discipline-note`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/discipline-note.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/discipline-note.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/discipline-note.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/discipline-note.png -resize "720x720>" /private/tmp/share-project-home-scenes-shared-board/resized/discipline-note.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/discipline-note.png -o public/assets/home-scenes/shared-board/discipline-note.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/discipline-note.webp
du -h public/assets/home-scenes/shared-board/discipline-note.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 720x720, preserves transparency, and stays under 160 KB.

- [ ] **Step 3: Commit `discipline-note`**

```bash
git add public/assets/home-scenes/shared-board/discipline-note.webp
git commit -m "feat: add shared board discipline note asset"
```

## Task 9: Asset - `dumbbell-edge.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/dumbbell-edge.webp`

- [ ] **Step 1: Generate `dumbbell-edge` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: left edge decoration for a shared note wall web app
Primary request: a cropped black dumbbell edge decoration
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black dumbbell and partial handle, thick outline, slight gray highlight, usable as an off-canvas left edge prop
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: object biased toward left edge, some shape cropped by canvas edge, no center obstruction
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the dumbbell for background removal; do not use #00ff00 anywhere in the subject; no text, no people, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/dumbbell-edge.png
```

- [ ] **Step 2: Cut out, resize, and compress `dumbbell-edge`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/dumbbell-edge.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/dumbbell-edge.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/dumbbell-edge.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/dumbbell-edge.png -resize "720x720>" /private/tmp/share-project-home-scenes-shared-board/resized/dumbbell-edge.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/dumbbell-edge.png -o public/assets/home-scenes/shared-board/dumbbell-edge.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/dumbbell-edge.webp
du -h public/assets/home-scenes/shared-board/dumbbell-edge.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 720x720, preserves transparency, and stays under 160 KB.

- [ ] **Step 3: Commit `dumbbell-edge`**

```bash
git add public/assets/home-scenes/shared-board/dumbbell-edge.webp
git commit -m "feat: add shared board dumbbell edge asset"
```

## Task 10: Asset - `marker-pen.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/marker-pen.webp`

- [ ] **Step 1: Generate `marker-pen` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: right edge marker pen decoration for an office note wall
Primary request: a chunky black dry erase marker pen sticker
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black marker pen, white label, thick black outline, slight diagonal angle
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: tall diagonal marker, centered object
Text (verbatim): "NO PAIN\nNO GAIN"
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the marker for background removal; do not use #00ff00 anywhere in the marker or label; only the exact text; no other readable text; no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/marker-pen.png
```

- [ ] **Step 2: Cut out, resize, and compress `marker-pen`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/marker-pen.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/marker-pen.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/marker-pen.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/marker-pen.png -resize "720x720>" /private/tmp/share-project-home-scenes-shared-board/resized/marker-pen.png
cwebp -q 86 /private/tmp/share-project-home-scenes-shared-board/resized/marker-pen.png -o public/assets/home-scenes/shared-board/marker-pen.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/marker-pen.webp
du -h public/assets/home-scenes/shared-board/marker-pen.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 720x720, preserves transparency, and stays under 160 KB.

- [ ] **Step 3: Commit `marker-pen`**

```bash
git add public/assets/home-scenes/shared-board/marker-pen.webp
git commit -m "feat: add shared board marker pen asset"
```

## Task 11: Asset - `pushpin-red.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/pushpin-red.webp`

- [ ] **Step 1: Generate `pushpin-red` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: small pushpin overlay for sticky note cards
Primary request: a red pushpin with thick black outline
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: red round pushpin head with small metal point and simple shadow on the object itself
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge, readable at tiny size
Composition/framing: square icon-like object, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the pin for background removal; do not use #00ff00 anywhere in the subject; no text, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/pushpin-red.png
```

- [ ] **Step 2: Cut out, resize, and compress `pushpin-red`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/pushpin-red.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-red.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-red.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-red.png -resize "256x256>" /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-red.png
cwebp -q 88 /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-red.png -o public/assets/home-scenes/shared-board/pushpin-red.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/pushpin-red.webp
du -h public/assets/home-scenes/shared-board/pushpin-red.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 256x256, preserves transparency, and stays under 48 KB.

- [ ] **Step 3: Commit `pushpin-red`**

```bash
git add public/assets/home-scenes/shared-board/pushpin-red.webp
git commit -m "feat: add shared board red pushpin asset"
```

## Task 12: Asset - `pushpin-blue.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/pushpin-blue.webp`

- [ ] **Step 1: Generate `pushpin-blue` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: small pushpin overlay for sticky note cards
Primary request: a blue pushpin with thick black outline
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: blue round pushpin head with small metal point and simple shadow on the object itself
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge, readable at tiny size
Composition/framing: square icon-like object, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the pin for background removal; do not use #00ff00 anywhere in the subject; no text, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/pushpin-blue.png
```

- [ ] **Step 2: Cut out, resize, and compress `pushpin-blue`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/pushpin-blue.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-blue.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-blue.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-blue.png -resize "256x256>" /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-blue.png
cwebp -q 88 /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-blue.png -o public/assets/home-scenes/shared-board/pushpin-blue.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/pushpin-blue.webp
du -h public/assets/home-scenes/shared-board/pushpin-blue.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 256x256, preserves transparency, and stays under 48 KB.

- [ ] **Step 3: Commit `pushpin-blue`**

```bash
git add public/assets/home-scenes/shared-board/pushpin-blue.webp
git commit -m "feat: add shared board blue pushpin asset"
```

## Task 13: Asset - `pushpin-yellow.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/pushpin-yellow.webp`

- [ ] **Step 1: Generate `pushpin-yellow` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: small pushpin overlay for sticky note cards
Primary request: a yellow pushpin with thick black outline
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow round pushpin head with small metal point and simple shadow on the object itself
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge, readable at tiny size
Composition/framing: square icon-like object, centered
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the pin for background removal; do not use #00ff00 anywhere in the subject; no text, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/pushpin-yellow.png
```

- [ ] **Step 2: Cut out, resize, and compress `pushpin-yellow`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/pushpin-yellow.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-yellow.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-yellow.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/pushpin-yellow.png -resize "256x256>" /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-yellow.png
cwebp -q 88 /private/tmp/share-project-home-scenes-shared-board/resized/pushpin-yellow.png -o public/assets/home-scenes/shared-board/pushpin-yellow.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/pushpin-yellow.webp
du -h public/assets/home-scenes/shared-board/pushpin-yellow.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 256x256, preserves transparency, and stays under 48 KB.

- [ ] **Step 3: Commit `pushpin-yellow`**

```bash
git add public/assets/home-scenes/shared-board/pushpin-yellow.webp
git commit -m "feat: add shared board yellow pushpin asset"
```

## Task 14: Asset - `paper-tape.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/paper-tape.webp`

- [ ] **Step 1: Generate `paper-tape` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: masking tape overlay for sticky notes and posters
Primary request: a torn strip of beige masking tape
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: translucent beige masking tape strip, torn jagged ends, slight paper fibers, thick but subtle outline
Style/medium: playful 2D raster illustration, crisp edge, light paper texture
Composition/framing: horizontal strip, centered object
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the tape for background removal; do not use #00ff00 anywhere in the subject; no text, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/paper-tape.png
```

- [ ] **Step 2: Cut out, resize, and compress `paper-tape`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/paper-tape.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/paper-tape.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/paper-tape.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/paper-tape.png -resize "512x256>" /private/tmp/share-project-home-scenes-shared-board/resized/paper-tape.png
cwebp -q 88 /private/tmp/share-project-home-scenes-shared-board/resized/paper-tape.png -o public/assets/home-scenes/shared-board/paper-tape.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/paper-tape.webp
du -h public/assets/home-scenes/shared-board/paper-tape.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 512x256, preserves transparency, and stays under 80 KB.

- [ ] **Step 3: Commit `paper-tape`**

```bash
git add public/assets/home-scenes/shared-board/paper-tape.webp
git commit -m "feat: add shared board paper tape asset"
```

## Task 15: Asset - `paperclip.webp`

**Files:**
- Create: `public/assets/home-scenes/shared-board/paperclip.webp`

- [ ] **Step 1: Generate `paperclip` with `imagegen`**

Prompt:

```text
Use case: stylized-concept
Asset type: paperclip decoration for a cork note wall
Primary request: a silver paperclip with thick black outline
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: one silver paperclip, slightly tilted, simple highlight, thick black outline
Style/medium: playful brutalist 2D illustration, flat shaded, crisp edge
Composition/framing: vertical-ish paperclip, centered object
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the paperclip for background removal; do not use #00ff00 anywhere in the subject; no text, no watermark
```

Copy selected output to:

```text
/private/tmp/share-project-home-scenes-shared-board/raw/paperclip.png
```

- [ ] **Step 2: Cut out, resize, and compress `paperclip`**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-shared-board/raw/paperclip.png --out /private/tmp/share-project-home-scenes-shared-board/alpha/paperclip.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
magick identify -format "%f %m %wx%h %[channels]\n" /private/tmp/share-project-home-scenes-shared-board/alpha/paperclip.png
magick /private/tmp/share-project-home-scenes-shared-board/alpha/paperclip.png -resize "512x512>" /private/tmp/share-project-home-scenes-shared-board/resized/paperclip.png
cwebp -q 88 /private/tmp/share-project-home-scenes-shared-board/resized/paperclip.png -o public/assets/home-scenes/shared-board/paperclip.webp
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/paperclip.webp
du -h public/assets/home-scenes/shared-board/paperclip.webp
```

Expected: alpha output reports an alpha-bearing channel such as `srgba`; final WebP exists, is no larger than 512x512, preserves transparency, and stays under 80 KB.

- [ ] **Step 3: Commit `paperclip`**

```bash
git add public/assets/home-scenes/shared-board/paperclip.webp
git commit -m "feat: add shared board paperclip asset"
```

## Task 16: Verify All Shared Board Assets

**Files:**
- Verify: all files in `public/assets/home-scenes/shared-board/`

- [ ] **Step 1: Inspect final dimensions and sizes**

Run:

```bash
magick identify -format "%f %m %wx%h %[channels]\n" public/assets/home-scenes/shared-board/*.webp
du -h public/assets/home-scenes/shared-board/*.webp
```

Expected: dimensions match the checklist and file sizes fit the asset contract.

- [ ] **Step 2: Verify assets pass the contract**

Run:

```bash
npm test -- __tests__/home-ui-shared-board-assets.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit any uncommitted generated assets**

First check whether any shared-board asset files are still uncommitted:

```bash
git status --short public/assets/home-scenes/shared-board __tests__/home-ui-shared-board-assets.test.ts
```

If the command prints no output, skip this step because every individual asset task has already committed its file. If it prints uncommitted files, run:

```bash
git add public/assets/home-scenes/shared-board __tests__/home-ui-shared-board-assets.test.ts
git commit -m "feat: add shared board scene media assets"
```

Expected: remaining generated assets are committed, or the step is skipped because there are no uncommitted shared-board asset files.

## Task 17: Shared Board Scene And Composer Structure

**Files:**
- Create: `__tests__/home-ui-shared-board-scene.test.tsx`
- Modify: `components/shared-board/SharedBoard.tsx`
- Modify: `components/shared-board/NoteComposer.tsx`
- Modify: `components/shared-board/SyncStatus.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create scene/composer assertions**

Create `__tests__/home-ui-shared-board-scene.test.tsx` with assertions that render `SharedBoard` inside `BoardProvider` with `activeTab: "board"` and mocked notes. Cover:

- `.shared-board-scene`
- `.shared-board-wall-bg`
- `.shared-board-props`
- `.shared-board-cork`
- `.shared-board-composer`
- `.shared-board-clip`
- `.shared-board-success-row`
- `.shared-board-type-toggle`
- four `.shared-board-color-chip` buttons
- `.sync-status-symbol`
- rendered media prop references for `clipboard-clip.webp`, posters, `discipline-note.webp`, `dumbbell-edge.webp`, `marker-pen.webp`, and `paperclip.webp`

Keep the fetch mocks local to the test and preserve existing `SharedBoard` polling expectations.

- [ ] **Step 2: Run the new scene test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-shared-board-scene.test.tsx
```

Expected: FAIL because the scene hooks and asset references do not exist yet.

- [ ] **Step 3: Add scene shell and media props to `SharedBoard`**

Modify `components/shared-board/SharedBoard.tsx` so the return structure is:

```tsx
<section className="shared-board-scene h-full overflow-y-auto no-scrollbar">
  <div className="shared-board-wall-bg" aria-hidden="true" />
  <div className="shared-board-props" aria-hidden="true">
    <img src="/assets/home-scenes/shared-board/poster-no-excuses.webp" alt="" className="shared-board-prop shared-board-poster-left" />
    <img src="/assets/home-scenes/shared-board/poster-focus-train-win.webp" alt="" className="shared-board-prop shared-board-poster-right" />
    <img src="/assets/home-scenes/shared-board/discipline-note.webp" alt="" className="shared-board-prop shared-board-discipline-note" />
    <img src="/assets/home-scenes/shared-board/dumbbell-edge.webp" alt="" className="shared-board-prop shared-board-dumbbell" />
    <img src="/assets/home-scenes/shared-board/marker-pen.webp" alt="" className="shared-board-prop shared-board-marker" />
    <img src="/assets/home-scenes/shared-board/paperclip.webp" alt="" className="shared-board-prop shared-board-paperclip" />
  </div>
  <div className="shared-board-content">
    <div className="shared-board-cork">
      <div className="shared-board-composer-wrap">
        <div className="shared-board-sync-row">
          <SyncStatus state={syncState} />
        </div>
        <img src="/assets/home-scenes/shared-board/clipboard-clip.webp" alt="" className="shared-board-clip" aria-hidden="true" />
        <NoteComposer
          currentUser={{
            name: currentMember.name,
            avatarKey: currentMember.avatarKey,
          }}
          submitting={submitting}
          onSubmit={createNote}
        />
        {message ? (
          <div className={`shared-board-message shared-board-${message.tone}-row`}>
            <span aria-hidden="true">{message.tone === "success" ? "✓" : "!"}</span>
            <span>{message.text}</span>
          </div>
        ) : null}
      </div>
      <NoteMasonry notes={notes} deletingIds={deletingIds} onDelete={deleteNote} />
    </div>
  </div>
</section>
```

Use the existing `createNote`, `deleteNote`, `message`, `syncState`, and current user logic unchanged.

- [ ] **Step 4: Replace native select with segmented type buttons**

Modify `components/shared-board/NoteComposer.tsx`:

- Replace the `<select>` with two `<button type="button">` controls in `.shared-board-type-toggle`.
- Buttons set `FREE` and `ANNOUNCEMENT`.
- Use labels `自由笔记` and `团队通告`.
- Preserve keyboard and click behavior, disabled state through existing `submitting` only where relevant, and `color: null` for announcements.

- [ ] **Step 5: Update color swatches**

Modify `NoteComposer` color buttons:

- Use `.shared-board-color-chip`.
- Keep the same four color values.
- Make selected state expose `aria-pressed={color === item.value}` and textless visual check hook `<span aria-hidden="true">✓</span>`.
- Keep color chips disabled when type is `ANNOUNCEMENT`.

- [ ] **Step 6: Add sync status symbol hook**

Modify `components/shared-board/SyncStatus.tsx`:

- Add `<span className="sync-status-symbol" aria-hidden="true">{symbol}</span>` where `symbol` is derived from `state`.
- Use `✓` for idle, `↻` for syncing, `!` for error.
- Keep `aria-live="polite"` and existing labels.

- [ ] **Step 7: Add scene/composer CSS**

In `app/globals.css`, replace shared-board shell/card rules with:

- `.shared-board-scene`: relative, min-height, warm wall background, hidden horizontal overflow.
- `.shared-board-wall-bg`: absolute full viewport with `office-wall-bg.webp`.
- `.shared-board-content`: constrained desktop width, centered, padding matching screenshot.
- `.shared-board-cork`: cork background image, thick black border, 8px radius max, inset paper texture, bottom board shadow.
- `.shared-board-composer-wrap`: top clipped white paper form, black border, heavy shadow.
- `.shared-board-clip`: absolute top center.
- `.shared-board-sync-row`: top-right pill position.
- `.shared-board-message`: full-width row under composer content; success uses green text/icon; error uses red.
- `.shared-board-type-toggle`: two-option segmented control.
- `.shared-board-color-chip`: square paper chips with selected check state.
- `.shared-board-prop`: absolute media props, hidden under 900px width.

Keep reduced-motion behavior:

```css
@media (prefers-reduced-motion: reduce) {
  .shared-board-scene *,
  .shared-board-scene *::before,
  .shared-board-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Run scene test**

Run:

```bash
npm test -- __tests__/home-ui-shared-board-scene.test.tsx __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx
```

Expected: PASS. Existing publish success/error behavior still renders Chinese copy.

- [ ] **Step 9: Commit scene/composer changes**

```bash
git add components/shared-board/SharedBoard.tsx components/shared-board/NoteComposer.tsx components/shared-board/SyncStatus.tsx app/globals.css __tests__/home-ui-shared-board-scene.test.tsx
git commit -m "feat: add shared board note wall shell"
```

## Task 18: Sticky Note Wall Cards

**Files:**
- Modify: `components/shared-board/NoteMasonry.tsx`
- Modify: `components/shared-board/NoteCard.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/home-ui-shared-board-scene.test.tsx`
- Modify: `__tests__/shared-board-css.test.ts`

- [ ] **Step 1: Extend note card assertions**

Update `__tests__/home-ui-shared-board-scene.test.tsx` to assert:

- Each note renders `.note-card`.
- Free notes include `.note-pin` and a pin image source matching one of the pushpin assets.
- Free note color classes remain `note-free-yellow`, `note-free-blue`, `note-free-green`, `note-free-pink`.
- Announcement notes include `.note-announcement-ribbon` with text `团队通告`.
- Announcement notes include `.note-announcement-rule`.
- Deletable notes keep a button with `aria-label="删除便签"`.

- [ ] **Step 2: Update `NoteMasonry` wall wrapper and empty state**

Modify `components/shared-board/NoteMasonry.tsx`:

- Return `<div className="shared-board-note-wall note-masonry">` with the existing mapped `NoteCard` children for notes.
- Empty state should use `.shared-board-empty-note` inside `.shared-board-note-wall` and keep copy concise:
  - title: `还没人贴便签`
  - body: `先来一张，给今天的团队小墙开个张。`

- [ ] **Step 3: Add pin, tape, fold, and ribbon markup to `NoteCard`**

Modify `components/shared-board/NoteCard.tsx`:

- Add deterministic pin asset selection from `note.id.length % 3` or author id hash so server/client output is stable.
- Add `<img className="note-pin" src={pinSrc} alt="" aria-hidden="true" />` for free notes and announcement notes unless the ribbon visually replaces it.
- Add `<span className="note-fold" aria-hidden="true" />`.
- Add `<img className="note-tape" src="/assets/home-scenes/shared-board/paper-tape.webp" alt="" aria-hidden="true" />` for pink/green free notes and optionally announcement bottom corner.
- Add `<span className="note-announcement-ribbon">团队通告</span>` and `<span className="note-announcement-rule" aria-hidden="true" />` for announcement notes.
- Keep author name, badge, relative time, content, delete button, and `deleting` opacity semantics.

- [ ] **Step 4: Rework note card CSS**

In `app/globals.css`:

- Change `.note-masonry` columns into a board-specific loose grid using CSS columns on desktop and single column on mobile.
- Change `.note-card` to square-ish sticky notes: 4px black border, 2px radius or 0.5rem max, paper shadow, no large pill rounding.
- Add deterministic visual rhythm:
  - `.note-card:nth-child(4n + 1) { rotate: -1.2deg; }`
  - `.note-card:nth-child(4n + 2) { rotate: 0.9deg; }`
  - `.note-card:nth-child(4n + 3) { rotate: -0.4deg; }`
  - hover lifts through `transform: translateY(-4px) rotate(var(--note-rotate))`.
- Use prototype colors:
  - yellow `#fee875`
  - blue `#b9ddfb`
  - green `#d9efc7`
  - pink `#f7bfd0`
  - announcement yellow `#fde047`
- Add `.note-pin`, `.note-tape`, `.note-fold`, `.note-announcement-ribbon`, `.note-announcement-rule`.
- Preserve `@media (hover: none) { .note-close-btn { opacity: 1; } }`.

- [ ] **Step 5: Update CSS tests**

Modify `__tests__/shared-board-css.test.ts`:

- Keep the touch delete visibility test.
- Add checks that CSS references `office-wall-bg.webp` and `cork-board-bg.webp`.
- Replace old announcement color expectations with checks for:
  - `.note-announcement-ribbon`
  - `.note-announcement-rule`
  - `.note-fold`
  - `.note-pin`
  - `.shared-board-note-wall`
  - no old dependency on `border-radius: 1rem` for `.note-card`

- [ ] **Step 6: Run shared-board tests**

Run:

```bash
npm test -- __tests__/home-ui-shared-board-scene.test.tsx __tests__/shared-board-css.test.ts __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit sticky-note card changes**

```bash
git add components/shared-board/NoteMasonry.tsx components/shared-board/NoteCard.tsx app/globals.css __tests__/home-ui-shared-board-scene.test.tsx __tests__/shared-board-css.test.ts
git commit -m "feat: style shared board sticky notes"
```

## Task 19: Responsive Pixel Pass And Verification

**Files:**
- Modify: `app/globals.css`
- Modify tests only if responsive selectors need contract coverage.

- [ ] **Step 1: Add responsive rules**

In `app/globals.css`:

- At `max-width: 1200px`, shrink side props and reduce cork width.
- At `max-width: 900px`, hide large side props, keep cork board full width, stack composer controls.
- At `max-width: 640px`, make composer a single-column paper form, note wall single column, sync pill inside normal flow, and reduce sticky-note rotation.
- Keep all text readable without viewport-scaled fonts.
- Keep buttons/chips stable in size so hover/active states do not shift layout.

- [ ] **Step 2: Run focused automated tests**

Run:

```bash
npm test -- __tests__/home-ui-shared-board-assets.test.ts __tests__/home-ui-shared-board-scene.test.tsx __tests__/shared-board-css.test.ts __tests__/shared-board-polling.test.tsx __tests__/shared-board-errors.test.tsx __tests__/board-note-copy.test.ts __tests__/board-notes-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Start local dev server for visual review**

Run:

```bash
npm run dev
```

Expected: dev server starts at `http://localhost:3000` or reports the fallback port if `3000` is occupied.

- [ ] **Step 5: Browser verification**

Using the Browser Use plugin or Playwright, inspect:

- Desktop `1672x941`: shared board should visually match `design/ui-assets/tab-共享看板.png` in hierarchy, board placement, composer placement, sticky-note arrangement, prop placement, and nav active state.
- Tablet `1024x768`: board remains centered, notes do not overlap composer, props do not block content.
- Mobile `390x844`: composer and notes are usable in one column, no text overlaps, delete buttons remain visible, publish/status messages remain readable.

Acceptance:

- No broken images.
- No text overflow inside buttons, chips, note cards, or status pills.
- Notes do not overlap incoherently.
- Composer controls remain keyboard-accessible and clickable.
- Reduced-motion mode disables decorative motion.

- [ ] **Step 6: Final commit**

```bash
git add app/globals.css
git commit -m "fix: polish shared board responsive note wall"
```

## Final Acceptance Checklist

- [ ] Current UI audit is reflected in this spec.
- [ ] Missing media checklist is complete and maps to final public paths.
- [ ] Each required image has its own task with an `imagegen` prompt, processing commands, public save path, verification, and commit step.
- [ ] Chroma-key removal, alpha validation, resize, compression, and file-size checks are specified.
- [ ] Final assets live under `public/assets/home-scenes/shared-board/`.
- [ ] The shared-board page uses only current real modules: `SharedBoard`, `NoteComposer`, `BoardMessage`, `NoteMasonry`, `NoteCard`, `SyncStatus`.
- [ ] No new business feature, schema, API, reducer, or note model behavior is introduced.
- [ ] Desktop visual target is `design/ui-assets/tab-共享看板.png`.
- [ ] Mobile remains usable instead of forcing the desktop cork-board composition.
- [ ] Focused tests and production build pass.
