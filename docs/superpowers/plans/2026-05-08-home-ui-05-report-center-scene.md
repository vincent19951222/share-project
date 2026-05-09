# Home UI 05 Report Center Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `战报中心` tab into the approved month-report editor scene using only UI, layout, motion, and media asset changes while preserving all existing report, coffee, weekly report, and admin workflows.

**Architecture:** Keep the existing `ReportCenter` data flow, API calls, and report computation intact. Add compressed raster assets under `public/assets/home-scenes/report/` for the editor desk scene, preserve the existing coffee cup and receipt artwork already used by `CoffeeReportPanel`, then wrap the tab in a `report-scene / background / props / content` shell and restyle `ReportHeader`, `Milestones`, `TrendChart`, `CoffeeReportPanel`, `GamificationWeeklyReportPanel`, and `WeeklyReportAdminPanel` to fit the same editorial desk scene. Do not move report fetching into new services and do not change tab routing.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind utility classes plus `app/globals.css`, Vitest + jsdom, built-in `imagegen`, ImageMagick `magick`, `cwebp`.

---

## Scope Guardrails

- Do not modify Prisma schema, database data, API routes, `buildReportData()`, weekly report publish logic, or admin permissions.
- Do not add new metrics, filters, date pickers, PDF export, AI summary, or new admin actions.
- Keep all current strings that come from report data, coffee data, or weekly report APIs.
- Keep `GamificationWeeklyReportPanel` as the owner of weekly report fetch / publish state.
- Keep `WeeklyReportAdminPanel` visible only for admins, but move it into the same visual system.
- Keep the existing coffee inset artwork at `/assets/report-center/coffee-cup-label.png` and `/assets/report-center/coffee-receipt.png`.
- Project code must reference only `/assets/home-scenes/report/<filename>` for new report-scene media.
- Decorative assets may not carry business state. Data remains text, SVG, or CSS-driven.

## File Structure

- Create: `public/assets/home-scenes/report/`
  - Final compressed report scene assets.
- Create: `__tests__/home-ui-report-assets.test.ts`
  - Asset existence and size budget contract.
- Create: `__tests__/home-ui-report-scene.test.tsx`
  - Report scene shell, prop image, and admin layout assertions.
- Create: `__tests__/home-ui-report-scene-css.test.ts`
  - Scene shell, paper surface, responsive, and reduced-motion CSS contract.
- Modify: `__tests__/home-ui-density-contract.test.ts`
  - Add one-screen stage assertions for the report scene.
- Modify: `__tests__/report-center-component.test.tsx`
  - Update image path expectations and scene-level layout assertions.
- Modify: `__tests__/gamification-weekly-report-panel.test.tsx`
  - Assert the editorial weekly paper and sticky highlight rail structure.
- Modify: `__tests__/coffee-report-panel.test.tsx`
  - Update coffee inset asset path expectations.
- Modify: `components/report-center/ReportCenter.tsx`
  - Add report scene shell, outer prop layer, and section layout.
- Modify: `components/report-center/ReportHeader.tsx`
  - Replace dual-card hero with a single editorial header strip.
- Modify: `components/report-center/Milestones.tsx`
  - Convert metric cards into prototype-style horizontal stat tiles.
- Modify: `components/report-center/TrendChart.tsx`
  - Restyle the main chart paper and today marker panel.
- Modify: `components/report-center/CoffeeReportPanel.tsx`
  - Preserve the current coffee inset artwork and tighten the attached panel shell around it.
- Modify: `components/report-center/GamificationWeeklyReportPanel.tsx`
  - Convert the weekly report into a bottom-left paper plus right-side highlights rail.
- Modify: `components/report-center/WeeklyReportAdminPanel.tsx`
  - Convert the admin controls into an editorial proofreading sheet.
- Modify: `app/globals.css`
  - Add report scene shell, props, paper surfaces, sticky notes, responsive rules, and reduced-motion overrides.

## Task 1: Add Failing Asset And Scene Contract Tests

**Files:**
- Create: `__tests__/home-ui-report-assets.test.ts`
- Create: `__tests__/home-ui-report-scene.test.tsx`
- Modify: `__tests__/report-center-component.test.tsx`

- [ ] **Step 1: Create the failing asset contract test**

Create `__tests__/home-ui-report-assets.test.ts`:

```ts
import { existsSync, statSync } from "fs";
import { describe, expect, it } from "vitest";

const requiredAssets = [
  { file: "editor-desk-bg.webp", maxBytes: 420 * 1024 },
  { file: "binder-clip-left.webp", maxBytes: 90 * 1024 },
  { file: "keep-going-stamp.webp", maxBytes: 80 * 1024 },
  { file: "mini-chart-slip.webp", maxBytes: 120 * 1024 },
  { file: "vault-safe-yellow.webp", maxBytes: 140 * 1024 },
  { file: "discipline-note.webp", maxBytes: 120 * 1024 },
  { file: "no-excuses-note.webp", maxBytes: 120 * 1024 },
  { file: "bar-chart-note.webp", maxBytes: 120 * 1024 },
  { file: "stronger-stamp.webp", maxBytes: 90 * 1024 },
  { file: "focus-marker.webp", maxBytes: 140 * 1024 },
];

describe("home report scene assets", () => {
  it("ships compressed project-bound WebP assets for the report scene", () => {
    for (const asset of requiredAssets) {
      const path = `public/assets/home-scenes/report/${asset.file}`;

      expect(existsSync(path), `${asset.file} should exist in public assets`).toBe(true);
      expect(statSync(path).size, `${asset.file} should stay within its size budget`).toBeLessThanOrEqual(
        asset.maxBytes,
      );
    }
  });
});
```

- [ ] **Step 2: Create the failing scene shell test**

