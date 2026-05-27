# Task Card Illustration Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 补齐 20 个 MVP 任务卡的今日主线插画素材，并用 manifest 和测试守住完整性。

**Architecture:** 从现有完整卡牌 `public/assets/task-cards/raw/` 裁切中间插画区，输出到 `public/assets/task-cards/illustrations/`。新增一个专用 manifest 维护 `taskCardId -> illustration path`，Dashboard 和 review demo 从 manifest 读取当前使用的 4 张图。

**Tech Stack:** Next.js App Router, TypeScript, Vitest, ImageMagick `magick`.

---

### Task 1: Add Illustration Manifest

**Files:**
- Create: `components/gamification/ui-lab/task-cards/task-card-art.ts`
- Modify: `components/gamification/ui-lab/task-cards/task-card-demo-data.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/mock-data.ts`

- [x] **Step 1: Create the manifest**

Create `components/gamification/ui-lab/task-cards/task-card-art.ts` with `taskCardIllustrationById`, `taskCardIllustrationIds`, and `getTaskCardIllustrationPath`.

- [x] **Step 2: Route existing demo paths through the manifest**

Replace the four hardcoded paths in `task-card-demo-data.ts` with `taskCardIllustrationById[id]`.

- [x] **Step 3: Route Dashboard paths through the manifest**

Import `taskCardIllustrationById` in `supply-dashboard/mock-data.ts` and keep the public `taskCards` shape unchanged.

### Task 2: Generate Missing WebP Assets

**Files:**
- Create: 16 missing files under `public/assets/task-cards/illustrations/`
- Keep: existing 4 WebP files under `public/assets/task-cards/illustrations/`

- [x] **Step 1: Generate all missing assets**

Use a script that scans raw filenames by ID prefix, because the source files contain non-breaking spaces and `hydration_002` is misspelled as `ydration_002`.

```bash
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cwd = process.cwd();
const rawDir = path.join(cwd, 'public/assets/task-cards/raw');
const outDir = path.join(cwd, 'public/assets/task-cards/illustrations');
const rawFiles = fs.readdirSync(rawDir);

const assets = [
  ['movement_001', 'movement_001-desk-reboot.webp', ['-crop', '900x620+62+270', '+repage', '-quality', '82']],
  ['movement_002', 'movement_002-seat-offline.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['movement_003', 'movement_003-neck-boot.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['movement_005', 'movement_005-back-thaw.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['hydration_001', 'hydration_001-first-cup.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['ydration_002', 'hydration_002-pantry-refill.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['hydration_004', 'hydration_004-sugar-free.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['hydration_005', 'hydration_005-coffee-debt.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['social_002', 'social_002-work-smell-vent.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['social_003', 'social_003-praise-heal.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['social_004', 'social_004-status-report.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['social_005', 'social_005-hard-work-launch.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['learning_001', 'learning_001-three-minute-scan.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['learning_002', 'learning_002-new-term.webp', ['-crop', '900x620+93+365', '+repage', '-quality', '82']],
  ['learning_003', 'learning_003-bookmark-heal-pack.webp', ['-crop', '840x620+92+337', '+repage', '-resize', '900x', '-quality', '82']],
  ['learning_004', 'learning_004-ai-cheat-sheet.webp', ['-crop', '840x620+92+337', '+repage', '-resize', '900x', '-quality', '82']],
];

for (const [rawPrefix, outputName, operations] of assets) {
  const rawName = rawFiles.find((file) => file.startsWith(rawPrefix));
  if (!rawName) throw new Error(`Missing raw source for ${rawPrefix}`);

  const input = path.join(rawDir, rawName);
  const output = path.join(outDir, outputName);
  const result = spawnSync('magick', [input, ...operations, output], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `crop failed for ${rawName}`);
  console.log(`${rawName} -> ${outputName}`);
}
NODE
```

- [x] **Step 2: Visually inspect the generated set**

```bash
magick montage public/assets/task-cards/illustrations/*.webp -thumbnail 180x140 -tile 5x4 -geometry 200x150+8+8 -background '#f5f1e8' /tmp/task-card-illustrations-contact.png
```

Expected: the contact sheet shows 20 illustrations, with no obvious full-card title bands, tag rows, status slots, or reroll slots in the newly generated images.

### Task 3: Add Asset Completeness Tests

**Files:**
- Create: `__tests__/supply-task-card-illustrations.test.ts`

- [x] **Step 1: Test every content card has an illustration**

Assert that every `TASK_CARDS` ID exists in `taskCardIllustrationById`.

- [x] **Step 2: Test every manifest file exists**

Assert that every manifest value resolves to an existing file under `public/`.

- [x] **Step 3: Test category counts**

Assert that `movement`, `hydration`, `social`, and `learning` each have 5 mapped card IDs.

### Task 4: Verify

**Files:**
- No new files.

- [x] **Step 1: Run focused tests**

```bash
npm test -- supply-task-card-illustrations supply-task-card-demo-data supply-dashboard-ui-lab-route
```

Expected: all selected Vitest suites pass.

- [x] **Step 2: Inspect asset dimensions and sizes**

```bash
sips -g pixelWidth -g pixelHeight public/assets/task-cards/illustrations/*.webp
stat -f "%N %z" public/assets/task-cards/illustrations/*.webp
```

Expected: 20 WebP files exist, are about 900 px wide, and remain small enough for dashboard use.
