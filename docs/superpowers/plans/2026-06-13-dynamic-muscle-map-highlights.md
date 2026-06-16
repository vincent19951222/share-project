# Dynamic Muscle Map Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让训练小票里的肌肉图根据当前选择动态高亮：仅有氧时所有可训练肌群显示淡黄色，选择力量部位时对应肌群显示红色高亮。

**Architecture:** 保留现有 `WorkoutTicketPayload`、选择状态和提交逻辑不变，只把肌肉图从单张静态 `<img>` 改成“灰度底图 + SVG 覆盖层”。新增 `FitnessMuscleMap` 组件负责肌群坐标、颜色层级和渲染，`FitnessPunchTicket` 只把 `cardioItem !== null` 与 `selectedParts` 传进去。

**Tech Stack:** Next.js App Router, React client components, TypeScript, CSS, Vitest + jsdom.

---

## 可行性评估

好做，属于中等偏低复杂度。当前难点不是数据流，数据已经在 `FitnessPunchTicket` 中有 `cardioItem` 和 `selectedParts`；真正需要花时间的是肌肉图坐标校准。

当前图片 `public/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png` 是 `1672 x 941` 的单张 PNG，而且黄色高亮已经烘在图里。推荐做法是用 CSS 把底图去饱和，变成接近中性的肌肉底图，再用同尺寸 SVG `viewBox="0 0 1672 941"` 叠加可控的淡黄/红色区域。这样不需要生成多张图片，也不会影响后端统计。

视觉口径：
- 只选择有氧：`chest/back/shoulder/glutes/legs/abs` 这 6 个统计维度对应区域全部淡黄色。
- 只选择力量：只把用户选择的力量部位红色高亮。
- 有氧 + 力量：所有可训练肌群淡黄色，用户选择的力量部位用红色覆盖。
- 什么都不选：不显示高亮，确认按钮仍禁用。

如果后续要求“医学级精确肌肉边界”，需要重新出 SVG 矢量素材或干净中性底图；当前方案适合产品小票场景，能快速上线且维护成本低。

## 文件结构

- Create: `components/ui/FitnessMuscleMap.tsx`
  - 单一职责：渲染肌肉底图和 SVG 高亮层。
  - 输入：`cardioActive: boolean`、`selectedParts: StrengthPart[]`。
  - 输出：保留现有图片 alt，新增非交互 SVG 覆盖层。
- Create: `__tests__/fitness-muscle-map.test.tsx`
  - 直接测试 `FitnessMuscleMap` 的状态映射，不依赖弹窗打开流程。
- Modify: `components/ui/FitnessPunchTicket.tsx`
  - 移除内联 `<img>`，改为传状态给 `FitnessMuscleMap`。
- Modify: `app/globals.css`
  - 给肌肉图容器增加定位、固定比例、底图去饱和、SVG 高亮颜色。
- Modify: `__tests__/punch-popup.test.tsx`
  - 加一个集成断言，确保真实选择流程会改变肌肉图高亮。
- Modify: `__tests__/fitness-ticket-runtime-assets.test.ts`
  - 覆盖新增 CSS 类，防止运行时样式漏掉。

## Task 1: Direct Muscle Map Tests

