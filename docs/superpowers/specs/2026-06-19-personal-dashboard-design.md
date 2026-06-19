# Personal Dashboard Design

## Goal

Transform the existing `牛马日历` tab from a simple monthly record viewer into a personal Dashboard that gives the current user a comprehensive view of their fitness and hydration activity.

The Dashboard should answer three questions at a glance:

1. How much have I worked out recently, and is my training balanced across body parts and cardio types?
2. How much have I drunk, and what kinds of drinks make up my hydration?
3. What does my long-term activity pattern look like over the year?

It keeps the monthly calendar as a navigation and detail anchor, but adds summary cards, balance charts, drink breakdown, and a yearly activity heatmap.

## Problem Statement

The current `牛马日历` page only shows two binary signals per day:

- did I work out?
- did I drink anything?

This wastes the richer data already stored in the database:

- `WorkoutRecord` stores training type (`cardio` / `strength` / `both`), duration, and per-entry body parts / cardio items.
- `DrinkRecord` stores drink type (`water`, `milkTea`, `americano`, `latte`, `other`).

Users have no way to see:

- monthly or yearly workout totals
- whether they are over-training some body parts and neglecting others
- how their hydration composition breaks down
- their year-long consistency at a glance

The calendar also mixes workout and drink markers in the same day cell, which works for a quick scan but becomes crowded when more detail is added.

## Product Decision

Replace the `牛马日历` page with a personal Dashboard while keeping the tab name `牛马日历` and its position in the top navigation.

The Dashboard is a read-only personal analytics surface. It does not create, edit, or delete records. Those actions remain on the existing `健身打卡` and `牛马水铺` tabs.

The page supports two time scopes via a top-level toggle:

- **本月**: current month summaries and the current month calendar
- **本年**: year-to-date summaries and the full-year heatmap

The yearly heatmap and monthly calendar are always visible regardless of the selected scope. The scope toggle only changes the summary cards, workout balance chart, and drink breakdown chart.

## Success Criteria

The redesign is successful when all of the following are true:

- the tab is still named `牛马日历` and reachable from the navbar
- the page shows summary cards for workouts and drinks for the selected scope
- the page shows a workout balance chart with 7 strength parts and 4 cardio items
- the page shows a drink breakdown by type
- the page shows a full-year GitHub-style activity heatmap
- the page shows an enhanced monthly calendar
- the calendar uses a lightweight tooltip on hover (desktop) or tap (mobile) instead of a modal
- switching between `本月` and `本年` updates the summary cards and charts
- the page works with real data from the existing database tables
- the existing brutalist visual language is preserved

## Information Architecture

Top-level navigation remains unchanged:

- `健身打卡`
- `牛马水铺`
- `共享看板`
- `牛马日历` (now Dashboard)
- `战报中心`
- `牛马补给站`

The Dashboard is a personal view, not a team view. It always shows data for the currently logged-in user.

## Page Structure

Recommended vertical layout:

1. Header with title, subtitle, and period toggle (`本月` / `本年`)
2. Summary cards row
   - workout card: days worked out + total minutes
   - drink card: total cups
3. Charts row
   - workout balance chart
   - drink breakdown chart
4. Full-year activity heatmap
5. Monthly calendar

### Header

- title: `牛马日历`
- subtitle: `个人看板`
- period toggle: two-segment control with `本月` and `本年`
- default selection: `本月`

### Summary Cards

Each card has:

- a category icon and label
- one large primary number
- a unit
- one secondary metric

Workout card:

- primary: number of days worked out in the selected scope
- secondary: total training minutes in the selected scope

Drink card:

- primary: total cups in the selected scope
- secondary: a light personality line such as `你是最懂补水的人`

### Workout Balance Chart

Display 11 vertical bars:

- 7 strength parts in order: chest, back, shoulder, arms, glutes, legs, abs
- 4 cardio items in order: treadmill, elliptical, walk, swim

Use yellow tones for strength and cyan tones for cardio to create clear visual separation. Each bar shows the count of workouts that included that part / item in the selected scope.

### Drink Breakdown Chart

Display horizontal bars or rows for each drink type:

- water
- milkTea
- americano
- latte
- other

Use the drink catalog colors already defined in the product. Show both count and relative proportion.

### Full-Year Activity Heatmap

A GitHub-style grid with:

- 7 rows (Monday to Sunday)
- as many columns as needed for the full year
- one cell per day
- 5 intensity levels from empty to most active
- month labels aligned with the first week of each month
- a legend from `少` to `多`

Intensity is derived from a combination of workout duration and drink count for that day.

### Monthly Calendar

Keep the existing month grid, but simplify each day cell:

- date number
- a `练` chip if the user worked out that day
- duration in minutes if worked out
- a small drink dot if any drinks were logged
- drink count only if more than one drink

Detailed information (workout type, body parts, drink types and counts) appears in a tooltip on hover (desktop) or tap (mobile). The tooltip is a small bubble above the cell, not a modal.

