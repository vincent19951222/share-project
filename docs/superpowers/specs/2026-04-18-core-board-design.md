# Core Board Page Design

## Goal

Pixel-perfect migration of `design/prototype.html` into a Next.js 15+ App Router project. The prototype is a team punch-card dashboard ("Room Todo") with two views: collaborative punch board and report center.

## Tech Stack

- Next.js 15+ (App Router, `app/` directory)
- TypeScript (strict)
- Tailwind CSS v4 (local install, not CDN)
- React Context + useReducer for state management
- No external UI libraries

## Project Structure

```
app/
  layout.tsx              — Global layout (fonts, Tailwind, background pattern)
  page.tsx                — Core board page (maps to prototype.html)
  globals.css             — Global styles (body bg, soft-card, cell, animations)

components/
  navbar/
    Navbar.tsx            — Top nav container (Logo + Tabs + ProfileDropdown)
    ProfileDropdown.tsx   — Profile dropdown (coins, achievements, settings)
  punch-board/
    PunchBoard.tsx        — Punch view container
    TeamHeader.tsx        — Zone A: team vault, progress bar, today rate
    HeatmapGrid.tsx       — Zone B: member column + day header + grid matrix + punch popup
    ActivityStream.tsx    — Zone C: log stream + poke buttons + toast notification
  report-center/
    ReportCenter.tsx      — Report view container
    ReportHeader.tsx      — Report title + team score
    Milestones.tsx        — Team milestone card (burger stat, punch count, attendance)
    Highlights.tsx        — Monthly cheerleader + early bird cards
    TrendChart.tsx        — Activity trend SVG line chart
  ui/
    QuestBtn.tsx          — Brutalist yellow button (press-down effect)
    TabBtn.tsx            — Tab switch button
    PunchPopup.tsx        — Punch action selector popup (strength/cardio/stretch)
    Toast.tsx             — Bottom-right toast notification
    SvgIcons.tsx          — All SVG icon constants extracted from prototype JS

lib/
  types.ts                — TypeScript type definitions
  mock-data.ts            — Mock data (members, grid, logs)
  store.tsx               — BoardProvider Context + useReducer
  api.ts                  — Backend API abstraction layer (returns mock data now)
```

## Type Definitions

```typescript
interface Member {
  id: string;
  name: string;
  avatarSvg: string;
}

type CellStatus = boolean | null;  // true=punched, false=missed, null=future

interface ActivityLog {
  id: string;
  text: string;
  type: 'system' | 'success' | 'alert' | 'highlight';
  timestamp: Date;
}

interface BoardState {
  members: Member[];
  gridData: CellStatus[][];
  teamCoins: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  logs: ActivityLog[];
  activeTab: 'punch' | 'dash';
}
```

## State Management

`BoardProvider` (React Context + useReducer) wraps the page and manages:

- `members` — 5 team members (Alen, Bob, Cindy, Dave, Eva)
- `gridData` — 30-day punch grid matrix (5 members x 30 days)
- `teamCoins` / `targetCoins` — team vault progress
- `today` / `totalDays` — current day index (18) and total (30)
- `logs` — activity log stream
- `activeTab` — current view tab (punch / dash)

Actions: `PUNCH`, `ADD_LOG`, `SET_TAB`, `SIMULATE_REMOTE_PUNCH`, `SEND_POKE`.

## Backend API Abstraction

```typescript
export async function fetchTeamData(): Promise<TeamData>
export async function submitPunch(memberId: string, type: string): Promise<PunchResult>
export async function fetchLogs(): Promise<ActivityLog[]>
export async function sendPoke(memberId: string): Promise<void>
```

All functions currently return `Promise.resolve(mockData)`. Future backend integration requires changing only this file — zero component changes.

## Interactions to Preserve

1. Click "+" on own cell -> show punch popup (strength / cardio / stretch)
2. Select action -> punch cell, team coins +15, coin bump animation
3. Auto-scroll grid to today's column on load
4. Poke buttons for unpunched members in activity stream
5. After 5 seconds, simulate Bob's remote punch with toast notification
6. Tab switching between punch board and report center
7. Profile dropdown toggle (coins, achievements, app link, reminder time)
8. Click outside to close all popups and dropdowns

## Style Migration

### From prototype `<style>` to `globals.css`:

- `body` background (dot pattern `radial-gradient`)
- `.soft-card` — card container style
- `.quest-btn` + `:active` — button press-down
- `.tab-btn` / `.active` / `.inactive` — tab states
- `.cell-missed` / `.cell-future` / `.cell-punched` / `.cell-today` — grid cell states
- `.my-punch-btn` + `@keyframes pulse-border` — pulse animation
- `.punch-popup` / `.dropdown-menu` — popup animations
- `.no-scrollbar` — hide scrollbar
- `.animate-bump` + `@keyframes coinBump` — coin bounce

### Inline Tailwind classes:

All Tailwind utility classes in the prototype HTML are preserved as-is in component JSX.

### SVG icons:

Entire `SvgIcons` object extracted to `components/ui/SvgIcons.tsx`, no changes to icon markup.

### Fonts:

Google Fonts (Quicksand + Noto Sans SC) loaded via `<link>` in `layout.tsx`.

## What This Spec Does NOT Include

- Responsive/mobile adaptation (desktop-first, matching prototype)
- Login page implementation (separate future task)
- Dark mode
- Any external UI component library
- Route navigation between pages
