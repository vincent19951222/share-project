# Report Center Light Dashboard Design

## Goal

Turn the current `战报中心` from a mostly static prototype panel into a lightweight team dashboard powered by the existing `BoardState`.

The page should feel quick and readable: open it, understand the team's recent rhythm, see one or two useful highlights, and leave. It should not become a heavy monthly report system, workflow tool, or analytics product.

## Problem Statement

The current report center visually matches the prototype, but its content is still placeholder-heavy:

- fixed title such as `OCTOBER REPORT`
- fixed score and metric values
- fake highlight copy such as `Bob` and `Dave`
- hardcoded trend points and October date labels

That makes the tab look finished while still reflecting demo data. The redesign should keep the existing route and component boundary, but make the whole page data-aware.

## Product Scope

This redesign covers only the current report-center tab and only with data that already exists in memory.

Included:

- rewrite the report center content structure into a lightweight dashboard
- derive visible values from `BoardState`
- keep the existing `components/report-center/` module boundary
- add focused tests for data derivation and render coverage

Not included:

- new API routes
- new database tables or persistence
- archives, exports, date-range pickers, or leaderboards
- task / quest integration
- `teamCoins -> gp` migration

## Success Criteria

The redesign is successful when all of the following are true:

- every visible summary value in `战报中心` is derived from current `BoardState`
- placeholder content such as `OCTOBER REPORT`, `+12,450`, `Bob`, `Dave`, and fixed October axis labels is gone
- the page remains readable on desktop and small widths
- the tab still feels consistent with the product's brutalist style
- existing `健身打卡` and `共享看板` behavior is unaffected

## Information Hierarchy

Recommended content order:

1. Header summary
2. Four compact metric cards
3. Main activity trend chart
4. Three lightweight highlight cards

The chart remains the visual anchor. The cards explain the chart; they must not compete with it.

## Data Source

The first version must use only the existing `BoardState` fields:

- `members`
- `gridData`
- `teamCoins`
- `targetCoins`
- `today`
- `totalDays`

No client fetch, no API call, and no separate report-specific store is required.

## Data Derivation Rules

These rules are part of the spec, not left to implementation taste.

### Time Window

- Internal calculations use zero-based `dayIndex`.
- UI labels use one-based day numbers.
- `elapsedDays = clamp(state.today, 0, state.totalDays)`.
- Only columns with `dayIndex < elapsedDays` are counted.
- Future columns must be ignored even if they contain `true`.

### Core Metrics

- `elapsedMemberDays = members.length * elapsedDays`
- `totalPunches = count of all elapsed cells where value === true`
- `completionRate = round(totalPunches / elapsedMemberDays * 100)`
- If `elapsedMemberDays === 0`, `completionRate = 0`
- `fullAttendanceDays = count of elapsed days where punched member count === members.length`
- If `members.length === 0`, `fullAttendanceDays = 0`

### Trend Data

- `dailyPoints` contains one point per elapsed day, ordered from day 1 to `elapsedDays`
- Each point includes:
  - `day`
  - `count`
  - `isFullAttendance`
  - `isPeak`
  - `isLow`
- `peakDay` is the earliest elapsed day with the maximum punch count
- `lowDay` is the earliest elapsed day with the minimum punch count
- If there are no elapsed days, `dailyPoints = []`, `peakDay = null`, and `lowDay = null`

### Highlight Selection

- `mostConsistentMember` means the member with the longest consecutive `true` streak inside the elapsed window
- This is overall longest streak, not current streak
- Ties are resolved by existing member order in `state.members`
- If nobody has a positive streak, the "本月高光" card must use a neutral fallback

### Vault Progress

- `teamVault.current = state.teamCoins`
- `teamVault.target = state.targetCoins`
- `teamVault.progress = clamp(round(current / target * 100), 0, 100)`
- If `target <= 0`, progress must be `0`

## Content Rules

### Header

The header should answer "how are we doing this month?" in one sentence.

Example:

```text
本月打卡 124 次，全勤 12 天，团队节奏稳住了。
```

