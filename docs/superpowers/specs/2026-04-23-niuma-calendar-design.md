# Niuma Calendar Design

## Goal

Add a new top-level tab named `牛马日历` that gives each user a clean monthly view of their two daily record types:

- fitness check-in status
- coffee cup count

The page should behave like a lightweight monthly record viewer, not a new action surface, report dashboard, or editing tool.

## Problem Statement

The product currently separates daily actions across:

- `协同打卡` for fitness check-in
- `续命咖啡` for coffee logging
- `战报中心` for summary and trend reporting

What is missing is a personal calendar view that answers a simpler question:

> This month, on which days did I work out, drink coffee, or do both?

That need does not belong inside `战报中心`, because the calendar is a raw record view rather than a summary dashboard. It also should not be folded into the existing fitness action surface, because that would mix operation and historical browsing in the same page.

## Product Decision

Add `牛马日历` as a new top-level tab alongside:

- `协同打卡`
- `共享看板`
- `续命咖啡`
- `战报中心`

The new tab is responsible only for personal monthly history viewing.

It does not:

- create new records
- edit existing records
- show day detail drawers or dialogs
- replace the report center

## Success Criteria

The feature is successful when all of the following are true:

- the navbar exposes a new top-level `牛马日历` entry
- the page defaults to the current month
- the user can navigate to previous months and back to the current month
- the user cannot navigate into future months
- each day cell can show both fitness and coffee records at the same time
- a day with no records stays visually blank
- clicking a day cell does nothing
- the page reads clearly in one scan without relying on tutorials, empty hints, or modal details

## Information Architecture

Top-level navigation after this change:

- `协同打卡`: daily fitness action page
- `共享看板`: shared team board
- `续命咖啡`: daily coffee action page
- `牛马日历`: personal monthly record view
- `战报中心`: aggregated summary and trends

This separation is intentional:

- action pages remain action pages
- the calendar remains a history browser
- the report center remains an analytics surface

## Page Structure

Recommended structure:

1. Page header
2. Lightweight monthly summary
3. Monthly calendar grid

### Header

The header contains:

- page title: `牛马日历`
- current viewing month label, such as `2026年4月`
- month navigation controls

Navigation controls:

- `上个月`
- `回到本月` when the user is not already viewing the current month

There is no control that moves into a future month.

### Monthly Summary

Place two compact summary stats below the header:

- `本月练了 X 天`
- `本月喝了 X 杯`

These numbers summarize the currently viewed month only.

### Calendar Grid

Use a standard seven-column month grid with weekday headers.

Rules:

- the grid includes leading blank slots when the first day of the month does not start on the first column
- current-month future dates still appear inside the grid
- future dates remain empty because no record interaction exists on this page

## Day Cell Design

Each day cell is a quiet visual container with three layers of information:

1. date number
2. fitness marker
3. coffee icons

### Date Number

- shown in the top-left area of the cell
- readable but not dominant
- today may receive a light emphasis, but it must not overpower the record content

### Fitness Marker

Fitness only expresses binary status:

- worked out
- did not work out

Do not show:

- workout type
- labels such as `已练`
- score, streak, or extra copy

The positive state should use a clear but compact mark, such as a check or stamp-like completion symbol. The negative state stays absent rather than rendering `未练`.

### Coffee Marker

Coffee uses the generated pixel-art icon saved at:

`/assets/calendar/coffee-pixel-16bit-v1.png`

Rules:

- show exactly as many icons as cups recorded that day
- do not collapse to `3+`
- allow the icons to wrap within the day cell when needed
- do not convert cups into text labels or counters for the primary cell display

### Empty State

If a day has neither fitness nor coffee data, leave the cell blank except for the date number.

Do not show:

- `无`
- `未打卡`
- helper placeholders
- hover instructions

## Visual Direction

The page should remain consistent with the existing brutalist product language, but the density and tone should be calmer than the action pages.

Guidelines:

- keep the page clean and scannable
- avoid decorative explanation cards
- avoid tooltips or onboarding copy for the base version
- give fitness and coffee roughly equal visual weight
- avoid making either record type the obvious primary actor

The result should feel like a monthly record board, not a dashboard and not a form.

## Interaction Rules

This page is display-only.

Rules:

- clicking a day cell does nothing
- no modal, drawer, popover, or inline expansion is triggered
- no edit, backfill, or delete action is exposed here
- no hover-only content is required to understand the day state

Month navigation rules:

- default to current month
- allow moving backward into history
- allow returning to the current month
- do not allow moving past the current month

## Data Requirements

The calendar consumes existing app state only.

For each visible day, the UI needs exactly:

- `workedOut: boolean`
- `coffeeCups: number`

The page is a daily aggregation surface. It should not care about finer event detail once the day-level values are computed.

## Data Derivation Rules

### Current User

The page always renders records for the current logged-in member, not for the whole team.

### Fitness

For each date in the viewed month:

- `workedOut = true` if the current user has a fitness punch record on that date
- otherwise `workedOut = false`

No workout subtype is shown even if future schemas later add one.

### Coffee

For each date in the viewed month:

- `coffeeCups` equals the stored number of cups for that user on that date
- if no coffee record exists, `coffeeCups = 0`

### Monthly Summary Totals

For the viewed month:

- `workoutDays = count of dates where workedOut === true`
- `coffeeCupTotal = sum of coffeeCups`

## Component Boundaries

Introduce a dedicated calendar module instead of placing this work under existing report or punch folders.

Recommended structure:

```text
components/calendar/
  CalendarBoard.tsx
  calendar-data.ts
  CalendarHeader.tsx
  CalendarGrid.tsx
  CalendarDayCell.tsx
```

Responsibilities:

- `CalendarBoard.tsx`
  - top-level page component for the tab
  - reads board state once
  - owns current month state
- `calendar-data.ts`
  - pure derivation helpers
  - computes month boundaries, visible cells, and monthly totals
- `CalendarHeader.tsx`
  - title, month label, and month navigation
- `CalendarGrid.tsx`
  - weekday header plus month grid layout
- `CalendarDayCell.tsx`
  - date number, fitness marker, and wrapped coffee icons

This module should not live under `report-center/`, because it is not report content. It should also not be embedded into `punch-board/`, because it is not a fitness action surface.

## State and Routing Boundaries

Minimal app changes:

- extend `AppTab` with a new calendar tab value
- add the new navbar tab
- mount the new calendar page inside `app/(board)/page.tsx`

The calendar page itself should keep only light local UI state:

- currently viewed month

No new reducer branch is required unless implementation discovers that month state must be shared elsewhere.

## Non-Goals

This version does not include:

- day detail overlays
- click-to-edit interactions
- training type display
- future month browsing
- report-style trend charts inside the calendar page
- team-wide calendar comparisons
- database schema changes

Implementation note: historical month navigation uses a narrow read-only route, `GET /api/calendar/state?month=YYYY-MM`, because current-month-only snapshots cannot represent past months accurately. Keep that route private to the calendar feature.

## Testing Scope

Focus tests on behavior with real value:

- month navigation never moves into the future
- historical month navigation works
- monthly summary totals match rendered data
- day cells correctly render fitness-only, coffee-only, both, and empty states
- coffee cups render as repeated icons rather than collapsed labels

UI snapshot coverage is optional. Behavioral coverage matters more than pixel-perfect assertions for v1.

## Rollout Notes

Implement this as a narrow read-only feature first.

That means:

- reuse existing state and persistence
- avoid new write flows
- keep the page simple enough that users understand it immediately

If the page later proves useful, richer history features can be considered separately. They are intentionally out of scope for this design.
