# Home UI 04 Niuma Calendar Desk Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `牛马日历` tab into the approved desk binder monthly calendar scene using generated media assets, component-only visual changes, and CSS-only layout/styling changes.

**Architecture:** Keep the current calendar API, snapshot types, month cache, refresh event, and read-only behavior unchanged. Add project-bound raster assets under `public/assets/home-scenes/calendar/`, extend the pure calendar grid helper to emit visual-only neighbor-month cells, then wrap the existing `CalendarBoard` content in a layered `calendar-scene` with a binder paper surface and props layer. The implementation changes visual rendering only: data continues to come from `CalendarMonthSnapshot`.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v4 through `app/globals.css`, Vitest + jsdom, built-in `imagegen` skill, `remove_chroma_key.py`, ImageMagick `magick`, `cwebp`.

---

## Scope Guardrails

- Do not modify Prisma schema, API route contracts, auth, `/api/calendar/state`, or calendar refresh semantics.
- Do not add day detail, edit, backfill, delete, future navigation, or click behavior to day cells.
- Do not add statistics beyond `snapshot.workoutDays` and `snapshot.coffeeCupTotal`.
- Do not use screenshot slicing or a full prototype image as the UI background.
- Do not place raw generated images under `public/`.
- Application code must reference only `/assets/home-scenes/calendar/<filename>` for new scene media.
- Neighbor-month cells are visual-only table fillers. They must not request data and must not affect monthly totals.
- `回到本月` should remain visible in the header; when already viewing the current month it should be disabled.

## File Structure

- Create: `public/assets/home-scenes/calendar/`
  - Final compressed project assets for the calendar scene.
- Create: `__tests__/home-ui-calendar-assets.test.ts`
  - Verifies required calendar scene assets exist and stay below size budgets.
- Create: `__tests__/home-ui-calendar-scene.test.tsx`
  - Verifies `CalendarBoard` scene structure, project-bound props images, fixed action buttons, summary chip structure, and compact day state hooks.
- Create: `__tests__/home-ui-calendar-scene-css.test.ts`
  - Verifies required scene CSS rules, paper texture, table grid, responsive, and reduced-motion coverage.
- Modify: `components/calendar/calendar-data.ts`
  - Extend grid output to include visual-only previous/next month neighbor cells and keep current day cells unchanged.
- Modify: `__tests__/calendar-data.test.ts`
  - Update grid helper tests for neighbor cells and full-week padding.
- Modify: `components/calendar/CalendarBoard.tsx`
  - Add scene/background/props/content wrappers, binder surface, structured summary chips, and retained loading/error states.
- Modify: `components/calendar/CalendarHeader.tsx`
  - Render title/month/action layout matching the prototype; always render `回到本月`, disabled when unnecessary or busy.
- Modify: `components/calendar/CalendarGrid.tsx`
  - Render continuous table-like grid and pass neighbor cells to a visual-only element.
- Modify: `components/calendar/CalendarDayCell.tsx`
  - Change coffee rendering from repeated icons to compact `icon + number`, add empty mark hook, keep no click handler.
- Modify: `__tests__/calendar-board.test.tsx`
  - Update existing behavior tests for fixed `回到本月` and compact coffee count.
- Modify: `app/globals.css`
  - Add calendar scene, binder paper, props, header, summary, table grid, day cell, responsive, and reduced-motion CSS.

---

### Task 1: Add Calendar Asset Contract

**Files:**
- Create: `__tests__/home-ui-calendar-assets.test.ts`
- Create during execution: `public/assets/home-scenes/calendar/`

- [x] **Step 1: Write the failing asset contract test**

Create `__tests__/home-ui-calendar-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "calendar-desk-bg.webp", maxBytes: 450 * 1024 },
  { file: "binder-paper-texture.webp", maxBytes: 260 * 1024 },
  { file: "binder-rings-left.webp", maxBytes: 120 * 1024 },
  { file: "binder-clip.webp", maxBytes: 120 * 1024 },
  { file: "highlighter-focus-progress.webp", maxBytes: 160 * 1024 },
  { file: "sticker-just-lift.webp", maxBytes: 120 * 1024 },
  { file: "note-keep-going-purple.webp", maxBytes: 140 * 1024 },
  { file: "calendar-coffee-stamp-paper.webp", maxBytes: 140 * 1024 },
  { file: "calendar-coffee-ring-stain.webp", maxBytes: 100 * 1024 },
];

describe("home calendar scene assets", () => {
  it("ships compressed project-bound WebP assets for the calendar scene", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/calendar/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
      expect(path).not.toContain("$CODEX_HOME");
      expect(path).not.toContain("/private/tmp");
    }
  });
});
```