## Day Cell Design

### Default State

A cell with no activity shows only the date number and the existing empty mark.

### Workout State

When the user worked out:

- show the `练` chip in the top-right
- show the duration below the date number, e.g. `45′`

Do not list body parts inside the cell. That information moves to the tooltip.

### Drink State

When the user logged drinks:

- show a small colored dot below the workout marker (or alone if no workout)
- show the total cup count only if greater than 1

Do not show individual drink icons inside the cell. That information moves to the tooltip.

### Today

Today receives the existing today highlight style.

## Tooltip Design

The tooltip is a small bubble that appears above the cell:

- full date
- workout section: training type, cardio item, strength parts, duration
- drink section: each drink type with count

On desktop it appears on hover and disappears on mouse leave.
On mobile it appears on tap and disappears when tapping outside the cell or another cell.

## Visual Direction

Preserve the existing brutalist product language:

- thick dark borders
- yellow accent color (`#fde047`)
- hard drop shadows
- rounded corners
- Quicksand + Noto Sans SC typography

Keep the calendar page decorative props (binder rings, clip, highlighter, sticker, note, stamp, coffee stain) because the Dashboard replaces the calendar page and should retain its familiar physical-desk metaphor.

## Interaction Rules

- the page is read-only
- the period toggle updates summary cards and charts only
- the heatmap is always the full current year
- the calendar is always the current month
- future months are not navigable
- historical months are not navigable in this version; the calendar is fixed on the current month
- clicking a calendar cell shows a tooltip, not a modal or drawer
- no editing, creating, or deleting records from this page

## Data Requirements

The Dashboard reuses existing records only. No new database tables are required.

### Workout Data

For the selected scope:

- count of distinct days with `punched === true` and an associated `WorkoutRecord`
- sum of `durationMinutes`
- count per `WorkoutEntry.code` grouped by `category`

### Drink Data

For the selected scope:

- total count of `DrinkRecord` rows with `deletedAt === null`
- count per `drinkType`

### Heatmap Data

For every day of the current calendar year:

- total workout minutes
- total drink cups
- derived intensity level

### Calendar Data

For the current month:

- day-level workout status
- day-level workout type, cardio item, strength parts, duration
- day-level drink counts by type

## Data Derivation Rules

### Scope

- `本月`: aggregate records whose `dayKey` starts with the current month key (`YYYY-MM`)
- `本年`: aggregate records whose `dayKey` starts with the current year (`YYYY`)

### Timezone

All `dayKey` values are computed in `Asia/Shanghai` using the existing `getShanghaiDayKey` helper.

### Drink Type Safety

If a stored `drinkType` is not one of the known values, count it as `other`.

### Workout Balance Ordering

Strength parts follow the canonical order defined in `lib/workouts.ts`. Cardio items follow their canonical order. This keeps the chart stable across different users and time periods.

## Component Boundaries

Reuse the existing `components/dashboard/` prototype module created during the visual exploration phase. The production version removes mock data and connects the same components to the real API.

Responsibilities:

- `DashboardBoard.tsx`: top-level container, manages period state and data fetching
- `DashboardHeader.tsx`: title, subtitle, period toggle
- `MetricCards.tsx`: workout and drink summary cards
- `WorkoutBalanceChart.tsx`: 11-bar balance chart
- `DrinkBreakdownChart.tsx`: drink type breakdown
- `ActivityHeatmap.tsx`: full-year heatmap
- `MonthCalendar.tsx`: current month grid with tooltips
- `DayTooltip.tsx`: per-day detail bubble
- `dashboard-data.ts`: pure view helpers (heatmap grid, intensity levels, calendar grid)
- `lib/dashboard-state.ts`: backend aggregation layer
- `app/api/dashboard/state/route.ts`: single API endpoint

## State and Routing Boundaries

- extend `BoardApp` so that `activeTab === "calendar"` renders the new `DashboardBoard`
- remove the temporary `/ui-lab/dashboard` prototype route
- keep the URL as `/calendar`
- the Dashboard holds only local UI state: selected period and fetched snapshot

## Non-Goals

This version does not include:

- navigating to past or future months in the calendar
- editing records from the Dashboard
- creating records from the Dashboard
- team comparisons
- goal setting or target progress
- push notifications
- database schema changes
- new charting libraries

## Testing Scope

Focus on behavioral coverage:

- aggregator produces correct monthly and yearly summaries
- aggregator groups workout entries by code and drink records by type
- heatmap intensity levels map correctly from activity data
- API returns 401 without a valid cookie
- API returns snapshot with valid cookie
- `DashboardBoard` fetches data when period changes
- calendar cells render workout and drink indicators
- tooltips appear on hover / click

## Rollout Notes

This is a page replacement, not an additive feature. The old `CalendarBoard` component can be removed once the Dashboard is live, unless other parts of the app import it.

Because the underlying data already exists, the rollout is primarily a presentation-layer change. No migration or backfill is required.
