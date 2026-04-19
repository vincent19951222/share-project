# Report Center Light Dashboard Design

## Goal

Turn the current `战报中心` from a mostly static prototype panel into a lightweight team dashboard.

The page should feel easy and playful: open it, understand the team's recent rhythm, smile at one or two team highlights, and leave. It should not become a heavy monthly report system, task workflow, or analytics product.

## Direction

Use the existing visual foundation:

- Keep the dashboard-style card layout.
- Keep the activity trend chart as the main visual anchor.
- Keep the bold, rounded, brutalist product language already used by the punch board.
- Replace placeholder/static report copy with data-aware, team-specific content.

Recommended information hierarchy:

1. Header summary
2. Four lightweight metric cards
3. Main activity trend chart
4. Small right-side highlight cards

## Page Content

### Header

The header should answer "how are we doing this month?" in one sentence.

Example:

```text
本月打卡 124 次，全勤 12 天，团队节奏稳住了。
```

The header should also show team vault progress, using the existing `teamCoins` and `targetCoins` values.

Avoid generic text such as `OCTOBER REPORT` unless the month is derived from the current context. If the page keeps an English title, use a current, neutral label such as `TEAM DASHBOARD`.

### Metric Cards

Use four compact cards:

- `团队完成率` — completed punch cells divided by elapsed member-days
- `总打卡次数` — count of punched cells through today
- `全勤日` — days where every member punched
- `本月高光` — one lightweight member/team highlight

The cards should explain the chart rather than compete with it. Short helper lines are enough.

Examples:

```text
团队完成率 82% / 比上周 +6%
总打卡次数 124 / 5 人 · 18 天
全勤日 12 / 全员亮灯的日子
本月高光 最稳：li / 连续 15 天没掉链子
```

If week-over-week comparison data is unavailable, omit the comparison instead of faking it.

### Activity Trend Chart

The trend chart is the primary content. It should show daily punched member count from day 1 through `today`.

Keep it SVG-based for now. No external charting library is needed.

The chart should include:

- Subtle grid lines
- A bold yellow trend line
- Markers for full-attendance days
- Labels or nearby summary copy for peak and low points
- Date/day ticks that fit without clutter

The chart should not use hardcoded October labels or fixed points.

### Highlight Cards

Use two or three small cards beside or below the chart.

Suggested cards:

- `气氛组播报` — a light team-flavored observation
- `团队小结` — one plain-language interpretation of the trend
- `轻提醒` — a soft note about weak spots, not a task assignment

Examples:

```text
最近 7 天波动变小，说明节奏正在稳定。
低谷通常出现在周末，提前约一波会更稳。
```

Keep the tone friendly. Avoid shame, pressure, formal KPI language, or overly elaborate jokes.

## Data Derivation

The first version can derive all report data from the existing `BoardState`:

- `members`
- `gridData`
- `teamCoins`
- `targetCoins`
- `today`
- `totalDays`

Useful derived values:

- `elapsedDays = today`
- `elapsedMemberDays = members.length * elapsedDays`
- `totalPunches = count(true cells from day 1 through today)`
- `completionRate = totalPunches / elapsedMemberDays`
- `fullAttendanceDays = count(days where every member punched)`
- `dailyCounts = punched member count per day`
- `peakDay = day with highest daily count`
- `lowDay = elapsed day with lowest daily count`
- `mostConsistentMember = member with the longest current or overall streak`

If there is not enough data for a highlight, show a neutral fallback rather than fabricated specificity.

## Layout

Desktop layout:

```text
Header
Metric cards: 4 columns
Main area: trend chart (2/3) + highlight stack (1/3)
```

Responsive behavior:

- Metric cards wrap to two columns on medium widths and one column on small widths.
- Chart and highlight stack become a single column on smaller screens.
- Text wraps inside cards and should not overflow.
- The page remains scrollable inside the existing report center container.

## Component Shape

Keep the current module boundary:

```text
components/report-center/
  ReportCenter.tsx
  ReportHeader.tsx
  Milestones.tsx
  Highlights.tsx
  TrendChart.tsx
```

Suggested implementation refinement:

- Add a small report-data helper in `components/report-center/` or `lib/` if calculations become noisy.
- Prefer passing one derived report object into subcomponents.
- Keep each component presentational after data derivation.

No new route or API is required for the first version.

## Visual Notes

- Preserve the existing product style: bold type, thick borders, yellow accent, rounded but not overly soft cards.
- Avoid purple-heavy or one-note color palettes.
- Use color as emphasis, not as the only meaning.
- Keep highlight cards lighter than the chart.
- Avoid decorative blobs, nested cards, or marketing-style sections.

## Out Of Scope

This design does not include:

- A full monthly report archive
- Date range picker
- Export/share image
- Leaderboard system
- Task or quest integration
- New persistence tables
- New analytics API
- External charting library
- Admin controls

## Testing And Verification

Implementation should verify:

- Derived values are correct for representative `gridData`.
- Empty or sparse data does not crash the page.
- The chart renders from real daily counts, not fixed demo points.
- The page remains readable on desktop and small widths.
- Existing tab switching still works.
- Existing punch-board behavior is unaffected.