Create `__tests__/home-ui-report-scene.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { CoffeeProvider } from "@/lib/coffee-store";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const initialState: BoardState = {
  members: [
    { id: "u1", name: "li", avatarKey: "male1", assetBalance: 120, seasonIncome: 30, slotContribution: 2 },
    { id: "u2", name: "luo", avatarKey: "male2", assetBalance: 80, seasonIncome: 20, slotContribution: 1 },
  ],
  gridData: [
    [true, true, false],
    [true, false, true],
  ],
  teamVaultTotal: 1450,
  currentUser: {
    assetBalance: 120,
    currentStreak: 6,
    nextReward: 20,
    seasonIncome: 30,
    isAdmin: true,
  },
  activeSeason: {
    id: "season-1",
    monthKey: "2026-04",
    goalName: "减脂挑战",
    targetSlots: 5,
    filledSlots: 3,
    contributions: [
      { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 30 },
      { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 20 },
    ],
  },
  today: 3,
  totalDays: 3,
  logs: [],
  activeTab: "dash",
  currentUserId: "u1",
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

function weeklySnapshot() {
  return {
    teamId: "team_1",
    weekStartDayKey: "2026-04-20",
    weekEndDayKey: "2026-04-26",
    generatedAt: "2026-04-26T02:00:00.000Z",
    published: true,
    publishedDynamicId: "dynamic_1",
    metrics: {},
    metricCards: [
      { key: "task-rate", label: "四维完成率", value: "50%", helper: "28/56 个任务完成", tone: "default" },
      { key: "tickets-earned", label: "本周发券", value: "10", helper: "健身 5 · 四维 4 · 补券 1", tone: "highlight" },
      { key: "draws", label: "抽奖次数", value: "3", helper: "单抽 2 · 十连 1", tone: "success" },
      { key: "social-response", label: "弱社交响应", value: "100%", helper: "2/2 个邀请有回应", tone: "success" },
    ],
    summaryCards: [{ key: "rhythm", title: "补给站节奏", body: "本周四维任务完成率 50%。", tone: "default" }],
    highlights: [
      {
        id: "dynamic_1",
        title: "全员在周二达成最高打卡率 87%！",
        summary: "这条高光会挂到右侧便签墙。",
        sourceType: "team_dynamic",
        sourceId: "dynamic_1",
        occurredAt: "2026-04-23T04:00:00.000Z",
      },
    ],
  };
}

describe("home report scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00+08:00"));
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === "/api/coffee/state") {
          return Promise.resolve(
            jsonResponse({
              snapshot: {
                members: [
                  { id: "u1", name: "li", avatarKey: "male1" },
                  { id: "u2", name: "luo", avatarKey: "male2" },
                ],
                gridData: [
                  Array.from({ length: 30 }, (_, index) => ({ cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 1, 2][index] ?? 0 })),
                  Array.from({ length: 30 }, (_, index) => ({ cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 3, 1][index] ?? 0 })),
                ],
                today: 24,
                totalDays: 30,
                currentUserId: "u1",
                stats: {
                  todayTotalCups: 3,
                  todayDrinkers: 2,
                  currentUserTodayCups: 2,
                  coffeeKing: { userId: "u1", name: "li", cups: 2 },
                },
              },
            }),
          );
        }
        if (String(input) === "/api/gamification/reports/weekly") {
          return Promise.resolve(jsonResponse({ snapshot: weeklySnapshot() }));
        }
        if (String(input) === "/api/reports/weekly/draft") {
          return Promise.resolve(jsonResponse({ draft: null }));
        }
        if (String(input) === "/api/reports/weekly/publish") {
          return Promise.resolve(jsonResponse({ dynamic: { id: "weekly-dynamic-1" } }));
        }
        throw new Error(`Unexpected fetch call: ${String(input)}`);
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
    vi.useRealTimers();
  });

  it("renders the layered report editor scene with report-bound props", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <CoffeeProvider>
            <ReportCenter />
          </CoffeeProvider>
        </BoardProvider>,
      );
      await Promise.resolve();
    });

    const scene = container.querySelector(".report-scene");
    const propSources = Array.from(container.querySelectorAll(".report-scene-props img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(scene).not.toBeNull();
    expect(container.querySelector(".report-scene-background")).not.toBeNull();
    expect(container.querySelector(".report-scene-props")).not.toBeNull();
    expect(container.querySelector(".report-scene-content")).not.toBeNull();
    expect(container.querySelector(".report-scene-analysis")).not.toBeNull();
    expect(container.querySelector(".report-scene-bottom")).not.toBeNull();
    expect(container.querySelector(".report-scene-admin")).not.toBeNull();
    expect(propSources).toContain("/assets/home-scenes/report/binder-clip-left.webp");
    expect(propSources).toContain("/assets/home-scenes/report/discipline-note.webp");
    expect(propSources).toContain("/assets/home-scenes/report/focus-marker.webp");
    expect(container.textContent).toContain("5月牛马战报");
    expect(container.textContent).toContain("本周高光");
    expect(container.textContent).toContain("本周周报");
  });
});
```

- [ ] **Step 3: Update the existing component-level smoke test to the new asset paths**

Modify `__tests__/report-center-component.test.tsx`:

```tsx
expect(container.querySelector(".report-scene")).not.toBeNull();
expect(container.querySelector(".report-scene-content")).not.toBeNull();
expect(container.querySelector("img[src='/assets/report-center/coffee-cup-label.png']")).not.toBeNull();
expect(container.querySelector("img[src='/assets/report-center/coffee-receipt.png']")).not.toBeNull();
```

Replace the old `/assets/report-center/*.png` expectations with the block above.

- [ ] **Step 4: Run the report tests and verify they fail**

Run:

```bash
npm test -- __tests__/home-ui-report-assets.test.ts __tests__/home-ui-report-scene.test.tsx __tests__/report-center-component.test.tsx
```

Expected: FAIL because the new desk-scene assets and scene shell classes do not exist yet.

- [ ] **Step 5: Commit the failing test baseline**

```bash
git add __tests__/home-ui-report-assets.test.ts __tests__/home-ui-report-scene.test.tsx __tests__/report-center-component.test.tsx
git commit -m "test: add report scene contracts"
```

## Task 2: Generate And Compress The Core Report Scene Assets