- [x] **Step 2: Run the asset test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-calendar-assets.test.ts
```

Expected: FAIL because `public/assets/home-scenes/calendar/*.webp` does not exist yet.

- [x] **Step 3: Commit the failing test**

```bash
git add __tests__/home-ui-calendar-assets.test.ts
git commit -m "test: add calendar scene asset contract"
```

---

### Task 2: Generate And Compress Calendar Scene Assets

**Files:**
- Create: `public/assets/home-scenes/calendar/calendar-desk-bg.webp`
- Create: `public/assets/home-scenes/calendar/binder-paper-texture.webp`
- Create: `public/assets/home-scenes/calendar/binder-rings-left.webp`
- Create: `public/assets/home-scenes/calendar/binder-clip.webp`
- Create: `public/assets/home-scenes/calendar/highlighter-focus-progress.webp`
- Create: `public/assets/home-scenes/calendar/sticker-just-lift.webp`
- Create: `public/assets/home-scenes/calendar/note-keep-going-purple.webp`
- Create: `public/assets/home-scenes/calendar/calendar-coffee-stamp-paper.webp`
- Create: `public/assets/home-scenes/calendar/calendar-coffee-ring-stain.webp`
- Test: `__tests__/home-ui-calendar-assets.test.ts`

**Asset processing rules:**
- `calendar-desk-bg.webp` and `binder-paper-texture.webp` are opaque backgrounds. Resize and compress directly.
- Every other asset is an alpha overlay. Generate on a perfectly flat `#00ff00` chroma-key background, remove that background locally, then compress to alpha WebP.
- If generated text is misspelled or extra readable text appears, regenerate that asset before processing.
- If a subject includes green key-color contamination, regenerate with `#ff00ff` and keep `--auto-key border`.

- [ ] **Step 1: Create staging and final directories**

Run:

```bash
mkdir -p /private/tmp/share-project-home-scenes-calendar/raw /private/tmp/share-project-home-scenes-calendar/alpha /private/tmp/share-project-home-scenes-calendar/resized public/assets/home-scenes/calendar
```

Expected: all four directories exist.

- [ ] **Step 2: Generate `calendar-desk-bg` with imagegen**

Use the built-in `image_gen` tool through the `imagegen` skill. Prompt:

```text
Use case: stylized-concept
Asset type: web app scene background for the 牛马日历 tab
Primary request: a clean light desk paper background for a playful brutalist Chinese fitness calendar web app
Scene/backdrop: warm off-white desk surface with subtle paper grain, tiny speckled texture, faint coffee marks near edges, quiet center area for a large calendar notebook
Style/medium: polished 2D raster illustration, flat-shaded, crisp edges, light texture, not photorealistic
Composition/framing: 16:9 wide background, no centered object, no people, no UI, no logos
Lighting/mood: bright indoor ambient light, tidy desk
Color palette: warm white, pale gray, muted beige, tiny slate marks
Constraints: no readable text, no watermarks, no large equipment, no dark vignette, no gradient orb decoration
```

Copy the selected generated output to:

```text
/private/tmp/share-project-home-scenes-calendar/raw/calendar-desk-bg.png
```

- [ ] **Step 3: Generate `binder-paper-texture` with imagegen**

Prompt:

```text
Use case: stylized-concept
Asset type: paper texture for a monthly calendar notebook surface
Primary request: a clean white binder notebook paper texture for a web app calendar panel
Scene/backdrop: isolated flat paper texture with slight fibers, soft edge wear, very subtle paper shadow, no printed content
Style/medium: polished 2D raster texture, crisp but quiet, suitable under real UI text
Composition/framing: landscape rectangle, uniform usable center, no objects
Lighting/mood: bright and clean
Color palette: white, warm off-white, pale gray
Constraints: no readable text, no pre-drawn calendar grid, no logos, no stains that reduce readability, no watermark
```

Copy the selected generated output to:

```text
/private/tmp/share-project-home-scenes-calendar/raw/binder-paper-texture.png
```

- [ ] **Step 4: Generate alpha overlay assets with imagegen**

Generate each asset separately. Copy selected outputs to `/private/tmp/share-project-home-scenes-calendar/raw/<filename>.png`.

`binder-rings-left.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay for the left edge of a calendar notebook scene
Primary request: silver binder rings along the left side of a playful brutalist notebook calendar
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: three or four silver metal binder rings connected to a thin warm brown notebook spine edge, thick black outline, clean highlights
Style/medium: polished 2D raster illustration, crisp edges, playful brutalist line work
Composition/framing: tall vertical strip, rings aligned on the left edge, usable as page-edge decoration
Color palette: silver gray, dark slate outline, warm brown spine
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the object; do not use #00ff00 anywhere in the subject; no text; no people; no watermark
```

`binder-clip.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay desk prop for a calendar scene
Primary request: a black binder clip for a playful brutalist desk calendar
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: black metal binder clip with silver handles, thick outline, slight paper-shadow style but no actual cast shadow
Style/medium: polished 2D raster illustration, crisp edges, subtle texture
Composition/framing: square object, slightly angled, centered
Color palette: black, charcoal, silver gray
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the clip; do not use #00ff00 anywhere in the subject; no text; no watermark
```

`highlighter-focus-progress.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay desk prop for a calendar scene
Primary request: a yellow highlighter marker for a fitness calendar web app
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: yellow highlighter marker with black cap, thick black outline, slightly worn plastic texture
Style/medium: playful brutalist 2D illustration, crisp edge, flat shaded
Composition/framing: tall vertical marker, slightly tilted, usable on the left side of a desktop scene
Text (verbatim): "FOCUS ON PROGRESS"
Color palette: yellow, black, warm gray
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the marker; do not use #00ff00 anywhere in the subject; only the exact text "FOCUS ON PROGRESS"; no other readable text; no people; no watermark
```

`sticker-just-lift.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay sticker for a fitness calendar scene
Primary request: a white comic burst sticker for a playful brutalist fitness calendar
Scene/backdrop: isolated sticker on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: white burst-shaped sticker with thick black outline, small black dumbbell icon, slight paper texture
Style/medium: playful brutalist 2D illustration, crisp edges
Composition/framing: square sticker, centered, clean edge for cropping
Text (verbatim): "JUST LIFT."
Color palette: white, black, tiny muted yellow accent
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the sticker; do not use #00ff00 anywhere in the sticker; only the exact text "JUST LIFT."; no other readable text; no watermark
```

`note-keep-going-purple.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay taped note for a calendar scene
Primary request: a purple taped motivational note for a playful brutalist fitness calendar
Scene/backdrop: isolated note on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: purple paper note with beige tape across the top, thick black outline, small lightning bolt icon, slight paper wrinkle texture
Style/medium: polished 2D raster illustration, crisp edge, playful brutalist
Composition/framing: portrait note, slightly rotated, centered
Text (verbatim): "KEEP GOING"
Color palette: soft purple, beige tape, black ink
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the note; do not use #00ff00 anywhere in the note or tape; only the exact text "KEEP GOING"; no other readable text; no watermark
```

`calendar-coffee-stamp-paper.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay paper stamp for a calendar scene
Primary request: a white torn paper with a circular coffee stamp for a desk calendar scene
Scene/backdrop: isolated paper on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: off-white torn paper square with tape marks and a circular coffee stamp, coffee cup line icon in the center, thick ink texture
Style/medium: polished 2D raster illustration, crisp paper edge, subtle vintage stamp
Composition/framing: square paper, slightly rotated, centered
Text (verbatim): "COFFEE" and "FUEL YOUR DAY"
Color palette: warm white paper, brown stamp ink, beige tape
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the paper; do not use #00ff00 anywhere in the subject; only the exact text "COFFEE" and "FUEL YOUR DAY"; no other readable text; no watermark
```

`calendar-coffee-ring-stain.png` prompt:

```text
Use case: stylized-concept
Asset type: alpha overlay subtle coffee stain for a calendar desk scene
Primary request: a light coffee cup ring stain for a paper desk background
Scene/backdrop: isolated stain on a perfectly flat solid #00ff00 chroma-key background, generous padding
Subject: translucent coffee ring stain and a few tiny droplets, no cup, no paper
Style/medium: polished 2D raster illustration, soft but clean edge
Composition/framing: square object, centered
Color palette: pale brown, warm beige
Constraints: generate on a perfectly flat solid #00ff00 chroma-key background outside the stain; do not use #00ff00 anywhere in the stain; no text; no logos; no watermark
```

- [ ] **Step 5: Remove chroma-key backgrounds from alpha overlays**

Run once per overlay:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/binder-rings-left.png --out /private/tmp/share-project-home-scenes-calendar/alpha/binder-rings-left.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/binder-clip.png --out /private/tmp/share-project-home-scenes-calendar/alpha/binder-clip.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/highlighter-focus-progress.png --out /private/tmp/share-project-home-scenes-calendar/alpha/highlighter-focus-progress.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/sticker-just-lift.png --out /private/tmp/share-project-home-scenes-calendar/alpha/sticker-just-lift.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/note-keep-going-purple.png --out /private/tmp/share-project-home-scenes-calendar/alpha/note-keep-going-purple.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/calendar-coffee-stamp-paper.png --out /private/tmp/share-project-home-scenes-calendar/alpha/calendar-coffee-stamp-paper.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" --input /private/tmp/share-project-home-scenes-calendar/raw/calendar-coffee-ring-stain.png --out /private/tmp/share-project-home-scenes-calendar/alpha/calendar-coffee-ring-stain.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1
```

Expected: each alpha PNG has transparent corners and no visible key-color fringe.

- [ ] **Step 6: Resize and compress final WebP assets**

Run:

```bash
magick /private/tmp/share-project-home-scenes-calendar/raw/calendar-desk-bg.png -resize 2560x1440\> /private/tmp/share-project-home-scenes-calendar/resized/calendar-desk-bg.png
cwebp -q 82 /private/tmp/share-project-home-scenes-calendar/resized/calendar-desk-bg.png -o public/assets/home-scenes/calendar/calendar-desk-bg.webp

magick /private/tmp/share-project-home-scenes-calendar/raw/binder-paper-texture.png -resize 1800x1200\> /private/tmp/share-project-home-scenes-calendar/resized/binder-paper-texture.png
cwebp -q 84 /private/tmp/share-project-home-scenes-calendar/resized/binder-paper-texture.png -o public/assets/home-scenes/calendar/binder-paper-texture.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/binder-rings-left.png -resize 420x1200\> /private/tmp/share-project-home-scenes-calendar/resized/binder-rings-left.png
cwebp -q 86 /private/tmp/share-project-home-scenes-calendar/resized/binder-rings-left.png -o public/assets/home-scenes/calendar/binder-rings-left.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/binder-clip.png -resize 560x560\> /private/tmp/share-project-home-scenes-calendar/resized/binder-clip.png
cwebp -q 88 /private/tmp/share-project-home-scenes-calendar/resized/binder-clip.png -o public/assets/home-scenes/calendar/binder-clip.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/highlighter-focus-progress.png -resize 560x920\> /private/tmp/share-project-home-scenes-calendar/resized/highlighter-focus-progress.png
cwebp -q 86 /private/tmp/share-project-home-scenes-calendar/resized/highlighter-focus-progress.png -o public/assets/home-scenes/calendar/highlighter-focus-progress.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/sticker-just-lift.png -resize 560x560\> /private/tmp/share-project-home-scenes-calendar/resized/sticker-just-lift.png
cwebp -q 88 /private/tmp/share-project-home-scenes-calendar/resized/sticker-just-lift.png -o public/assets/home-scenes/calendar/sticker-just-lift.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/note-keep-going-purple.png -resize 560x660\> /private/tmp/share-project-home-scenes-calendar/resized/note-keep-going-purple.png
cwebp -q 86 /private/tmp/share-project-home-scenes-calendar/resized/note-keep-going-purple.png -o public/assets/home-scenes/calendar/note-keep-going-purple.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/calendar-coffee-stamp-paper.png -resize 680x720\> /private/tmp/share-project-home-scenes-calendar/resized/calendar-coffee-stamp-paper.png
cwebp -q 86 /private/tmp/share-project-home-scenes-calendar/resized/calendar-coffee-stamp-paper.png -o public/assets/home-scenes/calendar/calendar-coffee-stamp-paper.webp

magick /private/tmp/share-project-home-scenes-calendar/alpha/calendar-coffee-ring-stain.png -resize 620x620\> /private/tmp/share-project-home-scenes-calendar/resized/calendar-coffee-ring-stain.png
cwebp -q 88 /private/tmp/share-project-home-scenes-calendar/resized/calendar-coffee-ring-stain.png -o public/assets/home-scenes/calendar/calendar-coffee-ring-stain.webp
```

- [ ] **Step 7: Verify asset contract passes**

Run:

```bash
npm test -- __tests__/home-ui-calendar-assets.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit assets**

```bash
git add public/assets/home-scenes/calendar __tests__/home-ui-calendar-assets.test.ts
git commit -m "feat: add calendar scene media assets"
```

---

### Task 3: Extend Calendar Grid Data With Visual Neighbor Cells

**Files:**
- Modify: `components/calendar/calendar-data.ts`
- Modify: `__tests__/calendar-data.test.ts`

- [ ] **Step 1: Update failing calendar-data tests**

Modify the import and the grid expectations in `__tests__/calendar-data.test.ts` so the leading blanks become previous-month neighbor cells and the grid pads to complete weeks:

```ts
it("builds a full-week grid with neighbor days and today's day highlighted", () => {
  const snapshot = {
    monthKey: "2026-04",
    currentMonthKey: "2026-04",
    todayDay: 3,
    totalDays: 5,
    workoutDays: 2,
    coffeeCupTotal: 6,
    days: [
      { day: 1, workedOut: true, coffeeCups: 0 },
      { day: 2, workedOut: false, coffeeCups: 2 },
      { day: 3, workedOut: true, coffeeCups: 4 },
      { day: 4, workedOut: false, coffeeCups: 0 },
      { day: 5, workedOut: false, coffeeCups: 0 },
    ],
  };

  expect(buildCalendarGrid(snapshot, 2)).toEqual([
    { kind: "neighbor", day: 30, monthRelation: "previous" },
    { kind: "neighbor", day: 31, monthRelation: "previous" },
    { kind: "day", day: 1, workedOut: true, coffeeCups: 0, isToday: false },
    { kind: "day", day: 2, workedOut: false, coffeeCups: 2, isToday: false },
    { kind: "day", day: 3, workedOut: true, coffeeCups: 4, isToday: true },
    { kind: "day", day: 4, workedOut: false, coffeeCups: 0, isToday: false },
    { kind: "day", day: 5, workedOut: false, coffeeCups: 0, isToday: false },
  ]);
});
```

Add a separate test below it:

```ts
it("pads month endings with next-month neighbor days", () => {
  const snapshot = {
    monthKey: "2026-05",
    currentMonthKey: "2026-05",
    todayDay: 31,
    totalDays: 31,
    workoutDays: 1,
    coffeeCupTotal: 1,
    days: [{ day: 31, workedOut: true, coffeeCups: 1 }],
  };

  const cells = buildCalendarGrid(snapshot, 4);

  expect(cells).toHaveLength(35);
  expect(cells.slice(0, 4)).toEqual([
    { kind: "neighbor", day: 27, monthRelation: "previous" },
    { kind: "neighbor", day: 28, monthRelation: "previous" },
    { kind: "neighbor", day: 29, monthRelation: "previous" },
    { kind: "neighbor", day: 30, monthRelation: "previous" },
  ]);
  expect(cells[34]).toEqual({ kind: "neighbor", day: 1, monthRelation: "next" });
});
```

Update the existing "clamps out-of-range offsets" expectation to use `kind: "neighbor"` for the six leading cells:

```ts
expect(buildCalendarGrid(snapshot, 9)).toEqual([
  { kind: "neighbor", day: 25, monthRelation: "previous" },
  { kind: "neighbor", day: 26, monthRelation: "previous" },
  { kind: "neighbor", day: 27, monthRelation: "previous" },
  { kind: "neighbor", day: 28, monthRelation: "previous" },
  { kind: "neighbor", day: 29, monthRelation: "previous" },
  { kind: "neighbor", day: 30, monthRelation: "previous" },
  { kind: "day", day: 1, workedOut: true, coffeeCups: 1, isToday: true },
  { kind: "day", day: 2, workedOut: false, coffeeCups: 0, isToday: false },
  { kind: "neighbor", day: 1, monthRelation: "next" },
  { kind: "neighbor", day: 2, monthRelation: "next" },
  { kind: "neighbor", day: 3, monthRelation: "next" },
  { kind: "neighbor", day: 4, monthRelation: "next" },
  { kind: "neighbor", day: 5, monthRelation: "next" },
]);
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
```

Expected: FAIL because `buildCalendarGrid` still returns `kind: "blank"` and does not pad trailing neighbor cells.

- [ ] **Step 3: Implement neighbor cell grid data**

Replace the cell interfaces and add helper functions in `components/calendar/calendar-data.ts`:

```ts
export interface CalendarNeighborCell {
  kind: "neighbor";
  day: number;
  monthRelation: "previous" | "next";
}

export interface CalendarDayCell {
  kind: "day";
  day: number;
  workedOut: boolean;
  coffeeCups: number;
  isToday: boolean;
}

export type CalendarGridCell = CalendarNeighborCell | CalendarDayCell;

function getTotalDaysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getPreviousMonthTotalDays(monthKey: string): number {
  return getTotalDaysInMonth(getPreviousMonthKey(monthKey));
}
```

Then replace `buildCalendarGrid` with:

```ts
export function buildCalendarGrid(
  snapshot: CalendarMonthSnapshot,
  firstDayOffset: number,
): CalendarGridCell[] {
  const normalizedOffset = Number.isFinite(firstDayOffset) ? Math.trunc(firstDayOffset) : 0;
  const leadingNeighborCount = Math.max(0, Math.min(6, normalizedOffset));
  const previousMonthTotalDays = getPreviousMonthTotalDays(snapshot.monthKey);
  const dayRecords = new Map(snapshot.days.map((dayRecord) => [dayRecord.day, dayRecord] as const));

  const leadingCells: CalendarGridCell[] = Array.from(
    { length: leadingNeighborCount },
    (_, index) => ({
      kind: "neighbor",
      day: previousMonthTotalDays - leadingNeighborCount + index + 1,
      monthRelation: "previous",
    }),
  );

  const dayCells: CalendarGridCell[] = Array.from({ length: snapshot.totalDays }, (_, index) => {
    const day = index + 1;
    const record = dayRecords.get(day);

    return {
      kind: "day",
      day,
      workedOut: record?.workedOut ?? false,
      coffeeCups: record?.coffeeCups ?? 0,
      isToday:
        snapshot.monthKey === snapshot.currentMonthKey &&
        snapshot.todayDay !== null &&
        snapshot.todayDay === day,
    };
  });

  const cells = [...leadingCells, ...dayCells];
  const trailingNeighborCount = (7 - (cells.length % 7)) % 7;
  const trailingCells: CalendarGridCell[] = Array.from(
    { length: trailingNeighborCount },
    (_, index) => ({
      kind: "neighbor",
      day: index + 1,
      monthRelation: "next",
    }),
  );

  return [...cells, ...trailingCells];
}
```

- [ ] **Step 4: Run helper tests and verify they pass**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper changes**

```bash
git add components/calendar/calendar-data.ts __tests__/calendar-data.test.ts
git commit -m "feat: add calendar neighbor day cells"
```

---

### Task 4: Add Calendar Scene Component Contract Tests

**Files:**
- Create: `__tests__/home-ui-calendar-scene.test.tsx`
- Modify later: `components/calendar/CalendarBoard.tsx`
- Modify later: `components/calendar/CalendarHeader.tsx`
- Modify later: `components/calendar/CalendarGrid.tsx`
- Modify later: `components/calendar/CalendarDayCell.tsx`

- [ ] **Step 1: Create the failing scene component test**

Create `__tests__/home-ui-calendar-scene.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import type { CalendarMonthSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const snapshot: CalendarMonthSnapshot = {
  monthKey: "2026-05",
  currentMonthKey: "2026-05",
  todayDay: 28,
  totalDays: 31,
  workoutDays: 12,
  coffeeCupTotal: 18,
  days: [
    { day: 1, workedOut: true, coffeeCups: 1 },
    { day: 2, workedOut: true, coffeeCups: 2 },
    { day: 5, workedOut: false, coffeeCups: 0 },
    { day: 28, workedOut: true, coffeeCups: 2 },
  ],
};

async function waitFor(assertion: () => void | Promise<void>, timeoutMs = 1000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
      if (Date.now() - start >= timeoutMs) {
        throw error;
      }
    }
  }
}

function getDayCell(container: HTMLElement, day: number) {
  const cell = Array.from(container.querySelectorAll(".calendar-day-cell")).find((candidate) => {
    return candidate.querySelector(".calendar-day-number")?.textContent?.trim() === String(day);
  });

  expect(cell).toBeDefined();
  return cell as HTMLElement;
}

describe("home calendar scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot }),
      }),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the calendar as a layered desk binder scene", async () => {
    await act(async () => {
      root.render(<CalendarBoard />);
    });

    await waitFor(() => {
      expect(container.querySelector(".calendar-scene")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-background")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-props")).not.toBeNull();
      expect(container.querySelector(".calendar-scene-content")).not.toBeNull();
      expect(container.querySelector(".calendar-binder-shell")).not.toBeNull();
      expect(container.querySelector(".calendar-paper-surface")).not.toBeNull();
    });

    const propSources = Array.from(container.querySelectorAll(".calendar-scene-props img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(propSources).toEqual(
      expect.arrayContaining([
        "/assets/home-scenes/calendar/binder-rings-left.webp",
        "/assets/home-scenes/calendar/binder-clip.webp",
        "/assets/home-scenes/calendar/highlighter-focus-progress.webp",
        "/assets/home-scenes/calendar/sticker-just-lift.webp",
        "/assets/home-scenes/calendar/note-keep-going-purple.webp",
        "/assets/home-scenes/calendar/calendar-coffee-stamp-paper.webp",
        "/assets/home-scenes/calendar/calendar-coffee-ring-stain.webp",
      ]),
    );
  });

  it("renders fixed header actions, structured summary chips, compact day states, and neighbor cells", async () => {
    await act(async () => {
      root.render(<CalendarBoard />);
    });

    await waitFor(() => {
      expect(container.textContent).toContain("Monthly Record View");
      expect(container.textContent).toContain("牛马日历");
      expect(container.textContent).toContain("2026年5月");
      expect(container.textContent).toContain("上个月");
      expect(container.textContent).toContain("回到本月");
      expect(container.querySelector(".calendar-return-btn")?.getAttribute("disabled")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-chip-workout")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-chip-coffee")).not.toBeNull();
      expect(container.querySelector(".calendar-summary-value")?.textContent).toContain("12");
      expect(container.textContent).toContain("18");
    });

    expect(container.querySelectorAll(".calendar-neighbor-cell")).toHaveLength(4);

    const dayOne = getDayCell(container, 1);
    expect(dayOne.querySelector(".calendar-workout-chip")).not.toBeNull();
    expect(dayOne.querySelector(".calendar-coffee-count")?.textContent).toContain("1");

    const emptyDay = getDayCell(container, 5);
    expect(emptyDay.querySelector(".calendar-empty-mark")).not.toBeNull();
    expect(emptyDay.querySelector(".calendar-coffee-count")).toBeNull();

    const today = getDayCell(container, 28);
    expect(today.className).toContain("calendar-day-cell-today");
    expect(today.querySelector(".calendar-workout-chip")).not.toBeNull();
    expect(today.querySelector(".calendar-coffee-count")?.textContent).toContain("2");
  });
});
```

- [ ] **Step 2: Run the scene test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-calendar-scene.test.tsx
```

Expected: FAIL because current components do not render `calendar-scene`, props images, fixed return button, compact coffee count, empty mark, or neighbor cells.

- [ ] **Step 3: Commit the failing scene test**

```bash
git add __tests__/home-ui-calendar-scene.test.tsx
git commit -m "test: add calendar scene component contract"
```

---

### Task 5: Implement Calendar Scene Structure And Component Markup

**Files:**
- Modify: `components/calendar/CalendarBoard.tsx`
- Modify: `components/calendar/CalendarHeader.tsx`
- Modify: `components/calendar/CalendarGrid.tsx`
- Modify: `components/calendar/CalendarDayCell.tsx`
- Test: `__tests__/home-ui-calendar-scene.test.tsx`

- [ ] **Step 1: Update CalendarHeader props and markup**

Replace `components/calendar/CalendarHeader.tsx` with:

```tsx
interface CalendarHeaderProps {
  monthLabel: string;
  busy: boolean;
  canReturnToCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onReturnToCurrentMonth: () => void;
}

export function CalendarHeader({
  monthLabel,
  busy,
  canReturnToCurrentMonth,
  onPreviousMonth,
  onReturnToCurrentMonth,
}: CalendarHeaderProps) {
  const returnDisabled = busy || !canReturnToCurrentMonth;

  return (
    <header className="calendar-header">
      <div className="calendar-header-copy">
        <p className="calendar-header-eyebrow">Monthly Record View</p>
        <div className="calendar-header-title-row">
          <h1 className="calendar-header-title">牛马日历</h1>
          <span className="calendar-header-divider" aria-hidden="true" />
          <p className="calendar-header-month">{monthLabel}</p>
        </div>
      </div>
      <div className="calendar-header-actions">
        <button
          type="button"
          disabled={busy}
          onClick={onPreviousMonth}
          className="calendar-prev-btn"
        >
          上个月
        </button>
        <button
          type="button"
          disabled={returnDisabled}
          onClick={onReturnToCurrentMonth}
          className="calendar-return-btn"
        >
          回到本月
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update CalendarDayCell markup**

Replace `components/calendar/CalendarDayCell.tsx` with:

```tsx
import type { CalendarDayCell as CalendarGridDayCell } from "./calendar-data";
import { AssetIcon } from "@/components/ui/AssetIcon";

export function CalendarDayCell({ cell }: { cell: CalendarGridDayCell }) {
  const hasActivity = cell.workedOut || cell.coffeeCups > 0;

  return (
    <div
      className={`calendar-day-cell ${cell.isToday ? "calendar-day-cell-today" : ""} ${
        hasActivity ? "calendar-day-cell-active" : "calendar-day-cell-empty"
      }`}
    >
      <div className="calendar-day-top">
        <span className="calendar-day-number">{cell.day}</span>
        {cell.workedOut ? (
          <span className="calendar-workout-chip" aria-label="已训练">
            练
          </span>
        ) : null}
      </div>
      {cell.coffeeCups > 0 ? (
        <div
          className="calendar-coffee-count"
          aria-label={`咖啡 ${cell.coffeeCups} 杯`}
          role="img"
        >
          <AssetIcon name="coffee" className="calendar-coffee-icon" />
          <span>{cell.coffeeCups}</span>
        </div>
      ) : null}
      {!hasActivity ? <span className="calendar-empty-mark" aria-hidden="true" /> : null}
    </div>
  );
}
```

- [ ] **Step 3: Update CalendarGrid for neighbor cells**

Replace the render branch in `components/calendar/CalendarGrid.tsx` with:

```tsx
export function CalendarGrid({ snapshot }: { snapshot: CalendarMonthSnapshot }) {
  const cells = buildCalendarGrid(snapshot, getFirstDayOffset(snapshot.monthKey));

  return (
    <section className="calendar-grid-section" aria-label={`${snapshot.monthKey} 牛马记录`}>
      <div className="calendar-month-table">
        <div className="calendar-weekday-row">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              <span className="calendar-week-prefix">周</span>
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-month-grid">
          {cells.map((cell, index) =>
            cell.kind === "neighbor" ? (
              <div
                key={`${cell.monthRelation}-${cell.day}-${index}`}
                className={`calendar-neighbor-cell calendar-neighbor-cell-${cell.monthRelation}`}
                aria-hidden="true"
              >
                {cell.day}
              </div>
            ) : (
              <CalendarDayCell key={`${snapshot.monthKey}-${cell.day}`} cell={cell} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
```

Keep `WEEKDAY_LABELS`, `getFirstDayOffset`, and the imports unchanged.

- [ ] **Step 4: Update CalendarBoard scene wrappers and summary chips**

In `components/calendar/CalendarBoard.tsx`, replace the return block with:

```tsx
  return (
    <section className="calendar-board-viewport absolute inset-0 overflow-y-auto p-3 sm:p-5">
      <div className="calendar-scene">
        <div className="calendar-scene-background" aria-hidden="true" />
        <div className="calendar-scene-props" aria-hidden="true">
          <img
            className="calendar-prop calendar-prop-rings"
            src="/assets/home-scenes/calendar/binder-rings-left.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-clip"
            src="/assets/home-scenes/calendar/binder-clip.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-highlighter"
            src="/assets/home-scenes/calendar/highlighter-focus-progress.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-sticker"
            src="/assets/home-scenes/calendar/sticker-just-lift.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-note"
            src="/assets/home-scenes/calendar/note-keep-going-purple.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stamp"
            src="/assets/home-scenes/calendar/calendar-coffee-stamp-paper.webp"
            alt=""
          />
          <img
            className="calendar-prop calendar-prop-stain"
            src="/assets/home-scenes/calendar/calendar-coffee-ring-stain.webp"
            alt=""
          />
        </div>
        <div className="calendar-scene-content">
          <div className="calendar-binder-shell">
            <div className="calendar-paper-surface">
              <CalendarHeader
                monthLabel={monthLabel}
                busy={busy}
                canReturnToCurrentMonth={canReturnToCurrentMonth}
                onPreviousMonth={() => {
                  void showPreviousMonth();
                }}
                onReturnToCurrentMonth={showCurrentMonth}
              />
              {snapshot ? (
                <>
                  {error ? (
                    <div className="calendar-error-message">
                      {error}
                    </div>
                  ) : null}
                  <div className="calendar-summary-row">
                    <div className="calendar-summary-chip calendar-summary-chip-workout">
                      <span className="calendar-summary-icon" aria-hidden="true">
                        <img src="/assets/icons/workout-pixel.svg" alt="" />
                      </span>
                      <span className="calendar-summary-label">本月练了</span>
                      <strong className="calendar-summary-value">{snapshot.workoutDays}</strong>
                      <span className="calendar-summary-unit">天</span>
                    </div>
                    <div className="calendar-summary-chip calendar-summary-chip-coffee">
                      <span className="calendar-summary-icon" aria-hidden="true">
                        <img src="/assets/icons/coffee-pixel.svg" alt="" />
                      </span>
                      <span className="calendar-summary-label">本月喝了</span>
                      <strong className="calendar-summary-value">{snapshot.coffeeCupTotal}</strong>
                      <span className="calendar-summary-unit">杯</span>
                    </div>
                  </div>
                  <CalendarGrid snapshot={snapshot} />
                </>
              ) : (
                <div className="calendar-loading-state">
                  {error ?? "牛马日历加载中..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
```

- [ ] **Step 5: Run the scene component test and verify it passes**

Run:

```bash
npm test -- __tests__/home-ui-calendar-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit component markup**

```bash
git add components/calendar/CalendarBoard.tsx components/calendar/CalendarHeader.tsx components/calendar/CalendarGrid.tsx components/calendar/CalendarDayCell.tsx __tests__/home-ui-calendar-scene.test.tsx
git commit -m "feat: add calendar desk scene markup"
```

---

### Task 6: Add Calendar Scene CSS

**Files:**
- Create: `__tests__/home-ui-calendar-scene-css.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the failing CSS contract test**

Create `__tests__/home-ui-calendar-scene-css.test.ts`:

```ts
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function extractBlocks(css: string, marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
    blocks.push(extractBlockAt(css, marker, markerIndex));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function extractBlockAt(css: string, marker: string, markerIndex: number) {
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
  let blockStart = css.indexOf("{");

  while (blockStart >= 0) {
    const previousClose = css.lastIndexOf("}", blockStart);
    const previousOpen = css.lastIndexOf("{", blockStart - 1);
    const selectorStart = Math.max(previousClose, previousOpen) + 1;
    const selectorList = css.slice(selectorStart, blockStart).trim();
    const selectors = selectorList.split(",").map((item) => item.trim());

    if (!selectorList.startsWith("@") && selectors.includes(selector)) {
      break;
    }

    blockStart = css.indexOf("{", blockStart + 1);
  }

  expect(blockStart).toBeGreaterThanOrEqual(0);
  return extractBlockAt(css, selector, css.lastIndexOf(selector, blockStart));
}

describe("home calendar scene CSS", () => {
  it("styles the calendar tab as a layered desk binder scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".calendar-scene");
    const backgroundRule = extractRuleBody(css, ".calendar-scene-background");
    const propsRule = extractRuleBody(css, ".calendar-scene-props");
    const contentRule = extractRuleBody(css, ".calendar-scene-content");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/calendar-desk-bg\.webp/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
  });

  it("styles the paper surface, summary chips, table grid, and day states", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const paperRule = extractRuleBody(css, ".calendar-paper-surface");
    const summaryRule = extractRuleBody(css, ".calendar-summary-chip");
    const tableRule = extractRuleBody(css, ".calendar-month-table");
    const todayRule = extractRuleBody(css, ".calendar-day-cell-today");
    const neighborRule = extractRuleBody(css, ".calendar-neighbor-cell");

    expect(paperRule).toMatch(/border:\s*4px solid #111827/);
    expect(paperRule).toMatch(/binder-paper-texture\.webp/);
    expect(summaryRule).toMatch(/border:\s*3px solid #111827/);
    expect(tableRule).toMatch(/border:\s*2px solid #d1d5db/);
    expect(todayRule).toMatch(/background:\s*#fef3c7/);
    expect(neighborRule).toMatch(/color:\s*#a3a3a3/);
  });

  it("includes responsive and reduced-motion coverage for the calendar scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");

    expect(
      mobileBlocks.some(
        (block) => block.includes(".calendar-scene-props") && block.includes(".calendar-paper-surface"),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) => block.includes(".calendar-scene *") && /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the CSS test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-calendar-scene-css.test.ts
```

Expected: FAIL because the new scene CSS does not exist yet.

- [ ] **Step 3: Add calendar scene CSS**

Append this block near the existing `calendar-*` CSS in `app/globals.css`, then remove or override older duplicate rules only when they conflict with these selectors:

```css
.calendar-scene {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  overflow: hidden;
  border-radius: 1.65rem;
  background: #f5f1e8;
}

.calendar-scene-background,
.calendar-scene-props {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

.calendar-scene-background {
  z-index: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.14)),
    url("/assets/home-scenes/calendar/calendar-desk-bg.webp");
  background-size: cover;
  background-position: center;
}

.calendar-scene-props {
  z-index: 1;
}

.calendar-scene-content {
  position: relative;
  z-index: 2;
  min-height: 100%;
  padding: clamp(1rem, 2.2vw, 2rem);
}

.calendar-prop {
  position: absolute;
  display: block;
  max-width: none;
  user-select: none;
}

.calendar-prop-rings {
  left: clamp(5.2rem, 9vw, 10rem);
  top: 5.8rem;
  width: clamp(4.6rem, 7.5vw, 7.5rem);
  z-index: 4;
}

.calendar-prop-clip {
  left: clamp(1rem, 2.5vw, 2.4rem);
  top: clamp(2rem, 5vw, 4rem);
  width: clamp(5rem, 8vw, 7.5rem);
  transform: rotate(-12deg);
}

.calendar-prop-highlighter {
  left: clamp(0.2rem, 1.2vw, 1rem);
  bottom: clamp(1.5rem, 5vw, 4.8rem);
  width: clamp(5.5rem, 9vw, 8.5rem);
  transform: rotate(10deg);
}

.calendar-prop-sticker {
  left: clamp(1rem, 3vw, 3rem);
  top: 34%;
  width: clamp(5rem, 8vw, 7rem);
  transform: rotate(-10deg);
}

.calendar-prop-note {
  right: clamp(1rem, 2.2vw, 2.5rem);
  top: clamp(9rem, 18vw, 14rem);
  width: clamp(6rem, 9vw, 8rem);
  transform: rotate(11deg);
}

.calendar-prop-stamp {
  right: clamp(0.7rem, 2vw, 2.2rem);
  bottom: clamp(5.5rem, 10vw, 9rem);
  width: clamp(6rem, 10vw, 9rem);
  transform: rotate(13deg);
}

.calendar-prop-stain {
  right: clamp(0rem, 1.5vw, 1.6rem);
  bottom: clamp(1rem, 3vw, 2.4rem);
  width: clamp(7rem, 12vw, 10rem);
  opacity: 0.8;
}

.calendar-binder-shell {
  position: relative;
  width: min(100%, 82rem);
  min-height: calc(100vh - 8rem);
  margin: 0 auto;
  padding: 0.45rem 0.65rem 0.75rem 0.9rem;
  border-radius: 1.4rem;
  background: linear-gradient(90deg, #8a5a2b 0 1.15rem, #f9fafb 1.15rem 100%);
  border: 3px solid #111827;
  box-shadow: 0 10px 0 #5b3718, 0 22px 36px rgba(17, 24, 39, 0.22);
}

.calendar-paper-surface {
  position: relative;
  min-height: calc(100vh - 9.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 1.7vw, 1.35rem);
  padding: clamp(1.35rem, 2.7vw, 2.8rem);
  padding-left: clamp(2.2rem, 4vw, 3.5rem);
  border: 4px solid #111827;
  border-radius: 1.2rem;
  background-color: rgba(255, 255, 255, 0.94);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.82)),
    url("/assets/home-scenes/calendar/binder-paper-texture.webp");
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 2px rgba(17, 24, 39, 0.08);
}

.calendar-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
}

.calendar-header-eyebrow {
  position: relative;
  margin: 0 0 0.35rem;
  padding-left: 1.15rem;
  color: #8b5cf6;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.1;
}

.calendar-header-eyebrow::before {
  content: "✦";
  position: absolute;
  left: 0;
  top: 0;
}

.calendar-header-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: clamp(0.8rem, 1.8vw, 1.4rem);
}

.calendar-header-title {
  margin: 0;
  color: #030712;
  font-size: clamp(2.35rem, 5vw, 4rem);
  font-weight: 950;
  line-height: 0.95;
  letter-spacing: 0;
}

.calendar-header-divider {
  width: 2px;
  height: clamp(2.1rem, 3.4vw, 3.1rem);
  background: #111827;
}

.calendar-header-month {
  position: relative;
  margin: 0;
  color: #030712;
  font-size: clamp(1.8rem, 3.6vw, 3rem);
  font-weight: 950;
  line-height: 1;
}

.calendar-header-month::after {
  content: "";
  position: absolute;
  left: -0.35rem;
  right: -0.35rem;
  bottom: -0.3rem;
  height: 0.5rem;
  z-index: -1;
  border-radius: 9999px;
  background: rgba(196, 181, 253, 0.8);
  transform: rotate(-1deg);
}

.calendar-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.7rem;
}

.calendar-prev-btn,
.calendar-return-btn {
  min-height: 2.9rem;
  border: 3px solid #111827;
  border-radius: 0.55rem;
  padding: 0.48rem 1.35rem;
  color: #030712;
  font-size: 1rem;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 4px 0 #111827;
  transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}

.calendar-prev-btn {
  background: #ffffff;
}

.calendar-return-btn {
  background: #fde047;
}

.calendar-prev-btn:active,
.calendar-return-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #111827;
}

.calendar-prev-btn:disabled,
.calendar-return-btn:disabled {
  cursor: wait;
  opacity: 0.58;
  transform: none;
  box-shadow: 0 4px 0 #111827;
}

.calendar-error-message,
.calendar-loading-state {
  border: 3px solid #111827;
  border-radius: 0.75rem;
  background: #fff7ed;
  padding: 1rem;
  color: #9a3412;
  font-weight: 900;
}

.calendar-loading-state {
  min-height: 18rem;
  display: grid;
  place-items: center;
  color: #64748b;
  background: rgba(248, 250, 252, 0.9);
}

.calendar-summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.8rem, 1.6vw, 1.25rem);
  max-width: 45rem;
}

.calendar-summary-chip {
  display: grid;
  grid-template-columns: auto auto minmax(2.5rem, auto) auto;
  align-items: center;
  justify-content: start;
  gap: 0.65rem;
  min-height: 4.25rem;
  border: 3px solid #111827;
  border-radius: 0.85rem;
  padding: 0.7rem 1rem;
  color: #111827;
  box-shadow: 0 4px 0 #111827;
}

.calendar-summary-chip-workout {
  background: #f1f8df;
}

.calendar-summary-chip-coffee {
  background: #fff3d8;
}

.calendar-summary-icon {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.6);
}

.calendar-summary-icon img {
  width: 1.75rem;
  height: 1.75rem;
  image-rendering: pixelated;
}

.calendar-summary-label,
.calendar-summary-unit {
  font-size: clamp(0.95rem, 1.4vw, 1.18rem);
  font-weight: 950;
}

.calendar-summary-value {
  color: #4d7c0f;
  font-size: clamp(2rem, 3.2vw, 3.2rem);
  font-weight: 950;
  line-height: 1;
}

.calendar-summary-chip-coffee .calendar-summary-value {
  color: #d97706;
}

.calendar-grid-section {
  min-height: 0;
  flex: 1;
}

.calendar-month-table {
  overflow: hidden;
  border: 2px solid #d1d5db;
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.72);
}

.calendar-weekday-row,
.calendar-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekday {
  min-height: 3.1rem;
  display: grid;
  place-items: center;
  border-right: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
  color: #111827;
  font-size: clamp(0.82rem, 1vw, 1rem);
  font-weight: 950;
}

.calendar-weekday:nth-child(7n) {
  border-right: 0;
}

.calendar-day-cell,
.calendar-neighbor-cell {
  position: relative;
  min-height: clamp(5rem, 8vw, 7.4rem);
  border-right: 1px solid #d1d5db;
  border-bottom: 1px solid #d1d5db;
  background: rgba(255, 255, 255, 0.52);
}

.calendar-day-cell:nth-child(7n),
.calendar-neighbor-cell:nth-child(7n) {
  border-right: 0;
}

.calendar-day-cell {
  padding: clamp(0.55rem, 0.9vw, 0.8rem);
}

.calendar-neighbor-cell {
  padding: 0.75rem;
  color: #a3a3a3;
  font-size: clamp(1rem, 1.4vw, 1.35rem);
  font-weight: 900;
}

.calendar-day-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
}

.calendar-day-number {
  display: inline-grid;
  min-width: 1.8rem;
  min-height: 1.8rem;
  place-items: center;
  color: #030712;
  font-size: clamp(1.05rem, 1.6vw, 1.55rem);
  font-weight: 950;
  line-height: 1;
}

.calendar-workout-chip {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 2px solid #3f6212;
  border-radius: 9999px;
  background: #ecfccb;
  color: #3f6212;
  font-size: 0.92rem;
  font-weight: 950;
  line-height: 1;
}

.calendar-coffee-count {
  position: absolute;
  right: 0.85rem;
  bottom: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #d97706;
  font-size: clamp(0.95rem, 1.4vw, 1.3rem);
  font-weight: 950;
}

.calendar-coffee-icon {
  width: 1.35rem;
  height: 1.35rem;
  image-rendering: pixelated;
}

.calendar-empty-mark {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 1.3rem;
  height: 2px;
  border-radius: 9999px;
  background: #737373;
  transform: translate(-50%, -50%);
}

.calendar-day-cell-today {
  z-index: 1;
  background: #fef3c7;
  box-shadow: inset 0 0 0 3px #111827, 0 4px 0 #111827;
}

.calendar-day-cell-today .calendar-day-number {
  border-radius: 0.35rem;
  background: #fde047;
}

@media (hover: hover) and (pointer: fine) {
  .calendar-day-cell-today {
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .calendar-day-cell-today:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 3px #111827, 0 6px 0 #111827;
  }
}

@media (max-width: 1024px) {
  .calendar-scene-content {
    padding: 0.85rem;
  }

  .calendar-prop-clip,
  .calendar-prop-highlighter,
  .calendar-prop-sticker,
  .calendar-prop-note,
  .calendar-prop-stamp {
    opacity: 0.42;
    transform: scale(0.88);
  }

  .calendar-binder-shell {
    min-height: auto;
  }

  .calendar-paper-surface {
    min-height: auto;
    padding: 1.25rem;
    padding-left: 2rem;
  }

  .calendar-header {
    grid-template-columns: 1fr;
  }

  .calendar-header-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .calendar-board-viewport {
    padding: 0.65rem;
  }

  .calendar-scene {
    border-radius: 1.15rem;
  }

  .calendar-scene-props .calendar-prop-clip,
  .calendar-scene-props .calendar-prop-highlighter,
  .calendar-scene-props .calendar-prop-sticker,
  .calendar-scene-props .calendar-prop-note,
  .calendar-scene-props .calendar-prop-stamp,
  .calendar-scene-props .calendar-prop-stain {
    display: none;
  }

  .calendar-prop-rings {
    left: 0.15rem;
    top: 5.2rem;
    width: 3.8rem;
    opacity: 0.55;
  }

  .calendar-scene-content {
    padding: 0.55rem;
  }

  .calendar-binder-shell {
    padding: 0.3rem 0.35rem 0.45rem 0.55rem;
    border-width: 2px;
    border-radius: 1rem;
  }

  .calendar-paper-surface {
    gap: 0.8rem;
    padding: 0.95rem;
    padding-left: 1.25rem;
    border-width: 3px;
    border-radius: 0.9rem;
  }

  .calendar-header-title-row {
    align-items: flex-start;
    gap: 0.55rem;
  }

  .calendar-header-divider {
    display: none;
  }

  .calendar-header-actions {
    gap: 0.45rem;
  }

  .calendar-prev-btn,
  .calendar-return-btn {
    min-height: 2.3rem;
    padding: 0.35rem 0.72rem;
    border-width: 2px;
    font-size: 0.78rem;
    box-shadow: 0 3px 0 #111827;
  }

  .calendar-summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .calendar-summary-chip {
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.45rem;
    min-height: 3.4rem;
    border-width: 2px;
    padding: 0.5rem;
  }

  .calendar-summary-value {
    font-size: 1.65rem;
  }

  .calendar-summary-unit {
    justify-self: start;
  }

  .calendar-summary-icon {
    width: 2.05rem;
    height: 2.05rem;
    grid-row: span 2;
  }

  .calendar-summary-icon img {
    width: 1.3rem;
    height: 1.3rem;
  }

  .calendar-weekday {
    min-height: 2rem;
    font-size: 0.68rem;
  }

  .calendar-week-prefix {
    display: none;
  }

  .calendar-day-cell,
  .calendar-neighbor-cell {
    min-height: 3.75rem;
  }

  .calendar-day-cell {
    padding: 0.34rem;
  }

  .calendar-neighbor-cell {
    padding: 0.38rem;
    font-size: 0.82rem;
  }

  .calendar-day-number {
    min-width: 1.25rem;
    min-height: 1.25rem;
    font-size: 0.84rem;
  }

  .calendar-workout-chip {
    width: 1.18rem;
    height: 1.18rem;
    border-width: 1px;
    font-size: 0.58rem;
  }

  .calendar-coffee-count {
    right: 0.35rem;
    bottom: 0.32rem;
    gap: 0.12rem;
    font-size: 0.75rem;
  }

  .calendar-coffee-icon {
    width: 0.82rem;
    height: 0.82rem;
  }
}

@media (max-width: 430px) {
  .calendar-summary-row {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-scene *,
  .calendar-scene *::before,
  .calendar-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run CSS test and scene component test**

Run:

```bash
npm test -- __tests__/home-ui-calendar-scene-css.test.ts __tests__/home-ui-calendar-scene.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit CSS**

```bash
git add app/globals.css __tests__/home-ui-calendar-scene-css.test.ts
git commit -m "feat: style calendar desk binder scene"
```

---

### Task 7: Update Existing Calendar Board Behavior Tests

**Files:**
- Modify: `__tests__/calendar-board.test.tsx`
- Test: `__tests__/calendar-board.test.tsx`

- [ ] **Step 1: Update current-month assertions for fixed return button and compact coffee count**

In the first test in `__tests__/calendar-board.test.tsx`, change the test name from:

```ts
it("loads the current month, reuses cached current month data, and renders repeated coffee icons", async () => {
```

to:

```ts
it("loads the current month, reuses cached current month data, and renders compact coffee counts", async () => {
```

Replace the current-month assertions:

```ts
expect(container.textContent).not.toContain("回到本月");
expect(container.querySelectorAll("button")).toHaveLength(1);
```

with:

```ts
expect(container.textContent).toContain("回到本月");
expect(container.querySelectorAll("button")).toHaveLength(2);
expect(container.querySelector(".calendar-return-btn")?.getAttribute("disabled")).not.toBeNull();
```

Replace repeated icon assertions for day 2:

```ts
expect(container.querySelectorAll("img[alt='']").length).toBe(2);
expect(
  getDayCell(container, 2).querySelectorAll('img[src*="/assets/icons/coffee-pixel.svg"]')
    .length,
).toBe(2);
```

with:

```ts
expect(getDayCell(container, 2).querySelector(".calendar-coffee-count")?.textContent).toContain("2");
expect(getDayCell(container, 2).querySelectorAll('img[src*="/assets/icons/coffee-pixel.svg"]').length).toBe(1);
```

Replace later day assertions:

```ts
expect(getDayCell(container, 2).querySelectorAll("img[alt='']").length).toBe(2);
expect(getDayCell(container, 4).querySelectorAll("img[alt='']").length).toBe(0);
```

with:

```ts
expect(getDayCell(container, 2).querySelector(".calendar-coffee-count")?.textContent).toContain("2");
expect(getDayCell(container, 4).querySelector(".calendar-coffee-count")).toBeNull();
expect(getDayCell(container, 4).querySelector(".calendar-empty-mark")).not.toBeNull();
```

- [ ] **Step 2: Update historical month and return-to-current assertions**

Replace:

```ts
expect(container.querySelectorAll("img[alt='']").length).toBe(3);
```

with:

```ts
expect(getDayCell(container, 2).querySelector(".calendar-coffee-count")?.textContent).toContain("2");
expect(getDayCell(container, 3).querySelector(".calendar-coffee-count")?.textContent).toContain("1");
```

Replace final current-month assertions:

```ts
expect(container.textContent).not.toContain("回到本月");
```

with:

```ts
expect(container.textContent).toContain("回到本月");
expect(container.querySelector(".calendar-return-btn")?.getAttribute("disabled")).not.toBeNull();
```

- [ ] **Step 3: Update refresh test coffee assertions**

In the refresh test, replace:

```ts
expect(getDayCell(container, 1).querySelectorAll("img[alt='']").length).toBe(1);
```

with:

```ts
expect(getDayCell(container, 1).querySelector(".calendar-coffee-count")?.textContent).toContain("1");
```

And replace:

```ts
expect(getDayCell(container, 1).querySelectorAll("img[alt='']").length).toBe(2);
```

with:

```ts
expect(getDayCell(container, 1).querySelector(".calendar-coffee-count")?.textContent).toContain("2");
```

- [ ] **Step 4: Run existing calendar board tests**

Run:

```bash
npm test -- __tests__/calendar-board.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit test updates**

```bash
git add __tests__/calendar-board.test.tsx
git commit -m "test: update calendar board visual expectations"
```

---

### Task 8: Run Focused Verification

**Files:**
- No planned file edits.

- [ ] **Step 1: Run all focused calendar and scene tests**

Run:

```bash
npm test -- __tests__/home-ui-calendar-assets.test.ts __tests__/home-ui-calendar-scene.test.tsx __tests__/home-ui-calendar-scene-css.test.ts __tests__/calendar-data.test.ts __tests__/calendar-board.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with TypeScript reporting no errors.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS and Next.js production build completes.

- [ ] **Step 5: Commit any verification-only fixes**

If the verification steps required small fixes, commit only those fixes:

```bash
git add __tests__/home-ui-calendar-assets.test.ts __tests__/home-ui-calendar-scene.test.tsx __tests__/home-ui-calendar-scene-css.test.ts __tests__/calendar-data.test.ts __tests__/calendar-board.test.tsx components/calendar/calendar-data.ts components/calendar/CalendarBoard.tsx components/calendar/CalendarHeader.tsx components/calendar/CalendarGrid.tsx components/calendar/CalendarDayCell.tsx app/globals.css public/assets/home-scenes/calendar
git commit -m "fix: stabilize calendar scene verification"
```

Expected: no commit is created if there are no verification-only fixes.

---

### Task 9: Browser Visual Verification

**Files:**
- Modify only if visual inspection finds a concrete issue:
  - `app/globals.css`
  - `components/calendar/CalendarBoard.tsx`
  - `components/calendar/CalendarHeader.tsx`
  - `components/calendar/CalendarGrid.tsx`
  - `components/calendar/CalendarDayCell.tsx`

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts on `http://localhost:3001`.

- [ ] **Step 2: Open the app and navigate to `牛马日历`**

Use the in-app browser or Playwright against:

```text
http://localhost:3001
```

Expected: after login/session handling, the `牛马日历` tab can be selected and shows the calendar scene.

- [ ] **Step 3: Verify desktop viewport**

Check `1440x900`:

```text
The page resembles design/ui-assets/tab-牛马日历.png: black global nav, yellow active tab, large white binder paper, left rings/desk props, right note/stamp props, title/month row, two summary chips, and continuous month table.
```

Concrete pass criteria:

- Props do not cover `牛马日历`, `2026年X月`, summary chips, buttons, or day cells.
- `上个月` and disabled `回到本月` are visible on the current month.
- Current day uses the yellow highlighted cell and black inner border.
- Empty days show a short dash.
- Coffee days show one coffee icon and a number.

- [ ] **Step 4: Verify wide desktop viewport**

Check `1728x1117`.

Concrete pass criteria:

- Binder paper remains centered and does not stretch beyond a readable width.
- Left and right props remain inside the scene boundary.
- Month table cells keep stable proportions and text does not overlap.

- [ ] **Step 5: Verify tablet viewport**

Check `900x900`.

Concrete pass criteria:

- Header may wrap, but title, month label, and buttons remain readable.
- Props are visually weaker and do not compete with the table.
- Seven calendar columns remain visible without horizontal scrolling.

- [ ] **Step 6: Verify mobile viewport**

Check `390x844`.

Concrete pass criteria:

- Large props are hidden.
- Summary chips either fit two columns or collapse to one column below `430px`.
- Day numbers, `练` chip, coffee count, and empty dash do not overlap.
- No real calendar data is hidden.

- [ ] **Step 7: Verify reduced motion**

Enable reduced motion in the browser/emulation.

Concrete pass criteria:

- No continuous prop motion or hover transform remains.
- Color and disabled-state changes remain visible.

- [ ] **Step 8: Commit browser-polish fixes**

If browser verification required adjustments, commit them:

```bash
git add app/globals.css components/calendar/CalendarBoard.tsx components/calendar/CalendarHeader.tsx components/calendar/CalendarGrid.tsx components/calendar/CalendarDayCell.tsx
git commit -m "fix: polish calendar scene responsive layout"
```

Expected: no commit is created if no browser-polish fixes were needed.

---

## Self-Review Checklist

- Spec coverage: Tasks 1-2 cover all media checklist and compression rules; Tasks 3-7 cover scene structure, header, summary chips, grid, day cells, responsive CSS, and updated tests; Tasks 8-9 cover verification.
- No business behavior changes: the plan does not touch Prisma, API routes, `fetchCalendarState`, auth, reducer actions, or calendar refresh dispatch.
- Type consistency: `CalendarGridCell` is only `neighbor | day`; `CalendarDayCell` continues to receive only `kind: "day"` cells; neighbor cells render in `CalendarGrid`.
- Asset path consistency: all new code references `/assets/home-scenes/calendar/<filename>`.
- Visual-only data consistency: `neighbor` cells include `day` and `monthRelation` only, so they cannot accidentally render workout or coffee state.