Rules:

- Title must be derived from current render time, not hardcoded.
- `APRIL DASHBOARD` is acceptable for v1 if it reflects the actual month.
- Summary sentence must use real totals.
- The right-side progress block should use current vault values and align with the product vocabulary. `牛马金库` is preferred over a generic score label.

### Metric Cards

Use exactly four compact cards:

- `团队完成率`
- `总打卡次数`
- `全勤日`
- `本月高光`

Rules:

- Values come from the derived report object only.
- Helper copy is short, explanatory, and friendly.
- If week-over-week comparison data is unavailable, omit it rather than inventing it.
- If there is no highlight yet, show a neutral fallback such as `暂无高光`.

### Activity Trend Chart

The trend chart is the page's main visual.

Rules:

- Show daily punched member count from day 1 through `elapsedDays`
- Keep SVG rendering; do not add an external chart library
- Include subtle grid lines
- Use a bold yellow trend line
- Use stronger markers for full-attendance days
- Show peak and low summaries near or below the chart
- Tick labels should stay sparse enough to avoid clutter
- If there are 1-3 points, showing every tick is acceptable
- If there are more than 3 points, first / middle / last tick labels are enough for v1
- When no points exist, render a clear empty state instead of an empty polyline

### Highlight Cards

Render exactly three lightweight highlight cards:

- `气氛组播报`
- `团队小结`
- `轻提醒`

Rules:

- Copy should be derived from peak day, low day, completion rate, and available streak data
- Tone should be warm and observational, not judgmental
- Avoid fake specificity when the state does not support it
- Avoid pressure, KPI language, and long jokes

## Component Boundaries

Keep the current module boundary:

```text
components/report-center/
  ReportCenter.tsx
  ReportHeader.tsx
  Milestones.tsx
  Highlights.tsx
  TrendChart.tsx
  report-data.ts
```

Responsibilities:

- `report-data.ts`
  - pure calculation module
  - no React imports
  - exports `buildReportData(state, now?)` and related types
- `ReportCenter.tsx`
  - the only report-center component allowed to read `useBoard()`
  - builds `reportData` once with `useMemo`
  - owns page-level layout
- `ReportHeader.tsx`
  - presentational component for title, summary, and vault progress
- `Milestones.tsx`
  - presentational component for the four metric cards
- `TrendChart.tsx`
  - presentational SVG chart fed by derived `dailyPoints`
- `Highlights.tsx`
  - presentational component for the three highlight cards

Subcomponents should not read store state directly and should not re-derive report values on their own.

## Layout

Desktop layout:

```text
Header
Metric cards: 4 columns
Main area: trend chart (2/3) + highlight stack (1/3)
```

Responsive behavior:

- metric cards wrap to two columns on medium widths and one column on small widths
- chart and highlight stack collapse to one column on smaller screens
- text should wrap inside cards and never depend on fixed English-length copy
- the page remains scrollable inside the existing report center container

## Visual Direction

Preserve the existing product language:

- bold type
- thick borders
- yellow accent
- rounded but not overly soft cards

Additional constraints:

- highlight cards should feel lighter than the chart
- avoid purple-heavy palettes as the dominant accent
- do not keep decorative prototype filler such as fake milestone art if it competes with real data
- avoid nested-card clutter and marketing-style sections

## Accessibility And Robustness

- chart should expose a readable `aria-label`
- empty states must render usable text, not blank boxes
- long helper text should wrap without overflow
- zero-data and sparse-data states must not throw or render `NaN`

## Testing And Verification

Implementation should verify:

- representative `gridData` produces correct totals, completion rate, streak highlight, and full-attendance count
- elapsed-day clamping works and future columns are ignored
- tie-breaking for `peakDay`, `lowDay`, and `mostConsistentMember` is deterministic
- empty or sparse data renders safe fallbacks
- the chart renders from real `dailyPoints`, not fixed demo points
- the final render no longer contains the old placeholder strings
- existing tab switching still works
- existing punch-board behavior is unaffected