**Files:**
- Create: `public/assets/home-scenes/report/editor-desk-bg.webp`
- Create: `public/assets/home-scenes/report/binder-clip-left.webp`
- Create: `public/assets/home-scenes/report/keep-going-stamp.webp`
- Create: `public/assets/home-scenes/report/mini-chart-slip.webp`
- Create: `public/assets/home-scenes/report/vault-safe-yellow.webp`
- Create: `public/assets/home-scenes/report/discipline-note.webp`
- Create: `public/assets/home-scenes/report/no-excuses-note.webp`
- Create: `public/assets/home-scenes/report/bar-chart-note.webp`
- Create: `public/assets/home-scenes/report/stronger-stamp.webp`
- Create: `public/assets/home-scenes/report/focus-marker.webp`

**Asset processing rules:**
- `editor-desk-bg.webp` is the only opaque background asset.
- Every other file in this task must be generated against a flat chroma-key background, cut to alpha PNG locally, then compressed to alpha WebP.
- Do not store raw generations in the repo.
- Regenerate any asset that carries obvious AI artifacts, blurred text, or jagged silhouette edges.

- [ ] **Step 1: Create staging and final directories**

Run:

```bash
mkdir -p /private/tmp/share-project-home-scenes-report/raw /private/tmp/share-project-home-scenes-report/alpha /private/tmp/share-project-home-scenes-report/resized public/assets/home-scenes/report
```

Expected: all staging directories plus the final `public/assets/home-scenes/report` directory exist.

- [ ] **Step 2: Generate `editor-desk-bg`**

Use `imagegen` with this prompt and copy the selected output to `/private/tmp/share-project-home-scenes-report/raw/editor-desk-bg.png`:

```text
Use case: stylized-concept
Asset type: web app scene background for the 战报中心 tab
Primary request: a clean editorial desk paper background for a playful brutalist Chinese team report dashboard
Scene/backdrop: off-white dotted paper desk surface, subtle paper grain, soft shadow falloff around edges, wide quiet center space for cards
Style/medium: polished 2D raster illustration, crisp edges, light paper texture, not photorealistic
Composition/framing: 16:9 landscape background, no people, no centered hero object, no UI
Lighting/mood: bright indoor desk lighting, tidy but energetic
Color palette: warm white, soft gray, tiny muted yellow accents, black shadow accents
Constraints: no readable text, no watermarks, no large objects, no dark vignette, no notebook rings
```

- [ ] **Step 3: Generate the header and desk props**

Use `imagegen` one file at a time and copy selected outputs to the matching raw paths:

```text
binder-clip-left:
Use case: stylized-concept
Asset type: desk prop for a web app scene
Primary request: a chunky black binder clip
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Style/medium: brutalist 2D raster illustration, crisp edge, subtle metallic sheen
Composition/framing: object angled slightly left, centered, clean silhouette
Constraints: no text, no watermark, do not use #00ff00 inside the clip

keep-going-stamp:
Use case: stylized-concept
Asset type: editorial stamp sticker for a report dashboard
Primary request: a red slanted keep going stamp sticker
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Text (verbatim): "KEEP GOING!"
Style/medium: print-like 2D raster stamp, distressed edges, crisp lettering
Constraints: only the exact text "KEEP GOING!"; no extra text; do not use #00ff00 inside the object; no watermark

mini-chart-slip:
Use case: stylized-concept
Asset type: mini chart paper prop
Primary request: a small report paper showing a simple pie and bar chart
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Style/medium: 2D paper illustration, light fold shadow, crisp edge
Constraints: no readable text, no watermark, do not use #00ff00 in the paper

vault-safe-yellow:
Use case: stylized-concept
Asset type: vault illustration for a web app report header
Primary request: a yellow cartoon-safe with thick black outline and coin emblem
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Style/medium: polished 2D raster illustration, playful brutalist, crisp edge
Constraints: no text, no watermark, do not use #00ff00 in the safe

discipline-note:
Use case: stylized-concept
Asset type: yellow motivational sticky note
Primary request: a taped yellow note with bold gym poster typography
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Text (verbatim): "DISCIPLINE\nBEATS\nMOTIVATION"
Style/medium: paper note illustration with light texture and tape
Constraints: only the exact text above; no extra text; no watermark; do not use #00ff00 in the note or tape

no-excuses-note:
Use case: stylized-concept
Asset type: round stamped note paper
Primary request: a torn white note with a round red stamp
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Text (verbatim): "NO EXCUSES\nJUST\nRESULTS"
Style/medium: paper illustration with vintage red stamp ring
Constraints: only the exact text above; no extra text; no watermark; do not use #00ff00 in the note

bar-chart-note:
Use case: stylized-concept
Asset type: small analytics paper prop
Primary request: a torn paper slip with a blue bar chart and red uptrend line
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Style/medium: clean 2D raster paper prop, crisp edge, light fold shadow
Constraints: no readable text, no watermark, do not use #00ff00 in the paper

stronger-stamp:
Use case: stylized-concept
Asset type: circular stamp seal for a dashboard scene
Primary request: a faded circular fitness stamp with dumbbell center
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Text (verbatim): "STRONGER\nTOGETHER"
Style/medium: distressed 2D ink stamp, imperfect print edge
Constraints: only the exact text above; no extra text; no watermark; do not use #00ff00 in the stamp

focus-marker:
Use case: stylized-concept
Asset type: desk marker pen prop
Primary request: a white marker pen with black cap and red cap end
Scene/backdrop: isolated object on a perfectly flat solid #00ff00 chroma-key background, generous padding
Text (verbatim): "FOCUS ON\nPROGRESS"
Style/medium: clean 2D product illustration, crisp brutalist edge
Constraints: only the exact text above; no extra text; no watermark; do not use #00ff00 in the pen
```

- [ ] **Step 4: Remove chroma-key backgrounds locally**

Run:

```bash
magick /private/tmp/share-project-home-scenes-report/raw/binder-clip-left.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/binder-clip-left.png
magick /private/tmp/share-project-home-scenes-report/raw/keep-going-stamp.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/keep-going-stamp.png
magick /private/tmp/share-project-home-scenes-report/raw/mini-chart-slip.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/mini-chart-slip.png
magick /private/tmp/share-project-home-scenes-report/raw/vault-safe-yellow.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/vault-safe-yellow.png
magick /private/tmp/share-project-home-scenes-report/raw/discipline-note.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/discipline-note.png
magick /private/tmp/share-project-home-scenes-report/raw/no-excuses-note.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/no-excuses-note.png
magick /private/tmp/share-project-home-scenes-report/raw/bar-chart-note.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/bar-chart-note.png
magick /private/tmp/share-project-home-scenes-report/raw/stronger-stamp.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/stronger-stamp.png
magick /private/tmp/share-project-home-scenes-report/raw/focus-marker.png -alpha on -fuzz 2% -transparent "#00FF00" /private/tmp/share-project-home-scenes-report/alpha/focus-marker.png
```

Expected: nine transparent PNGs appear under `/private/tmp/share-project-home-scenes-report/alpha/`.

- [ ] **Step 5: Resize and compress the core assets into `public/`**

Run:

```bash
magick /private/tmp/share-project-home-scenes-report/raw/editor-desk-bg.png -resize 1672x941^ -gravity center -extent 1672x941 /private/tmp/share-project-home-scenes-report/resized/editor-desk-bg.png
cwebp -q 82 /private/tmp/share-project-home-scenes-report/resized/editor-desk-bg.png -o public/assets/home-scenes/report/editor-desk-bg.webp

magick /private/tmp/share-project-home-scenes-report/alpha/binder-clip-left.png -resize 280x280 /private/tmp/share-project-home-scenes-report/resized/binder-clip-left.png
cwebp -q 88 /private/tmp/share-project-home-scenes-report/resized/binder-clip-left.png -o public/assets/home-scenes/report/binder-clip-left.webp

magick /private/tmp/share-project-home-scenes-report/alpha/keep-going-stamp.png -resize 360x200 /private/tmp/share-project-home-scenes-report/resized/keep-going-stamp.png
cwebp -q 88 /private/tmp/share-project-home-scenes-report/resized/keep-going-stamp.png -o public/assets/home-scenes/report/keep-going-stamp.webp

magick /private/tmp/share-project-home-scenes-report/alpha/mini-chart-slip.png -resize 260x260 /private/tmp/share-project-home-scenes-report/resized/mini-chart-slip.png
cwebp -q 86 /private/tmp/share-project-home-scenes-report/resized/mini-chart-slip.png -o public/assets/home-scenes/report/mini-chart-slip.webp

magick /private/tmp/share-project-home-scenes-report/alpha/vault-safe-yellow.png -resize 360x300 /private/tmp/share-project-home-scenes-report/resized/vault-safe-yellow.png
cwebp -q 88 /private/tmp/share-project-home-scenes-report/resized/vault-safe-yellow.png -o public/assets/home-scenes/report/vault-safe-yellow.webp

magick /private/tmp/share-project-home-scenes-report/alpha/discipline-note.png -resize 320x420 /private/tmp/share-project-home-scenes-report/resized/discipline-note.png
cwebp -q 84 /private/tmp/share-project-home-scenes-report/resized/discipline-note.png -o public/assets/home-scenes/report/discipline-note.webp

magick /private/tmp/share-project-home-scenes-report/alpha/no-excuses-note.png -resize 320x320 /private/tmp/share-project-home-scenes-report/resized/no-excuses-note.png
cwebp -q 84 /private/tmp/share-project-home-scenes-report/resized/no-excuses-note.png -o public/assets/home-scenes/report/no-excuses-note.webp

magick /private/tmp/share-project-home-scenes-report/alpha/bar-chart-note.png -resize 280x320 /private/tmp/share-project-home-scenes-report/resized/bar-chart-note.png
cwebp -q 84 /private/tmp/share-project-home-scenes-report/resized/bar-chart-note.png -o public/assets/home-scenes/report/bar-chart-note.webp

magick /private/tmp/share-project-home-scenes-report/alpha/stronger-stamp.png -resize 220x220 /private/tmp/share-project-home-scenes-report/resized/stronger-stamp.png
cwebp -q 82 /private/tmp/share-project-home-scenes-report/resized/stronger-stamp.png -o public/assets/home-scenes/report/stronger-stamp.webp

magick /private/tmp/share-project-home-scenes-report/alpha/focus-marker.png -resize 280x520 /private/tmp/share-project-home-scenes-report/resized/focus-marker.png
cwebp -q 86 /private/tmp/share-project-home-scenes-report/resized/focus-marker.png -o public/assets/home-scenes/report/focus-marker.webp
```

Expected: the ten WebP files exist under `public/assets/home-scenes/report/`.

- [ ] **Step 6: Run the asset contract test and verify it passes**

Run:

```bash
npm test -- __tests__/home-ui-report-assets.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the core scene assets**

```bash
git add public/assets/home-scenes/report __tests__/home-ui-report-assets.test.ts
git commit -m "feat: add report scene core assets"
```

## Task 3: Build The Report Scene Shell, Header, And Metric Tiles

**Files:**
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `components/report-center/ReportHeader.tsx`
- Modify: `components/report-center/Milestones.tsx`
- Modify: `__tests__/home-ui-report-scene.test.tsx`
- Modify: `__tests__/report-center-component.test.tsx`

- [ ] **Step 1: Expand the scene test to assert the new section wrappers**

Modify `__tests__/home-ui-report-scene.test.tsx` by adding:

```tsx
expect(container.querySelector(".report-scene-header")).not.toBeNull();
expect(container.querySelector(".report-scene-metrics")).not.toBeNull();
expect(container.querySelector(".report-header-sheet")).not.toBeNull();
expect(container.querySelector(".report-metric-tile")).not.toBeNull();
expect(container.querySelector(".report-header-safe img[src='/assets/home-scenes/report/vault-safe-yellow.webp']")).not.toBeNull();
expect(container.querySelector(".report-header-stamp img[src='/assets/home-scenes/report/keep-going-stamp.webp']")).not.toBeNull();
```

- [ ] **Step 2: Run the focused scene test and verify it fails**

Run:

```bash
npm test -- __tests__/home-ui-report-scene.test.tsx
```

Expected: FAIL because the report scene wrappers and header assets are not rendered yet.

- [ ] **Step 3: Replace `ReportCenter.tsx` with the scene shell**

Update `components/report-center/ReportCenter.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { useCoffee } from "@/lib/coffee-store";
import { useBoard } from "@/lib/store";
import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { CoffeeReportPanel } from "./CoffeeReportPanel";
import { GamificationWeeklyReportPanel } from "./GamificationWeeklyReportPanel";
import { TrendChart } from "./TrendChart";
import { WeeklyReportAdminPanel } from "./WeeklyReportAdminPanel";
import { buildReportData } from "./report-data";