**Files:**
- Create: `__tests__/fitness-muscle-map.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `__tests__/fitness-muscle-map.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FitnessMuscleMap } from "@/components/ui/FitnessMuscleMap";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("FitnessMuscleMap", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderedTones() {
    return Array.from(container.querySelectorAll("[data-muscle-part]")).map((region) => ({
      part: region.getAttribute("data-muscle-part"),
      tone: region.getAttribute("data-muscle-tone"),
    }));
  }

  it("renders pale cardio highlights for every tracked muscle part when only cardio is active", () => {
    act(() => {
      root.render(<FitnessMuscleMap cardioActive={true} selectedParts={[]} />);
    });

    expect(renderedTones()).toEqual([
      { part: "chest", tone: "cardio" },
      { part: "back", tone: "cardio" },
      { part: "shoulder", tone: "cardio" },
      { part: "glutes", tone: "cardio" },
      { part: "legs", tone: "cardio" },
      { part: "abs", tone: "cardio" },
    ]);
  });

  it("renders strength highlights over selected parts and cardio highlights for the rest", () => {
    act(() => {
      root.render(<FitnessMuscleMap cardioActive={true} selectedParts={["chest", "abs"]} />);
    });

    expect(renderedTones()).toEqual([
      { part: "chest", tone: "strength" },
      { part: "back", tone: "cardio" },
      { part: "shoulder", tone: "cardio" },
      { part: "glutes", tone: "cardio" },
      { part: "legs", tone: "cardio" },
      { part: "abs", tone: "strength" },
    ]);
  });

  it("renders only selected strength highlights when cardio is inactive", () => {
    act(() => {
      root.render(<FitnessMuscleMap cardioActive={false} selectedParts={["back", "legs"]} />);
    });

    expect(renderedTones()).toEqual([
      { part: "back", tone: "strength" },
      { part: "legs", tone: "strength" },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- __tests__/fitness-muscle-map.test.tsx
```

Expected: FAIL because `@/components/ui/FitnessMuscleMap` does not exist.

- [ ] **Step 3: Commit the failing test**

Do not commit this red state unless the team intentionally preserves red commits. For normal execution, keep the file unstaged and continue to Task 2.

## Task 2: FitnessMuscleMap Component

**Files:**
- Create: `components/ui/FitnessMuscleMap.tsx`
- Test: `__tests__/fitness-muscle-map.test.tsx`

- [ ] **Step 1: Create the component**

Create `components/ui/FitnessMuscleMap.tsx`:

```tsx
"use client";

import { STRENGTH_PARTS, type StrengthPart } from "@/lib/workouts";

type MuscleTone = "cardio" | "strength";

type MuscleShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
};

type MuscleRegion = {
  part: StrengthPart;
  shapes: MuscleShape[];
};

type FitnessMuscleMapProps = {
  cardioActive: boolean;
  selectedParts: StrengthPart[];
};

const muscleRegions: MuscleRegion[] = [
  {
    part: "chest",
    shapes: [
      { cx: 590, cy: 300, rx: 76, ry: 58, rotate: 4 },
      { cx: 725, cy: 300, rx: 76, ry: 58, rotate: -4 },
    ],
  },
  {
    part: "back",
    shapes: [
      { cx: 1128, cy: 340, rx: 76, ry: 128, rotate: -16 },
      { cx: 1275, cy: 340, rx: 76, ry: 128, rotate: 16 },
      { cx: 1200, cy: 450, rx: 132, ry: 86 },
    ],
  },
  {
    part: "shoulder",
    shapes: [
      { cx: 470, cy: 275, rx: 62, ry: 76, rotate: -26 },
      { cx: 850, cy: 275, rx: 62, ry: 76, rotate: 26 },
      { cx: 1032, cy: 275, rx: 62, ry: 76, rotate: -26 },
      { cx: 1390, cy: 275, rx: 62, ry: 76, rotate: 26 },
    ],
  },
  {
    part: "glutes",
    shapes: [
      { cx: 1110, cy: 575, rx: 76, ry: 90, rotate: -5 },
      { cx: 1248, cy: 575, rx: 76, ry: 90, rotate: 5 },
    ],
  },
  {
    part: "legs",
    shapes: [
      { cx: 565, cy: 655, rx: 56, ry: 124, rotate: -4 },
      { cx: 725, cy: 655, rx: 56, ry: 124, rotate: 4 },
      { cx: 565, cy: 805, rx: 40, ry: 92, rotate: -3 },
      { cx: 725, cy: 805, rx: 40, ry: 92, rotate: 3 },
      { cx: 1082, cy: 690, rx: 48, ry: 120, rotate: 3 },
      { cx: 1245, cy: 690, rx: 48, ry: 120, rotate: -3 },
      { cx: 1082, cy: 820, rx: 34, ry: 82, rotate: 2 },
      { cx: 1245, cy: 820, rx: 34, ry: 82, rotate: -2 },
    ],
  },
  {
    part: "abs",
    shapes: [
      { cx: 655, cy: 390, rx: 92, ry: 36 },
      { cx: 655, cy: 455, rx: 78, ry: 42 },
      { cx: 655, cy: 525, rx: 58, ry: 56 },
    ],
  },
];

function getTone(part: StrengthPart, cardioActive: boolean, selectedPartSet: Set<StrengthPart>): MuscleTone | null {
  if (selectedPartSet.has(part)) {
    return "strength";
  }

  if (cardioActive) {
    return "cardio";
  }

  return null;
}

export function FitnessMuscleMap({ cardioActive, selectedParts }: FitnessMuscleMapProps) {
  const selectedPartSet = new Set(selectedParts);

  return (
    <div className="fitness-ticket-muscle-map">
      <img
        src="/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png"
        alt="今日训练部位肌肉图"
      />
      <svg
        className="fitness-ticket-muscle-overlay"
        viewBox="0 0 1672 941"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {STRENGTH_PARTS.map((part) => {
          const region = muscleRegions.find((item) => item.part === part);
          const tone = getTone(part, cardioActive, selectedPartSet);

          if (!region || !tone) {
            return null;
          }

          return (
            <g
              key={part}
              className={`fitness-ticket-muscle-region fitness-ticket-muscle-region-${tone}`}
              data-muscle-part={part}
              data-muscle-tone={tone}
            >
              {region.shapes.map((shape, index) => (
                <ellipse
                  key={`${part}-${index}`}
                  cx={shape.cx}
                  cy={shape.cy}
                  rx={shape.rx}
                  ry={shape.ry}
                  transform={
                    shape.rotate
                      ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`
                      : undefined
                  }
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Run the direct component test**

Run:

```bash
npm test -- __tests__/fitness-muscle-map.test.tsx
```

Expected: PASS. The test should report 3 passing tests.

- [ ] **Step 3: Commit the component**

```bash
git add components/ui/FitnessMuscleMap.tsx __tests__/fitness-muscle-map.test.tsx
git commit -m "feat: add dynamic fitness muscle map"
```

## Task 3: Muscle Map Overlay CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `__tests__/fitness-ticket-runtime-assets.test.ts`

- [ ] **Step 1: Add a failing runtime CSS assertion**

Modify `__tests__/fitness-ticket-runtime-assets.test.ts` inside `ships the CSS classes used by the fitness ticket modal`:

```ts
    expect(globalsCss).toContain(".fitness-ticket-muscle-overlay");
    expect(globalsCss).toContain(".fitness-ticket-muscle-region-strength");
```

- [ ] **Step 2: Run the runtime asset test to verify it fails**

Run:

```bash
npm test -- __tests__/fitness-ticket-runtime-assets.test.ts
```

Expected: FAIL because the new CSS classes do not exist yet.

- [ ] **Step 3: Replace the muscle map CSS with overlay-safe layout**

In `app/globals.css`, replace the existing `.fitness-ticket-muscle-map` and `.fitness-ticket-muscle-map img` blocks with this code:

```css
.fitness-ticket-muscle-map {
  position: relative;
  display: block;
  min-height: 0;
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(255, 252, 238, 0.76);
}

.fitness-ticket-muscle-map img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: contain;
  filter: saturate(0.08) contrast(0.98) drop-shadow(0 10px 0 rgba(0, 0, 0, 0.13));
}

.fitness-ticket-muscle-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  mix-blend-mode: multiply;
}

.fitness-ticket-muscle-region {
  stroke: rgba(31, 41, 55, 0.42);
  stroke-width: 5;
}

.fitness-ticket-muscle-region-cardio {
  fill: rgba(253, 224, 71, 0.36);
}

.fitness-ticket-muscle-region-strength {
  fill: rgba(239, 68, 68, 0.62);
  stroke: rgba(153, 27, 27, 0.66);
  stroke-width: 7;
}
```

In the `@media (max-width: 920px)` block, replace the existing mobile `.fitness-ticket-muscle-map` and `.fitness-ticket-muscle-map img` overrides with:

```css
  .fitness-ticket-muscle-map {
    min-height: 0;
  }

  .fitness-ticket-muscle-map img {
    width: 100%;
    height: 100%;
    max-height: none;
    object-fit: contain;
    object-position: center;
  }
```

- [ ] **Step 4: Run the runtime asset test**

Run:

```bash
npm test -- __tests__/fitness-ticket-runtime-assets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the CSS**

```bash
git add app/globals.css __tests__/fitness-ticket-runtime-assets.test.ts
git commit -m "style: add muscle map highlight overlay styles"
```

## Task 4: Wire Muscle Map Into Fitness Ticket

**Files:**
- Modify: `components/ui/FitnessPunchTicket.tsx`
- Modify: `__tests__/punch-popup.test.tsx`
- Test: `__tests__/punch-popup.test.tsx`

- [ ] **Step 1: Add a failing integration test for the real ticket flow**

In `__tests__/punch-popup.test.tsx`, add this helper near the existing helpers:

```ts
  function muscleHighlightTones() {
    return Array.from(document.body.querySelectorAll("[data-muscle-part]")).map((region) => ({
      part: region.getAttribute("data-muscle-part"),
      tone: region.getAttribute("data-muscle-tone"),
    }));
  }
```

Add this test after `syncs the training type from cardio and strength selections`:

```tsx
  it("updates the muscle map highlights from cardio and strength selections", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<PunchPopup onConfirm={onConfirm} variant="fitness-ticket" />);
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(muscleHighlightTones()).toEqual([
      { part: "chest", tone: "cardio" },
      { part: "back", tone: "cardio" },
      { part: "shoulder", tone: "cardio" },
      { part: "glutes", tone: "cardio" },
      { part: "legs", tone: "cardio" },
      { part: "abs", tone: "cardio" },
    ]);

    await act(async () => {
      findModalButton("腹")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(muscleHighlightTones()).toEqual([
      { part: "chest", tone: "cardio" },
      { part: "back", tone: "cardio" },
      { part: "shoulder", tone: "cardio" },
      { part: "glutes", tone: "cardio" },
      { part: "legs", tone: "cardio" },
      { part: "abs", tone: "strength" },
    ]);

    await act(async () => {
      findModalButton("跑步机")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(muscleHighlightTones()).toEqual([{ part: "abs", tone: "strength" }]);
  });
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npm test -- __tests__/punch-popup.test.tsx
```

Expected: FAIL because `FitnessPunchTicket` still renders only the plain image and no `[data-muscle-part]` regions.

- [ ] **Step 3: Replace the inline image with `FitnessMuscleMap`**

In `components/ui/FitnessPunchTicket.tsx`, add this import:

```ts
import { FitnessMuscleMap } from "@/components/ui/FitnessMuscleMap";
```

Replace this block:

```tsx
            <div className="fitness-ticket-muscle-map">
              <img
                src="/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png"
                alt="今日训练部位肌肉图"
              />
            </div>
```

with:

```tsx
            <FitnessMuscleMap cardioActive={cardioItem !== null} selectedParts={selectedParts} />
```

- [ ] **Step 4: Run the integration test**

Run:

```bash
npm test -- __tests__/punch-popup.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the wiring**

```bash
git add components/ui/FitnessPunchTicket.tsx __tests__/punch-popup.test.tsx
git commit -m "feat: wire muscle highlights to workout ticket"
```

## Task 5: Verification And Visual QA

**Files:**
- No required file changes unless visual QA shows coordinate issues.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/fitness-muscle-map.test.tsx __tests__/punch-popup.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/fitness-punch-ticket-prototype.test.tsx __tests__/fitness-ticket-runtime-assets.test.ts
```

Expected: PASS. All listed test files should pass.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 3: Start local dev server**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Expected: Next.js reports:

```text
Local:        http://127.0.0.1:3001
Ready
```

- [ ] **Step 4: Verify desktop visual behavior**

Open:

```text
http://127.0.0.1:3001/ui-prototypes/fitness-punch-ticket
```

Manual acceptance:
- Default state shows all tracked muscle groups with pale yellow highlights.
- Clicking `腹` changes abdomen to red while other tracked muscle groups stay pale yellow.
- Clicking `跑步机` off leaves only abdomen red.
- Clicking `腹` off leaves no highlight and the confirm button disabled.

- [ ] **Step 5: Verify mobile visual behavior**

Set viewport to `375 x 812` and reload:

```text
http://127.0.0.1:3001/ui-prototypes/fitness-punch-ticket
```

Manual acceptance:
- The SVG overlay aligns with the image after responsive scaling.
- The page has no horizontal scroll.
- Red highlights stay within the visible body part area.
- Footer buttons remain visible and do not overlap the image.

- [ ] **Step 6: Commit coordinate adjustments if needed**

If visual QA requires coordinate refinements, edit only `muscleRegions` in `components/ui/FitnessMuscleMap.tsx`, then run:

```bash
npm test -- __tests__/fitness-muscle-map.test.tsx __tests__/punch-popup.test.tsx
npm run lint
git add components/ui/FitnessMuscleMap.tsx
git commit -m "polish: tune fitness muscle highlight coordinates"
```

Expected: tests and lint pass before commit.

## Self-Review

- Spec coverage: The plan covers cardio-only pale yellow, strength red highlights, combined cardio + strength behavior, no-selection behavior, responsive alignment, and tests.
- Placeholder scan: No unresolved placeholders or vague implementation instructions remain.
- Type consistency: The plan consistently uses `StrengthPart`, `selectedParts`, `cardioActive`, `FitnessMuscleMap`, `data-muscle-part`, and `data-muscle-tone`.
- Scope check: No API, Prisma, persistence, or statistics changes are included. This is intentionally UI-only.
