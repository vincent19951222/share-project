# P3 Polish & Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the existing P3 season and economy experience so it is understandable, mobile-safe, and ready for teammate internal testing.

**Architecture:** Keep the current data model and settlement rules unchanged. Update only the presentation and client-side handling in the existing admin, board header, season progress, and profile components, with focused tests for visible text, empty states, and common API failures.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Vitest + jsdom.

---

## File Structure

- Modify `components/admin/SeasonAdminPanel.tsx`
  - Add local formatting helpers for percentages, remaining slots, dates, and friendly error messages.
  - Improve active season, empty state, history, form disabled state, and feedback text.
- Modify `components/punch-board/SeasonProgressBar.tsx`
  - Add常显说明 for no-season, active-season, and completed-season states.
  - Keep contributor tooltip behavior unchanged.
- Modify `components/punch-board/TeamHeader.tsx`
  - Tighten economy labels and add short semantic descriptions.
- Modify `components/navbar/ProfileDropdown.tsx`
  - Add a compact personal asset explanation and improve mobile-safe menu structure.
- Modify `app/globals.css`
  - Add responsive rules for the team header and dropdown menu.
- Modify `__tests__/season-admin-panel.test.tsx`
  - Cover active-state details, disabled create form, no-season empty state, and friendly error mapping.
- Create `__tests__/season-progress-bar.test.tsx` only if the existing file is not sufficient; otherwise modify the existing test.
- Modify `__tests__/profile-dropdown.test.tsx`
  - Cover personal asset explanation and existing admin link.
- Modify or create `__tests__/shared-board-css.test.ts` only if CSS assertions are needed for responsive regression checks.

---

### Task 1: Admin Season Panel Acceptance States

**Files:**
- Modify: `__tests__/season-admin-panel.test.tsx`
- Modify: `components/admin/SeasonAdminPanel.tsx`

- [ ] **Step 1: Add failing tests for active season details and disabled create form**

Add these assertions to `renders the create form, active season, and history` after the existing active season expectations:

```tsx
expect(container.textContent).toContain("当前正在冲刺");
expect(container.textContent).toContain("完成率 15%");
expect(container.textContent).toContain("还差 68 格");
expect(container.textContent).toContain("开始于 2026/04/22");
expect(container.textContent).toContain("已有进行中的赛季，先结束当前赛季再开启新赛季");

const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
  button.textContent?.includes("已有赛季进行中"),
);
expect(submitButton).not.toBeUndefined();
expect(submitButton).toHaveProperty("disabled", true);
```

- [ ] **Step 2: Add failing tests for no active season empty state**

Append this test to `__tests__/season-admin-panel.test.tsx`:

```tsx
it("shows a create-ready empty state when there is no active season", async () => {
  const endedOnly: SeasonListItem[] = [
    {
      id: "season-ended",
      teamId: "team-1",
      monthKey: "2026-04",
      goalName: "四月冲刺",
      targetSlots: 80,
      filledSlots: 72,
      status: "ENDED",
      startedAt: "2026-04-01T00:00:00.000Z",
      endedAt: "2026-04-20T00:00:00.000Z",
    },
  ];
  const fetchMock = fetch as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: endedOnly }));

  await act(async () => {
    root.render(<SeasonAdminPanel initialSeasons={endedOnly} />);
  });

  expect(container.textContent).toContain("现在没有进行中的赛季");
  expect(container.textContent).toContain("可以直接开启下一期团队冲刺");
  expect(container.textContent).toContain("完成率 90%");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: FAIL because the new polish copy and disabled active-season form state do not exist yet.

- [ ] **Step 4: Implement admin formatting helpers and disabled state**

In `components/admin/SeasonAdminPanel.tsx`, add these helpers near `readErrorMessage`:

```tsx
function getSeasonProgress(season: Pick<SeasonListItem, "filledSlots" | "targetSlots">) {
  const targetSlots = Math.max(0, season.targetSlots);
  const filledSlots = Math.max(0, Math.min(season.filledSlots, targetSlots));
  const remainingSlots = Math.max(0, targetSlots - filledSlots);
  const percent = targetSlots > 0 ? Math.round((filledSlots / targetSlots) * 100) : 0;

  return { filledSlots, remainingSlots, percent, targetSlots };
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStatusLabel(status: SeasonStatus) {
  if (status === "ACTIVE") {
    return "进行中";
  }

  if (status === "ENDED") {
    return "已结束";
  }

  return status;
}
```

Then inside `SeasonAdminPanel`, add:

```tsx
const canCreateSeason = !activeSeason;
```

Update the form intro and submit button:

```tsx
<div className="flex flex-col gap-1">
  <h2 className="text-lg font-black text-slate-800">开启新赛季</h2>
  <p className="text-xs font-bold text-sub">
    {canCreateSeason
      ? "现在没有进行中的赛季，可以直接开启下一期团队冲刺。"
      : "已有进行中的赛季，先结束当前赛季再开启新赛季。"}
  </p>
</div>
```

Set the input, select, and submit button disabled when `!canCreateSeason || isSubmitting`:

```tsx
disabled={!canCreateSeason || isSubmitting}
```

Use this button label:

```tsx
{isSubmitting ? "正在开赛季..." : canCreateSeason ? "开启新赛季" : "已有赛季进行中"}
```

- [ ] **Step 5: Implement current and history season details**

Replace the active season detail block with:

```tsx
{activeSeason ? (
  <div className="space-y-3 text-sm text-slate-700">
    {(() => {
      const progress = getSeasonProgress(activeSeason);
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              当前正在冲刺
            </span>
            <span className="font-black text-slate-900">{activeSeason.goalName}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>赛季月份：{activeSeason.monthKey}</div>
            <div>状态：{getStatusLabel(activeSeason.status)}</div>
            <div>
              进度：{progress.filledSlots}/{progress.targetSlots} 格
            </div>
            <div>完成率 {progress.percent}%</div>
            <div>还差 {progress.remainingSlots} 格</div>
            <div>开始于 {formatDateLabel(activeSeason.startedAt)}</div>
          </div>
        </>
      );
    })()}
  </div>
) : (
  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-bold text-sub">
    现在没有进行中的赛季，可以直接开启下一期团队冲刺。
  </div>
)}
```

Update each history item to include progress, dates, and status:

```tsx
{historySeasons.map((season) => {
  const progress = getSeasonProgress(season);
  return (
    <li key={season.id} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-black text-slate-900">{season.goalName}</span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-sub">
          {getStatusLabel(season.status)}
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-xs font-bold text-sub sm:grid-cols-2">
        <div>{season.monthKey}</div>
        <div>完成率 {progress.percent}%</div>
        <div>
          完成 {progress.filledSlots}/{progress.targetSlots} 格
        </div>
        <div>开始于 {formatDateLabel(season.startedAt)}</div>
        <div>结束于 {formatDateLabel(season.endedAt)}</div>
      </div>
    </li>
  );
})}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add __tests__/season-admin-panel.test.tsx components/admin/SeasonAdminPanel.tsx
git commit -m "polish admin season panel states"
```

---

### Task 2: Admin Friendly Error Mapping

**Files:**
- Modify: `__tests__/season-admin-panel.test.tsx`
- Modify: `components/admin/SeasonAdminPanel.tsx`

- [ ] **Step 1: Add failing tests for common API errors**

Append this test:

```tsx
it("maps common admin API errors to friendly Chinese messages", async () => {
  const fetchMock = fetch as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: [] }));
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({ error: "Forbidden", code: "FORBIDDEN" }, 403),
  );

  await act(async () => {
    root.render(<SeasonAdminPanel initialSeasons={[]} />);
  });

  const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
  const form = container.querySelector("form");
  const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  await act(async () => {
    setInputValue?.call(goalInput, "五月掉脂挑战");
    goalInput!.dispatchEvent(new Event("input", { bubbles: true }));
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  expect(container.textContent).toContain("只有管理员可以管理赛季");
});
```

Append this test:

```tsx
it("keeps season conflict errors understandable", async () => {
  const fetchMock = fetch as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValueOnce(createJsonResponse({ seasons: [] }));
  fetchMock.mockResolvedValueOnce(
    createJsonResponse(
      { error: "当前已经有进行中的赛季了", code: "SEASON_CONFLICT" },
      409,
    ),
  );

  await act(async () => {
    root.render(<SeasonAdminPanel initialSeasons={[]} />);
  });

  const goalInput = container.querySelector<HTMLInputElement>('input[name="goalName"]');
  const form = container.querySelector("form");
  const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  await act(async () => {
    setInputValue?.call(goalInput, "五月掉脂挑战");
    goalInput!.dispatchEvent(new Event("input", { bubbles: true }));
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  expect(container.textContent).toContain("当前已经有进行中的赛季了");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: FAIL because `Forbidden` is currently displayed directly.

- [ ] **Step 3: Implement friendly error mapping**

Replace `readErrorMessage` with:

```tsx
function mapAdminErrorMessage(error: string, code?: string) {
  if (code === "SEASON_CONFLICT") {
    return error || "当前已经有进行中的赛季了，请先结束当前赛季";
  }

  if (code === "SEASON_NOT_FOUND") {
    return error || "当前没有可结束的赛季";
  }

  if (error === "Unauthorized") {
    return "登录状态过期了，请重新登录";
  }

  if (error === "Forbidden") {
    return "只有管理员可以管理赛季";
  }

  if (error === "Invalid request body") {
    return "提交内容有误，请检查后再试";
  }

  if (error === "Internal server error") {
    return "赛季操作没成功，请稍后再试";
  }

  return error.trim() || "操作没成功，请稍后再试";
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown; code?: unknown };
    if (typeof data.error === "string") {
      return mapAdminErrorMessage(
        data.error,
        typeof data.code === "string" ? data.code : undefined,
      );
    }
  } catch {
    return "操作没成功，请稍后再试";
  }

  return "操作没成功，请稍后再试";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/season-admin-panel.test.tsx components/admin/SeasonAdminPanel.tsx
git commit -m "polish admin season error messages"
```

---

### Task 3: Season Progress Bar Copy States

**Files:**
- Modify: `__tests__/season-progress-bar.test.tsx`
- Modify: `components/punch-board/SeasonProgressBar.tsx`

- [ ] **Step 1: Inspect existing test exports**

Run:

```bash
sed -n '1,260p' __tests__/season-progress-bar.test.tsx
```

Expected: identify the local helper used to render `SeasonProgressBar`.

- [ ] **Step 2: Add failing tests for no-season and completed-season copy**

Add these tests to the existing `SeasonProgressBar` describe block:

```tsx
it("explains that no active season does not stop personal asset growth", () => {
  act(() => {
    root.render(<SeasonProgressBar activeSeason={null} />);
  });

  expect(container.textContent).toContain("暂无进行中的团队冲刺");
  expect(container.textContent).toContain("打卡仍会累计我的银子");
});
```

```tsx
it("explains completed seasons without hiding continued rewards", () => {
  const activeSeason: ActiveSeasonSnapshot = {
    id: "season-full",
    monthKey: "2026-04",
    goalName: "四月掉脂挑战",
    targetSlots: 2,
    filledSlots: 2,
    contributions: [
      {
        userId: "user-1",
        name: "li",
        avatarKey: "male1",
        seasonIncome: 80,
        slotContribution: 2,
        colorIndex: 0,
      },
    ],
  };

  act(() => {
    root.render(<SeasonProgressBar activeSeason={activeSeason} />);
  });

  expect(container.textContent).toContain("本期团队冲刺进度");
  expect(container.textContent).toContain("四月掉脂挑战 · 2/2");
  expect(container.textContent).toContain("已冲满");
  expect(container.textContent).toContain("继续打卡仍累计我的银子和赛季收入");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/season-progress-bar.test.tsx
```

Expected: FAIL because the new explanatory copy does not exist.

- [ ] **Step 4: Implement progress bar copy states**

In `components/punch-board/SeasonProgressBar.tsx`, replace the no-season return with:

```tsx
return (
  <div className="flex h-full min-h-12 flex-col justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-sub">
    <span className="text-main">暂无进行中的团队冲刺</span>
    <span className="text-xs">打卡仍会累计我的银子，等管理员开启下一期赛季。</span>
  </div>
);
```

After `helperText`, add:

```tsx
const isCompleted = targetSlots > 0 && filledSlots >= targetSlots;
```

Replace the title row with:

```tsx
<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold text-sub">
  <span className="text-main">本期团队冲刺进度</span>
  <span>{helperText}</span>
</div>
{isCompleted ? (
  <p className="text-[11px] font-bold text-emerald-700">
    已冲满，继续打卡仍累计我的银子和赛季收入。
  </p>
) : (
  <p className="text-[11px] font-bold text-sub">
    每次有效健身打卡推进 1 格，和个人银子分开结算。
  </p>
)}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/season-progress-bar.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add __tests__/season-progress-bar.test.tsx components/punch-board/SeasonProgressBar.tsx
git commit -m "polish season progress copy"
```

---

### Task 4: Board Header and Profile Economy Semantics

**Files:**
- Modify: `__tests__/profile-dropdown.test.tsx`
- Modify: `components/punch-board/TeamHeader.tsx`
- Modify: `components/navbar/ProfileDropdown.tsx`

- [ ] **Step 1: Add failing profile dropdown copy test**

In `__tests__/profile-dropdown.test.tsx`, add expectations to the existing render test for an admin user:

```tsx
expect(container.textContent).toContain("个人长期累计资产");
expect(container.textContent).toContain("连续有效健身打卡");
expect(container.textContent).toContain("下一次有效打卡可得");
expect(container.textContent).toContain("赛季设置");
```

- [ ] **Step 2: Run the profile dropdown test to verify it fails**

Run:

```bash
npm test -- __tests__/profile-dropdown.test.tsx
```

Expected: FAIL because the explanatory copy does not exist yet.

- [ ] **Step 3: Update TeamHeader copy**

In `components/punch-board/TeamHeader.tsx`, change the vault block to:

```tsx
<span className="text-[10px] font-bold text-sub tracking-wider uppercase">牛马金库</span>
<span className="text-[10px] font-bold text-sub">全队个人银子总和</span>
```

Change the account subtitle to:

```tsx
<span className="team-header-account-subtitle">个人长期累计资产</span>
```

Change KPI labels to:

```tsx
<div className="team-header-account-kpi-label text-slate-400">连签</div>
<div className="team-header-account-kpi-label text-amber-500">下次奖励</div>
<div className="team-header-account-kpi-label text-slate-400">今日打卡</div>
```

The existing labels can remain short; the main semantic explanation lives in subtitles and Profile.

- [ ] **Step 4: Update ProfileDropdown copy**

Replace the top content block in `components/navbar/ProfileDropdown.tsx` with:

```tsx
<div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-start gap-4">
  <div className="flex flex-col gap-1">
    <span className="text-xs font-bold text-sub">我的银子</span>
    <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
      <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
      {(currentUser?.assetBalance ?? 0).toLocaleString("zh-CN")}
    </div>
    <span className="text-xs font-bold text-sub">个人长期累计资产，不是团队公共钱包。</span>
  </div>
</div>
```

Replace the two KPI rows with:

```tsx
<div className="flex justify-between items-start gap-3 text-sm font-bold">
  <span className="flex flex-col">
    <span>连签</span>
    <span className="text-xs text-sub">连续有效健身打卡</span>
  </span>
  <span className="text-slate-700">{currentUser?.currentStreak ?? 0} 天</span>
</div>
<div className="flex justify-between items-start gap-3 text-sm font-bold">
  <span className="flex flex-col">
    <span>下次奖励</span>
    <span className="text-xs text-sub">下一次有效打卡可得</span>
  </span>
  <span className="text-slate-700">{currentUser?.nextReward ?? 0} 银子</span>
</div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- __tests__/profile-dropdown.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add __tests__/profile-dropdown.test.tsx components/punch-board/TeamHeader.tsx components/navbar/ProfileDropdown.tsx
git commit -m "polish economy copy"
```

---

### Task 5: Responsive Safety Pass

**Files:**
- Modify: `app/globals.css`
- Modify: `__tests__/shared-board-css.test.ts` or create `__tests__/p3-responsive-css.test.ts`

- [ ] **Step 1: Add failing CSS regression test**

Create `__tests__/p3-responsive-css.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("P3 responsive CSS", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("keeps the team header usable on narrow screens", () => {
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain(".team-header");
    expect(css).toContain("flex-direction: column");
    expect(css).toContain(".team-header-account");
    expect(css).toContain("width: 100%");
  });

  it("keeps the profile dropdown inside the mobile viewport", () => {
    expect(css).toContain(".dropdown-menu");
    expect(css).toContain("max-width: calc(100vw - 2rem)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/p3-responsive-css.test.ts
```

Expected: FAIL because the new mobile rules do not exist yet.

- [ ] **Step 3: Add responsive CSS**

In `app/globals.css`, update `.dropdown-menu`:

```css
.dropdown-menu {
  position: absolute;
  top: calc(100% + 15px);
  right: 0;
  width: 280px;
  max-width: calc(100vw - 2rem);
  background-color: white;
  border: 4px solid #1f2937;
  border-radius: 1.5rem;
  box-shadow: 0 8px 0 0 #1f2937;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease-out;
  z-index: 100;
}
```

Add this media block after the existing `@media (max-width: 1180px)` block:

```css
@media (max-width: 760px) {
  body {
    overflow: auto;
  }

  .team-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem;
  }

  .team-header > .mx-2 {
    margin-inline: 0;
    max-width: none;
    width: 100%;
  }

  .team-header-account {
    width: 100%;
    border-left: 0;
    border-top: 2px solid #f1f5f9;
    padding-left: 0;
    padding-top: 1rem;
  }

  .team-header-account-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dropdown-menu {
    right: 0;
  }
}
```

- [ ] **Step 4: Run CSS test to verify it passes**

Run:

```bash
npm test -- __tests__/p3-responsive-css.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css __tests__/p3-responsive-css.test.ts
git commit -m "polish p3 mobile layout"
```

---

### Task 6: Full Verification and Browser Check

**Files:**
- No expected source changes unless verification finds a defect.

- [ ] **Step 1: Run targeted P3 tests**

Run:

```bash
npm test -- __tests__/season-admin-panel.test.tsx __tests__/season-progress-bar.test.tsx __tests__/profile-dropdown.test.tsx __tests__/p3-responsive-css.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 4: Start the development server**

Run:

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`.

- [ ] **Step 5: Browser-check P3 surfaces**

Open `http://localhost:3000` and inspect:

- desktop board header: economy labels are readable and no text overlaps.
- mobile board header at around 390px width: sections stack and stay inside the viewport.
- Profile dropdown on mobile: menu stays inside viewport and buttons remain clickable.
- `/admin` desktop and mobile: form, current season, history, and feedback blocks remain readable.

- [ ] **Step 6: Stop the development server**

Stop the `npm run dev` session with `Ctrl-C`.

- [ ] **Step 7: Commit any verification fixes**

If verification required fixes, commit them:

```bash
git add app/globals.css components/admin/SeasonAdminPanel.tsx components/navbar/ProfileDropdown.tsx components/punch-board/SeasonProgressBar.tsx components/punch-board/TeamHeader.tsx __tests__/p3-responsive-css.test.ts __tests__/profile-dropdown.test.tsx __tests__/season-admin-panel.test.tsx __tests__/season-progress-bar.test.tsx
git commit -m "fix p3 polish verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage:
  - Admin season page: Task 1 and Task 2.
  - Board economy semantics: Task 4.
  - Season progress copy states: Task 3.
  - Profile dropdown: Task 4.
  - Mobile safety: Task 5 and browser check in Task 6.
  - Tests and typecheck: Task 6.
- Scope check:
  - No database schema changes.
  - No settlement rule changes.
  - No team dynamics, weekly report, WeCom integration, shop, ranking, achievement, or Quest scope.
- Type consistency:
  - Uses existing `SeasonListItem`, `SeasonStatus`, `ActiveSeasonSnapshot`, and `BoardContribution` shapes.
  - Uses existing test setup patterns from Vitest + jsdom.