const sceneProps = [
  { src: "/assets/home-scenes/report/binder-clip-left.webp", className: "report-prop report-prop-clip-left" },
  { src: "/assets/home-scenes/report/discipline-note.webp", className: "report-prop report-prop-note-left" },
  { src: "/assets/home-scenes/report/no-excuses-note.webp", className: "report-prop report-prop-note-right" },
  { src: "/assets/home-scenes/report/bar-chart-note.webp", className: "report-prop report-prop-chart-right" },
  { src: "/assets/home-scenes/report/stronger-stamp.webp", className: "report-prop report-prop-stamp-left" },
  { src: "/assets/home-scenes/report/focus-marker.webp", className: "report-prop report-prop-marker-right" },
] as const;

export function ReportCenter() {
  const { state } = useBoard();
  const coffeeState = useCoffee();
  const report = useMemo(
    () => buildReportData(state, new Date(), coffeeState.snapshot),
    [coffeeState.snapshot, state],
  );

  return (
    <section className="report-scene absolute inset-0">
      <div className="report-scene-background" aria-hidden="true">
        <img src="/assets/home-scenes/report/editor-desk-bg.webp" alt="" className="report-scene-desk" />
      </div>
      <div className="report-scene-props" aria-hidden="true">
        {sceneProps.map((prop) => (
          <img key={prop.src} src={prop.src} alt="" className={prop.className} />
        ))}
      </div>

      <div className="report-scene-content">
        <div className="report-scene-header">
          <ReportHeader
            title={report.title}
            summary={report.summary}
            teamVault={report.teamVault}
            metrics={report.metrics}
          />
        </div>

        <div className="report-scene-metrics">
          <Milestones metrics={report.metrics} />
        </div>

        <div className="report-scene-analysis">
          <TrendChart dailyPoints={report.dailyPoints} peakDay={report.peakDay} lowDay={report.lowDay} />
          <CoffeeReportPanel
            coffee={report.coffee}
            loading={!coffeeState.snapshot && !coffeeState.error}
            error={coffeeState.error}
          />
        </div>

        <div className="report-scene-bottom">
          <GamificationWeeklyReportPanel isAdmin={state.currentUser?.isAdmin ?? false} />
        </div>

        {state.currentUser?.isAdmin ? (
          <div className="report-scene-admin">
            <WeeklyReportAdminPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Replace `ReportHeader.tsx` with a single editorial header sheet**

Update `components/report-center/ReportHeader.tsx`:

```tsx
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportData } from "./report-data";

interface ReportHeaderProps {
  title: string;
  summary: string;
  teamVault: ReportData["teamVault"];
  metrics: ReportData["metrics"];
}

export function ReportHeader({ title, summary, teamVault, metrics }: ReportHeaderProps) {
  const completionMetric = metrics.find((metric) => metric.label === "团队完成率");
  const totalPunchMetric = metrics.find((metric) => metric.label === "总打卡次数");

  return (
    <section className="report-header-sheet">
      <div className="report-header-copy">
        <div className="report-header-pill">本月战况</div>
        <h1>{title}</h1>
        <p className="report-header-summary">
          {summary}
          <span className="report-header-medal" dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
        <div className="report-header-mobile-kpis">
          <div className="report-header-mobile-kpi">
            <span>牛马金库</span>
            <strong>{teamVault.current.toLocaleString("zh-CN")}</strong>
          </div>
          {completionMetric ? (
            <div className="report-header-mobile-kpi">
              <span>{completionMetric.label}</span>
              <strong>{completionMetric.value}</strong>
            </div>
          ) : null}
          {totalPunchMetric ? (
            <div className="report-header-mobile-kpi">
              <span>{totalPunchMetric.label}</span>
              <strong>{totalPunchMetric.value}</strong>
            </div>
          ) : null}
        </div>
        <span className="report-header-stamp">
          <img src="/assets/home-scenes/report/keep-going-stamp.webp" alt="" />
        </span>
        <span className="report-header-slip">
          <img src="/assets/home-scenes/report/mini-chart-slip.webp" alt="" />
        </span>
      </div>

      <div className="report-header-vault">
        <div className="report-header-safe">
          <img src="/assets/home-scenes/report/vault-safe-yellow.webp" alt="" />
        </div>
        <div className="report-header-vault-copy">
          <h2>牛马金库</h2>
          <div className="report-header-vault-value">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
            <strong>{teamVault.current.toLocaleString("zh-CN")}</strong>
          </div>
          <p>{teamVault.helper}</p>
          <small>每一次打卡都是对自己的投资！</small>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Replace `Milestones.tsx` with editorial stat tiles**

Update `components/report-center/Milestones.tsx`:

```tsx
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportMetric } from "./report-data";

interface MilestonesProps {
  metrics: ReportMetric[];
}

const cardSkins = {
  "团队完成率": { accent: "report-metric-accent-green", icon: SvgIcons.target },
  "总打卡次数": { accent: "report-metric-accent-blue", icon: SvgIcons.chart },
  全勤日: { accent: "report-metric-accent-yellow", icon: SvgIcons.medal },
  "本月高光": { accent: "report-metric-accent-red", icon: SvgIcons.msgHighlight },
} as const;

export function Milestones({ metrics }: MilestonesProps) {
  return (
    <section className="report-metrics-grid">
      {metrics.map((metric) => {
        const skin = cardSkins[metric.label as keyof typeof cardSkins] ?? {
          accent: "report-metric-accent-gray",
          icon: SvgIcons.chart,
        };

        return (
          <article key={metric.label} className={`report-metric-tile ${skin.accent}`}>
            <div className="report-metric-rail" aria-hidden="true" />
            <div className="report-metric-icon" dangerouslySetInnerHTML={{ __html: skin.icon }} />
            <div className="report-metric-copy">
              <h3>{metric.label}</h3>
              <div className="report-metric-value-row">
                <strong>{metric.value}</strong>
                <span>{metric.helper}</span>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 6: Run the scene and component tests and verify they pass**

Run:

```bash
npm test -- __tests__/home-ui-report-scene.test.tsx __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the report shell, header, and milestones work**

```bash
git add components/report-center/ReportCenter.tsx components/report-center/ReportHeader.tsx components/report-center/Milestones.tsx __tests__/home-ui-report-scene.test.tsx __tests__/report-center-component.test.tsx
git commit -m "feat: add report scene shell and header"
```

## Task 4: Restyle The Trend Chart And Coffee Inset

**Files:**
- Modify: `components/report-center/TrendChart.tsx`
- Modify: `components/report-center/CoffeeReportPanel.tsx`
- Modify: `__tests__/coffee-report-panel.test.tsx`

- [ ] **Step 1: Tighten the coffee inset test to the new asset paths**

Modify `__tests__/coffee-report-panel.test.tsx`:

```tsx
expect(container.querySelector("img[src='/assets/report-center/coffee-cup-label.png']")).not.toBeNull();
expect(container.querySelector("img[src='/assets/report-center/coffee-receipt.png']")).not.toBeNull();
```

Keep the zero-cup height assertion unchanged.

- [ ] **Step 2: Run the focused chart and coffee tests and verify they fail**

Run:

```bash
npm test -- __tests__/coffee-report-panel.test.tsx __tests__/report-center-component.test.tsx
```

Expected: FAIL because the new coffee shell classes do not exist yet.

- [ ] **Step 3: Restyle `TrendChart.tsx` as the main report paper**

Update the outer structure in `components/report-center/TrendChart.tsx`:

```tsx
return (
  <section className="report-chart-sheet">
    <div className="report-chart-sheet-header">
      <div className="report-chart-heading">
        <h2>活跃趋势</h2>
        <span className="report-chart-tag">每日打卡人数</span>
      </div>
      <div className="report-chart-badges">
        <span className="report-chart-badge report-chart-badge-peak">
          峰值 {peakDay ? `${peakDay.count} 人 (${peakDay.day}日)` : "暂无"}
        </span>
        <span className="report-chart-badge report-chart-badge-low">
          低谷 {lowDay ? `${lowDay.count} 人 (${lowDay.day}日)` : "暂无"}
        </span>
      </div>
    </div>

    <div className="report-chart-paper">
      {/* keep the existing SVG logic exactly as-is */}
    </div>

    <div className="report-chart-footer">
      <div className="report-chart-note report-chart-note-peak">
        峰值：{peakDay ? `第 ${peakDay.day} 天 · ${peakDay.count} 人打卡` : "暂无数据"}
      </div>
      <div className="report-chart-note report-chart-note-low">
        低谷：{lowDay ? `第 ${lowDay.day} 天 · ${lowDay.count} 人打卡` : "暂无数据"}
      </div>
    </div>
  </section>
);
```

Keep all point, path, and label calculations unchanged.

- [ ] **Step 4: Preserve `CoffeeReportPanel.tsx` artwork and tighten the inset shell**

Update `components/report-center/CoffeeReportPanel.tsx`:

```tsx
const cupAssetPath = "/assets/report-center/coffee-cup-label.png";
const receiptAssetPath = "/assets/report-center/coffee-receipt.png";
```

Replace the outer wrapper with:

```tsx
return (
  <aside className="report-coffee-sheet">
    <div className="report-coffee-sheet-header">
      <div>
        <div className="report-coffee-pill">团队咖啡打卡</div>
        <h2 className="report-coffee-title">咖啡能量站</h2>
        <p className="report-coffee-wave-label">近 7 天咖啡因波形</p>
      </div>
    </div>

    <CoffeeReceiptScene coffee={coffee} loading={loading} error={error} />
    <CoffeeBars days={coffee.recentDays} />
  </aside>
);
```

Update the `CoffeeBars()` wrapper to:

```tsx
<div className="report-coffee-bars">
  <div className="report-coffee-bars-header">
    <div className="report-coffee-bars-eyebrow">Caffeine Wave</div>
    <div className="report-coffee-bars-subtitle">近 7 天咖啡因波形</div>
  </div>
  {/* keep the existing bar rendering logic */}
</div>
```

- [ ] **Step 5: Run the coffee and report tests and verify they pass**

Run:

```bash
npm test -- __tests__/coffee-report-panel.test.tsx __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the chart and coffee inset work**

```bash
git add components/report-center/TrendChart.tsx components/report-center/CoffeeReportPanel.tsx __tests__/coffee-report-panel.test.tsx __tests__/report-center-component.test.tsx
git commit -m "feat: restyle report chart and coffee inset"
```

## Task 5: Convert Weekly Report And Admin Controls Into Editorial Bottom Sheets

**Files:**
- Modify: `components/report-center/GamificationWeeklyReportPanel.tsx`
- Modify: `components/report-center/WeeklyReportAdminPanel.tsx`
- Modify: `__tests__/gamification-weekly-report-panel.test.tsx`
- Modify: `__tests__/report-center-component.test.tsx`

- [ ] **Step 1: Tighten the weekly report test to the new paper-and-sticky layout**

Modify `__tests__/gamification-weekly-report-panel.test.tsx`:

```tsx
expect(container.querySelector(".report-weekly-sheet")).not.toBeNull();
expect(container.querySelector(".report-weekly-highlights")).not.toBeNull();
expect(container.querySelector(".report-weekly-highlight-note")).not.toBeNull();
```

Keep the existing content assertions for `牛马补给周报`, `四维完成率`, and admin buttons.

- [ ] **Step 2: Run the weekly report tests and verify they fail**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-panel.test.tsx __tests__/report-center-component.test.tsx
```

Expected: FAIL because the new weekly sheet classes and highlight rail do not exist yet.

- [ ] **Step 3: Refactor `GamificationWeeklyReportPanel.tsx` into a left paper + right note rail**

Update the return block in `components/report-center/GamificationWeeklyReportPanel.tsx`:

```tsx
return (
  <section className="report-weekly-layout" aria-labelledby="game-weekly-report-title">
    <div className="report-weekly-sheet">
      <div className="report-weekly-header">
        <div>
          <p className="report-weekly-eyebrow">Weekly Supply</p>
          <h2 id="game-weekly-report-title">牛马补给周报</h2>
          <p className="report-weekly-window">
            {snapshot.weekStartDayKey} 至 {snapshot.weekEndDayKey}
          </p>
        </div>
        <span className="report-weekly-status">{statusText(snapshot)}</span>
      </div>

      <div className="report-weekly-metrics">
        {snapshot.metricCards.map((metric) => (
          <article key={metric.key} className={`report-weekly-metric report-weekly-metric--${metric.tone}`}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.helper}</span>
          </article>
        ))}
      </div>

      <div className="report-weekly-summaries">
        {snapshot.summaryCards.map((card) => (
          <article key={card.key} className={`report-weekly-summary report-weekly-summary--${card.tone}`}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      {error ? <p className="report-weekly-error">{error}</p> : null}

      {isAdmin ? (
        <div className="report-weekly-actions">
          <button type="button" disabled={publishing} onClick={() => void publish(false)}>
            发布到团队动态
          </button>
          <button type="button" disabled={publishing} onClick={() => void publish(true)}>
            发布并发送企业微信
          </button>
        </div>
      ) : null}
    </div>

    <aside className="report-weekly-highlights">
      <div className="report-weekly-highlights-flag">本周高光</div>
      {snapshot.highlights.length > 0 ? (
        snapshot.highlights.slice(0, 3).map((highlight, index) => (
          <article
            key={highlight.id}
            className={`report-weekly-highlight-note report-weekly-highlight-note-${index + 1}`}
          >
            <strong>{highlight.title}</strong>
            <p>{highlight.summary}</p>
          </article>
        ))
      ) : (
        <article className="report-weekly-highlight-note report-weekly-highlight-note-empty">
          <strong>本周高光待生成</strong>
          <p>本周还没有稀有奖励、暴击高光或多人响应。先攒一点素材。</p>
        </article>
      )}
    </aside>
  </section>
);
```

- [ ] **Step 4: Restyle `WeeklyReportAdminPanel.tsx` as a proofreading sheet**

Keep the existing state logic, but replace the outer markup with:

```tsx
return (
  <section className="report-admin-sheet">
    <div className="report-admin-sheet-header">
      <div>
        <p className="report-admin-eyebrow">Admin Weekly</p>
        <h2>本周周报</h2>
        <p className="report-admin-subtitle">管理员先生成草稿，再决定什么时候公开到团队动态。</p>
      </div>
      <div className="report-admin-status">{draftStatus}</div>
    </div>

    {error ? <div className="report-admin-alert report-admin-alert-error">{error}</div> : null}
    {message ? <div className="report-admin-alert report-admin-alert-success">{message}</div> : null}

    <div className="report-admin-grid">
      <div className="report-admin-editor">
        {/* keep current generate/publish controls and explanatory text */}
      </div>
      <div className="report-admin-summary">
        {/* keep the current draft summary rendering */}
      </div>
    </div>
  </section>
);
```

Do not change any button semantics, API calls, or status copy.

- [ ] **Step 5: Run the weekly report tests and verify they pass**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-panel.test.tsx __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the weekly and admin bottom sheets**

```bash
git add components/report-center/GamificationWeeklyReportPanel.tsx components/report-center/WeeklyReportAdminPanel.tsx __tests__/gamification-weekly-report-panel.test.tsx __tests__/report-center-component.test.tsx
git commit -m "feat: add report weekly and admin sheets"
```

## Task 6: Add CSS Contracts, Responsive Rules, And Final Verification

**Files:**
- Create: `__tests__/home-ui-report-scene-css.test.ts`
- Modify: `__tests__/home-ui-density-contract.test.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the failing report scene CSS contract test**

Create `__tests__/home-ui-report-scene-css.test.ts`:

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

function extractRuleBody(css: string, selector: string, bodyPattern?: RegExp) {
  const matchingBodies: string[] = [];
  let blockStart = css.indexOf("{");

  while (blockStart >= 0) {
    const previousClose = css.lastIndexOf("}", blockStart);
    const previousOpen = css.lastIndexOf("{", blockStart - 1);
    const selectorStart = Math.max(previousClose, previousOpen) + 1;
    const selectorList = css.slice(selectorStart, blockStart).trim();
    const selectors = selectorList.split(",").map((item) => item.trim());

    if (!selectorList.startsWith("@") && selectors.includes(selector)) {
      matchingBodies.push(extractBlockAt(css, selector, css.lastIndexOf(selector, blockStart)));
    }

    blockStart = css.indexOf("{", blockStart + 1);
  }

  expect(matchingBodies.length).toBeGreaterThan(0);

  if (bodyPattern) {
    const matchingBody = matchingBodies.find((body) => bodyPattern.test(body));
    expect(matchingBody).toBeDefined();
  }

  return matchingBodies.join("\n");
}

describe("home report scene CSS", () => {
  it("styles the report tab as a layered editorial desk scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".report-scene");
    const backgroundRule = extractRuleBody(css, ".report-scene-background", /editor-desk-bg\.webp/);
    const propsRule = extractRuleBody(css, ".report-scene-props");
    const contentRule = extractRuleBody(css, ".report-scene-content");
    const headerRule = extractRuleBody(css, ".report-header-sheet");
    const metricRule = extractRuleBody(css, ".report-metric-tile");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/editor-desk-bg\.webp/);
    expect(backgroundRule).toMatch(/clip-path:\s*inset\(0 round 1\.65rem\)/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/z-index:\s*2/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
    expect(headerRule).toMatch(/border:\s*4px solid #111827/);
    expect(metricRule).toMatch(/box-shadow:\s*6px 6px 0 #1f2937/);
  });

  it("includes responsive and reduced-motion coverage for the report scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");

    expect(
      mobileBlocks.some(
        (block) => block.includes(".report-scene-props") && /display:\s*none/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) => block.includes(".report-scene-bottom") && /grid-template-columns:\s*1fr/.test(block),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) => block.includes(".report-scene *") && /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Extend the density contract to the report scene**

Append this test to `__tests__/home-ui-density-contract.test.ts`:

```ts
it("keeps the report scene inside the same one-screen stage model", () => {
  const css = readFileSync("app/globals.css", "utf8");

  const sceneRule = extractRuleBody(css, ".report-scene");
  const contentRule = extractRuleBody(css, ".report-scene-content");
  const analysisRule = extractRuleBody(css, ".report-scene-analysis");
  const bottomRule = extractRuleBody(css, ".report-scene-bottom");
  const weeklyRule = extractRuleBody(css, ".report-weekly-sheet");
  const adminRule = extractRuleBody(css, ".report-admin-sheet");

  expect(sceneRule).toMatch(/height:\s*100%/);
  expect(sceneRule).toMatch(/overflow:\s*hidden/);
  expect(contentRule).toMatch(/height:\s*100%/);
  expect(contentRule).toMatch(/min-height:\s*0/);
  expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
  expect(analysisRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1\.85fr\)\s*minmax\(280px,\s*0\.78fr\)/);
  expect(bottomRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s*minmax\(250px,\s*0\.82fr\)/);
  expect(weeklyRule).toMatch(/min-height:\s*13\.5rem/);
  expect(adminRule).toMatch(/border:\s*4px solid #111827/);
});
```

- [ ] **Step 3: Add the report scene CSS to `app/globals.css`**

Append a dedicated report scene block after the other home scene sections in `app/globals.css`:

```css
.report-scene {
  position: relative;
  isolation: isolate;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  border-radius: 1.65rem;
}

.report-scene-background,
.report-scene-props {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  clip-path: inset(0 round 1.65rem);
}

.report-scene-background {
  z-index: 0;
}

.report-scene-desk {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.report-scene-props {
  z-index: 1;
}

.report-scene-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.4vw, 1.15rem);
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(0.75rem, 1.5vw, 1.25rem) clamp(7.5rem, 10vw, 12.5rem) clamp(1rem, 1.8vw, 1.35rem);
}

.report-scene-analysis {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(280px, 0.78fr);
  gap: 1rem;
}

.report-scene-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(250px, 0.82fr);
  gap: 1rem;
}

.report-header-sheet,
.report-chart-sheet,
.report-coffee-sheet,
.report-weekly-sheet,
.report-admin-sheet {
  border: 4px solid #111827;
  border-radius: 1.35rem;
  background: rgba(255, 252, 244, 0.98);
  box-shadow: 6px 6px 0 #1f2937;
}

.report-metric-tile {
  position: relative;
  display: grid;
  grid-template-columns: 0.55rem 4rem minmax(0, 1fr);
  gap: 0.85rem;
  align-items: center;
  min-height: 8.5rem;
  border: 4px solid #111827;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 6px 6px 0 #1f2937;
  overflow: hidden;
}

.report-weekly-layout {
  display: contents;
}

.report-weekly-highlights {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.report-weekly-highlight-note {
  min-height: 13.5rem;
  border: 3px solid #111827;
  border-radius: 0.45rem 0.45rem 1rem 0.45rem;
  padding: 1rem;
  box-shadow: 5px 5px 0 rgba(17, 24, 39, 0.22);
}

@media (max-width: 1024px) {
  .report-scene-content {
    padding-inline: clamp(1rem, 4vw, 2rem);
  }

  .report-scene-analysis,
  .report-scene-bottom {
    grid-template-columns: 1fr;
  }

  .report-weekly-highlights {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .report-scene {
    border-radius: 1.25rem;
  }

  .report-scene-props {
    display: none;
  }

  .report-scene-content {
    padding: 0.75rem;
    gap: 0.8rem;
  }

  .report-weekly-highlights {
    grid-template-columns: 1fr;
  }

  .report-header-sheet,
  .report-chart-sheet,
  .report-coffee-sheet,
  .report-weekly-sheet,
  .report-admin-sheet,
  .report-metric-tile {
    box-shadow: 4px 4px 0 #1f2937;
  }
}

@media (prefers-reduced-motion: reduce) {
  .report-scene *,
  .report-scene *::before,
  .report-scene *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Preserve any still-needed existing report-specific declarations and delete the obsolete `.report-board`, `.report-hero`, `.report-vault-card`, and `.game-weekly-report*` blocks once the new scene CSS fully replaces them.

- [ ] **Step 4: Run the report CSS and density tests and verify they pass**

Run:

```bash
npm test -- __tests__/home-ui-report-scene-css.test.ts __tests__/home-ui-density-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the full report test suite and verify it passes**

Run:

```bash
npm test -- __tests__/home-ui-report-assets.test.ts __tests__/home-ui-report-scene.test.tsx __tests__/home-ui-report-scene-css.test.ts __tests__/home-ui-density-contract.test.ts __tests__/report-center-component.test.tsx __tests__/gamification-weekly-report-panel.test.tsx __tests__/coffee-report-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run lint and verify it passes**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit the report scene CSS and verification updates**

```bash
git add app/globals.css __tests__/home-ui-report-scene-css.test.ts __tests__/home-ui-density-contract.test.ts
git commit -m "feat: style report center editor scene"
```

## Final Verification

- [ ] Run the local app and visually inspect the `战报中心` tab on desktop:

```bash
npm run dev
```

Expected: the report page shows the editorial desk scene with all major prototype zones visible without full-page scrolling at standard desktop width, while the coffee module still uses the existing pixel cup and receipt artwork.

- [ ] Inspect a narrow mobile viewport in the browser.

Expected: props are reduced, the scene stacks vertically, and the admin sheet remains readable.

- [ ] Confirm the final codebase only references old `report-center` image paths for the preserved coffee module.

Run:

```bash
rg -n "/assets/report-center/" components __tests__ app/globals.css
```

Expected: matches only for `coffee-cup-label.png` and `coffee-receipt.png` in `components/report-center/CoffeeReportPanel.tsx` and tests that intentionally preserve them.
