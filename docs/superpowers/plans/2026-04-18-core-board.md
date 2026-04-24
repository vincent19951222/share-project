# Core Board Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-perfect migration of `design/prototype.html` into a Next.js 15+ App Router project with TypeScript and Tailwind CSS.

**Architecture:** Single-page app with React Context state management. The prototype is decomposed into ~20 focused components mapped 1:1 to visual zones. All styles are migrated from inline `<style>` to `globals.css`, all Tailwind utility classes preserved as-is.

**Tech Stack:** Next.js 15+, TypeScript, Tailwind CSS v4, React Context + useReducer, no external UI libs

**Source of truth:** `design/prototype.html` — every pixel, animation, and interaction must match.

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Project deps (next, react, tailwindcss) |
| `next.config.ts` | Next.js config |
| `tailwind.config.ts` | Tailwind content paths |
| `postcss.config.mjs` | PostCSS for Tailwind |
| `tsconfig.json` | TypeScript config |
| `app/layout.tsx` | Global layout: fonts, background, BoardProvider wrapper |
| `app/page.tsx` | Main page: Navbar + PunchBoard/ReportCenter view switch |
| `app/globals.css` | All global CSS classes from prototype `<style>` block |
| `lib/types.ts` | Member, CellStatus, ActivityLog, BoardState, Action types |
| `lib/mock-data.ts` | 5 members, grid init logic, seed log |
| `lib/store.tsx` | BoardProvider, useBoard hook, reducer |
| `lib/api.ts` | Backend abstraction (mock implementations) |
| `components/ui/SvgIcons.tsx` | All SVG icon string constants |
| `components/ui/QuestBtn.tsx` | Brutalist button component |
| `components/ui/TabBtn.tsx` | Tab button component |
| `components/ui/PunchPopup.tsx` | Punch action selector popup |
| `components/ui/Toast.tsx` | Toast notification component |
| `components/navbar/Navbar.tsx` | Top nav: logo, tabs, profile trigger |
| `components/navbar/ProfileDropdown.tsx` | Profile dropdown panel |
| `components/punch-board/TeamHeader.tsx` | Zone A: team vault, progress, rate |
| `components/punch-board/HeatmapGrid.tsx` | Zone B: member column, day header, grid matrix |
| `components/punch-board/ActivityStream.tsx` | Zone C: log stream, poke buttons |
| `components/punch-board/PunchBoard.tsx` | Punch view container |
| `components/report-center/ReportHeader.tsx` | Report title + team score |
| `components/report-center/Milestones.tsx` | Milestone card |
| `components/report-center/Highlights.tsx` | Highlight cards (cheerleader, early bird) |
| `components/report-center/TrendChart.tsx` | SVG line chart |
| `components/report-center/ReportCenter.tsx` | Report view container |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "share-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Quicksand", "Noto Sans SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.mjs**

```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

- [ ] **Step 6: Install dependencies**

Run: `cd E:/Projects/share-project && npm install`
Expected: node_modules created, no errors

- [ ] **Step 7: Commit**

```bash
git add package.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs package-lock.json
git commit -m "chore: scaffold Next.js 15 project with Tailwind CSS v4"
```

---

### Task 2: Global Styles & Layout

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`

- [ ] **Step 1: Create app/globals.css**

Migrate every CSS rule from `design/prototype.html` lines 12-174:

```css
@import "tailwindcss";

body {
  font-family: 'Quicksand', 'Noto Sans SC', sans-serif;
  background-color: #f8fafc;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: hidden;
}

.soft-card {
  background-color: #ffffff;
  border: 6px solid #f1f5f9;
  border-radius: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.quest-btn {
  background-color: #fde047;
  border: 3px solid #1f2937;
  border-radius: 9999px;
  box-shadow: 0 4px 0 0 #1f2937;
  color: #1f2937;
  font-weight: 800;
  transition: all 0.1s ease-in-out;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.quest-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 0 #1f2937;
}

.tab-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  font-weight: 800;
  transition: all 0.2s;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.tab-btn.active {
  background-color: #fde047;
  border: 2px solid #1f2937;
  box-shadow: 0 3px 0 0 #1f2937;
  color: #1f2937;
}
.tab-btn.inactive {
  background-color: transparent;
  color: #64748b;
}
.tab-btn.inactive:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.cell {
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border-radius: 0.75rem;
  position: relative;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.cell-missed { background-color: #f1f5f9; border: 2px solid #e2e8f0; color: #cbd5e1; }
.cell-future { background-color: transparent; border: 2px dashed #cbd5e1; }
.cell-punched {
  background-color: #fde047;
  border: 2px solid #1f2937;
  box-shadow: 0 3px 0 0 #1f2937;
  color: #1f2937;
}
.cell-today {
  background-color: #ffffff;
  border: 2px dashed #94a3b8;
  color: #94a3b8;
  cursor: pointer;
}
.cell-today:hover {
  border-color: #1f2937;
  border-style: solid;
  color: #1f2937;
  transform: translateY(-2px);
}

.my-punch-btn {
  background-color: #1f2937;
  border: 2px solid #1f2937;
  color: #fde047;
  box-shadow: 0 4px 0 0 #cbd5e1;
  animation: pulse-border 2s infinite;
}
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(253, 224, 71, 0); }
  100% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0); }
}

.punch-popup {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background-color: white;
  border: 3px solid #1f2937;
  border-radius: 1rem;
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 6px 0 0 #1f2937;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 50;
}
.punch-popup.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 15px);
  right: 0;
  width: 280px;
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
.dropdown-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

@keyframes coinBump {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); color: #f59e0b; }
  100% { transform: scale(1); }
}
.animate-bump { animation: coinBump 0.3s ease-out; }

.text-sub { color: #64748b; }
.text-main { color: #1e293b; }

.svg-icon svg { display: inline-block; }
```

- [ ] **Step 2: Create app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Todo - 团队打卡看板",
  description: "团队健身打卡与战报看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen w-screen flex flex-col p-4 gap-4 text-main relative">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on localhost:3000, blank page loads with dot-pattern background

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add global styles and layout with dot-pattern background"
```

---

### Task 3: Types, Mock Data & API Layer

**Files:**
- Create: `lib/types.ts`
- Create: `lib/mock-data.ts`
- Create: `lib/api.ts`

- [ ] **Step 1: Create lib/types.ts**

```typescript
export interface Member {
  id: string;
  name: string;
  avatarSvg: string;
}

export type CellStatus = boolean | null; // true=punched, false=missed, null=future

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface BoardState {
  members: Member[];
  gridData: CellStatus[][];
  teamCoins: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  logs: ActivityLog[];
  activeTab: "punch" | "dash";
}

export type BoardAction =
  | { type: "PUNCH"; memberIndex: number; dayIndex: number; punchType: string }
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "dash" }
  | { type: "SIMULATE_REMOTE_PUNCH"; memberIndex: number; typeDesc: string };
```

- [ ] **Step 2: Create lib/mock-data.ts**

```typescript
import { Member, CellStatus, ActivityLog } from "./types";

// Seeded random for deterministic mock data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createMembers(): Member[] {
  // Avatar SVGs will be populated from SvgIcons after Task 4
  return [
    { id: "A", name: "Alen", avatarSvg: "" },
    { id: "B", name: "Bob", avatarSvg: "" },
    { id: "C", name: "Cindy", avatarSvg: "" },
    { id: "D", name: "Dave", avatarSvg: "" },
    { id: "E", name: "Eva", avatarSvg: "" },
  ];
}

export function initGridData(
  memberCount: number,
  today: number,
  totalDays: number
): CellStatus[][] {
  const rand = seededRandom(42);
  const grid: CellStatus[][] = [];

  for (let i = 0; i < memberCount; i++) {
    const row: CellStatus[] = [];
    for (let day = 1; day <= totalDays; day++) {
      if (day < today) {
        row.push(rand() > 0.2);
      } else if (day === today) {
        // Alen and Bob haven't punched today; others have
        row.push(i === 0 || i === 1 ? false : true);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

export function createSeedLog(): ActivityLog {
  return {
    id: "seed-1",
    text: "WebSocket Connection Established. [Realtime Engine Active]",
    type: "system",
    timestamp: new Date(),
  };
}
```

- [ ] **Step 3: Create lib/api.ts**

```typescript
import { BoardState } from "./types";

// Backend API abstraction layer
// Currently returns mock data. Replace implementations for real backend.

export async function fetchTeamData(): Promise<Pick<BoardState, "teamCoins" | "targetCoins">> {
  return { teamCoins: 1250, targetCoins: 2000 };
}

export async function submitPunch(
  _memberId: string,
  _type: string
): Promise<{ success: boolean; coinsEarned: number }> {
  return { success: true, coinsEarned: 15 };
}

export async function fetchLogs(): Promise<never[]> {
  return [];
}

export async function sendPoke(_memberId: string): Promise<void> {
  // No-op for mock
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/mock-data.ts lib/api.ts
git commit -m "feat: add type definitions, mock data, and API abstraction layer"
```

---

### Task 4: SVG Icons

**Files:**
- Create: `components/ui/SvgIcons.tsx`

- [ ] **Step 1: Create SvgIcons.tsx**

Extract all SVG icons from `design/prototype.html` lines 419-439. Each key maps to an SVG string:

```tsx
export const SvgIcons = {
  // Avatar icons
  alen: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="#bfdbfe"/><rect x="6" y="9" width="5" height="3" fill="#1f2937" stroke="none"/><rect x="13" y="9" width="5" height="3" fill="#1f2937" stroke="none"/><path d="M8 16h8"/></svg>`,
  bob: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="#bbf7d0"/><path d="M6 9h12" stroke-width="3"/><path d="M10 15v-2M14 15v-2"/></svg>`,
  cindy: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e9d5ff"/><circle cx="8" cy="11" r="2" fill="#1f2937" stroke="none"/><circle cx="16" cy="11" r="2" fill="#1f2937" stroke="none"/><path d="M12 16h.01" stroke-width="3"/></svg>`,
  dave: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="#ffedd5"/><rect x="7" y="10" width="3" height="3" fill="#1f2937"/><rect x="14" y="10" width="3" height="3" fill="#1f2937"/><path d="M9 16h6"/></svg>`,
  eva: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fbcfe8"/><path d="M8 10v2M16 10v2M9 16h6"/></svg>`,

  // Action icons
  strength: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="#fca5a5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 11V5a2 2 0 0 0-4 0v6M12 11V5a2 2 0 0 0-4 0v6M8 11V7a2 2 0 0 0-4 0v4a8 8 0 0 0 16 0V9a2 2 0 0 0-4 0v2"/></svg>`,
  run: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2" fill="#cbd5e1"/><path d="M10 10h4v4l-2 4M14 10l2-2m-6 2l-2 2M6 18h4"/></svg>`,
  stretch: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2" fill="#cbd5e1"/><path d="M8 16l4-4 4 4M12 12V8M8 8h8"/></svg>`,

  // Log icons
  msgLog: `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-slate-400" fill="#f1f5f9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  msgAlert: `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-orange-500" fill="#fef08a" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>`,
  msgSuccess: `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-yellow-500" fill="#fde047" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 1-4.5 4.5L18 22l-6-3-6 3 1.5-8.5L3 9l6-1z"/></svg>`,
  msgHighlight: `<svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0 text-yellow-500" fill="#fde047" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  poke: `<svg viewBox="0 0 24 24" class="w-3 h-3 shrink-0 text-slate-800" fill="#fde047" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  signal: `<svg viewBox="0 0 24 24" class="w-3 h-3 shrink-0 inline-block align-middle" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4a16 16 0 0 1 16 16M4 10a10 10 0 0 1 10 10M4 16a4 4 0 0 1 4 4M4 22h.01"/></svg>`,

  // Misc icons used in templates
  trophy: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="#fef08a" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  target: `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="#fecaca"/><circle cx="12" cy="12" r="6" fill="#f87171"/><circle cx="12" cy="12" r="2" fill="#1f2937"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="#cbd5e1" stroke="currentColor" stroke-width="2.5"><rect x="4" y="14" width="4" height="6" rx="1"/><rect x="10" y="10" width="4" height="10" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></svg>`,
  box: `<svg viewBox="0 0 24 24" class="w-full h-full text-slate-800" fill="#fcd34d" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M2 8h20M12 8v13M8 13h8"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" class="w-6 h-6"><circle cx="12" cy="12" r="10" fill="#fde047" stroke="#1f2937" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="#1f2937" stroke-width="2.5"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" class="w-5 h-5 text-slate-800" fill="#fef08a" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="5"/><path d="M9 11L7 2l3.5 2L12 2l1.5 2L17 2l-2 9"/></svg>`,
  weightlift: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M5 10v4M19 10v4M12 12v5M9 17h6"/><circle cx="12" cy="7" r="2" fill="#cbd5e1"/></svg>`,
  runner: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2" fill="#cbd5e1"/><path d="M10 10h4v4l-2 4M14 10l2-2m-6 2l-2 2M6 18h4"/></svg>`,
  bird: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="#bbf7d0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14c-1.5-1-3-1-3-1s1.5 2 3 3c0 2 3 4 7 4s9-3 9-7-4-7-9-7c-2 0-4 1-5 2"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/></svg>`,
  megaphone: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="#bfdbfe" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 18l-3-3H4v-6h4l3-3v12z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg>`,
  ice: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="#e0f2fe" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16M10 10l6 6M4 10l6-6M10 10L4 16"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" class="w-full h-full" fill="currentColor" stroke="none"><path d="M4 11a8 8 0 0 1 16 0H4z"/><path d="M4 17a4 4 0 0 0 16 0H4z"/><path d="M2 13h20v2H2z" fill="#94a3b8"/><path d="M4 15h16v2H4z" fill="#cbd5e1"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
} as const;

export type SvgIconKey = keyof typeof SvgIcons;
```

- [ ] **Step 2: Update mock-data.ts to use SvgIcons**

In `lib/mock-data.ts`, update `createMembers()` to inject avatar SVGs:

```typescript
import { SvgIcons } from "@/components/ui/SvgIcons";

export function createMembers(): Member[] {
  const avatarKeys = ["alen", "bob", "cindy", "dave", "eva"] as const;
  return avatarKeys.map((key, i) => ({
    id: String.fromCharCode(65 + i),
    name: ["Alen", "Bob", "Cindy", "Dave", "Eva"][i],
    avatarSvg: SvgIcons[key],
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/SvgIcons.tsx lib/mock-data.ts
git commit -m "feat: add SVG icon library extracted from prototype"
```

---

### Task 5: State Management (Store)

**Files:**
- Create: `lib/store.tsx`

- [ ] **Step 1: Create lib/store.tsx**

```tsx
"use client";

import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import { BoardState, BoardAction, Member, CellStatus, ActivityLog } from "./types";
import { createMembers, initGridData, createSeedLog } from "./mock-data";

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "PUNCH": {
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][action.dayIndex] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `<div class="w-4 h-4 inline-block align-middle text-slate-800">${state.members[action.memberIndex].avatarSvg}</div> <b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +15.`,
            type: "success",
            timestamp: new Date(),
          },
        ],
      };
    }
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SIMULATE_REMOTE_PUNCH": {
      const member = state.members[action.memberIndex];
      const dayIdx = state.today - 1;
      if (state.gridData[action.memberIndex][dayIdx] === true) return state;
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][dayIdx] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `[实时推送] <div class="w-4 h-4 inline-block align-middle text-slate-800">${member.avatarSvg}</div> <b>${member.name}</b> 刚刚完成了 ${action.typeDesc}，点亮了格子！`,
            type: "highlight",
            timestamp: new Date(),
          },
        ],
      };
    }
    default:
      return state;
  }
}

const today = 18;
const totalDays = 30;
const members = createMembers();

const initialState: BoardState = {
  members,
  gridData: initGridData(members.length, today, totalDays),
  teamCoins: 1250,
  targetCoins: 2000,
  today,
  totalDays,
  logs: [createSeedLog()],
  activeTab: "punch",
};

interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

const BoardContext = createContext<BoardContextType | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  // Simulate Bob's remote punch after 5 seconds (matches prototype)
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SIMULATE_REMOTE_PUNCH", memberIndex: 1, typeDesc: "力量训练" });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BoardContext.Provider value={{ state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/store.tsx
git commit -m "feat: add BoardProvider context with reducer and simulated remote punch"
```

---

### Task 6: UI Components

**Files:**
- Create: `components/ui/QuestBtn.tsx`
- Create: `components/ui/TabBtn.tsx`
- Create: `components/ui/PunchPopup.tsx`
- Create: `components/ui/Toast.tsx`

- [ ] **Step 1: Create QuestBtn.tsx**

```tsx
"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface QuestBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function QuestBtn({ children, className = "", ...props }: QuestBtnProps) {
  return (
    <button className={`quest-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create TabBtn.tsx**

```tsx
"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface TabBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export function TabBtn({ children, active, className = "", ...props }: TabBtnProps) {
  return (
    <button className={`tab-btn ${active ? "active" : "inactive"} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Create PunchPopup.tsx**

```tsx
"use client";

import { useState } from "react";
import { SvgIcons } from "./SvgIcons";

interface PunchPopupProps {
  onSelect: (type: string) => void;
}

export function PunchPopup({ onSelect }: PunchPopupProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="punch-popup-container" style={{ position: "relative" }}>
      <button
        className="cell my-punch-btn text-xl cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShow((prev) => !prev);
        }}
      >
        +
      </button>
      <div className={`punch-popup ${show ? "show" : ""}`}>
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="力量"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("力量");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.strength }}
        />
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="有氧"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("有氧");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.run }}
        />
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="伸展"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("伸展");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.stretch }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Toast.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";

interface ToastData {
  avatarSvg: string;
  text: string;
}

export function Toast({ data }: { data: ToastData | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;

  return (
    <div
      className={`absolute bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div
        className="w-6 h-6 text-white"
        dangerouslySetInnerHTML={{ __html: data.avatarSvg }}
      />
      <span>{data.text}</span>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/
git commit -m "feat: add UI components (QuestBtn, TabBtn, PunchPopup, Toast)"
```

---

### Task 7: Navbar Components

**Files:**
- Create: `components/navbar/Navbar.tsx`
- Create: `components/navbar/ProfileDropdown.tsx`

- [ ] **Step 1: Create ProfileDropdown.tsx**

Matches prototype lines 214-253 exactly:

```tsx
"use client";

import { useBoard } from "@/lib/store";
import { QuestBtn } from "@/components/ui/QuestBtn";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function ProfileDropdown() {
  const { state } = useBoard();
  const currentMember = state.members[0];

  return (
    <div className="dropdown-menu flex flex-col overflow-hidden">
      {/* Balance section */}
      <div className="p-5 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-sub">ASSET BALANCE</span>
          <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.coin }} />
            3,450
          </div>
        </div>
        <QuestBtn className="px-3 py-1 text-xs">提现</QuestBtn>
      </div>

      {/* Achievements section */}
      <div className="p-5 flex flex-col gap-3">
        <span className="text-xs font-bold text-sub">ACHIEVEMENTS (3)</span>
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-orange-100 border-2 border-orange-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="初级举铁匠">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.weightlift }} />
          </div>
          <div className="w-12 h-12 bg-blue-100 border-2 border-blue-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="慢跑达人">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.runner }} />
          </div>
          <div className="w-12 h-12 bg-green-100 border-2 border-green-200 rounded-xl flex items-center justify-center shadow-sm p-2 text-slate-800" title="早起鸟">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.bird }} />
          </div>
        </div>
      </div>

      {/* Settings section */}
      <div className="p-5 border-t-2 border-slate-100 bg-slate-50 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm font-bold">
          <span>关联 App</span>
          <span className="text-green-500 bg-green-100 px-2 py-0.5 rounded text-xs">Apple Health 已连</span>
        </div>
        <div className="flex justify-between items-center text-sm font-bold">
          <span>每日提醒</span>
          <span className="text-sub">18:30</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Navbar.tsx**

Matches prototype lines 180-255 exactly:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useBoard } from "@/lib/store";
import { TabBtn } from "@/components/ui/TabBtn";
import { ProfileDropdown } from "./ProfileDropdown";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function Navbar() {
  const { state, dispatch } = useBoard();
  const [profileOpen, setProfileOpen] = useState(false);

  // Close popups on outside click
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const currentMember = state.members[0];

  return (
    <nav className="h-14 w-full flex items-center justify-between shrink-0 px-2 z-50">
      {/* Left: Logo & Tabs */}
      <div className="flex items-center gap-6">
        <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-300 border-2 border-slate-800 rounded-lg flex items-center justify-center shadow-[0_2px_0_0_#1f2937] p-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.box }} />
          </div>
          ROOM TODO
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-full border-2 border-slate-200">
          <TabBtn
            active={state.activeTab === "punch"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "punch" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            健身打卡
          </TabBtn>
          <TabBtn
            active={state.activeTab === "dash"}
            onClick={() => dispatch({ type: "SET_TAB", tab: "dash" })}
          >
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.chart }} />
            战报中心
          </TabBtn>
        </div>
      </div>

      {/* Right: Profile */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setProfileOpen((prev) => !prev);
          }}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full pl-2 pr-4 py-1 hover:border-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm p-1 text-slate-800">
            <span dangerouslySetInnerHTML={{ __html: currentMember.avatarSvg }} />
          </div>
          <span className="font-bold text-sm">{currentMember.name}</span>
        </button>

        {profileOpen && <ProfileDropdown />}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/navbar/
git commit -m "feat: add Navbar with tabs and profile dropdown"
```

---

### Task 8: Punch Board — TeamHeader (Zone A)

**Files:**
- Create: `components/punch-board/TeamHeader.tsx`

- [ ] **Step 1: Create TeamHeader.tsx**

Matches prototype lines 263-292:

```tsx
"use client";

import { useBoard } from "@/lib/store";
import { SvgIcons } from "@/components/ui/SvgIcons";

export function TeamHeader() {
  const { state } = useBoard();

  const progress = Math.min((state.teamCoins / state.targetCoins) * 100, 100);
  const todayPunchedCount = state.gridData.filter(
    (row) => row[state.today - 1] === true
  ).length;

  return (
    <header className="h-[12vh] w-full soft-card flex items-center justify-between px-8 shrink-0 z-20">
      {/* Team Vault */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center bg-orange-100 rounded-full border-2 border-orange-200 shadow-sm text-orange-500 p-2">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.trophy }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-sub tracking-wider uppercase">Team Vault</span>
          <div className="text-2xl font-extrabold flex items-baseline gap-1">
            {state.teamCoins.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 max-w-xl mx-8 flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold text-sub">
          <span className="text-main flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: SvgIcons.target }} />
            WEEKLY QUEST: 星巴克下午茶
          </span>
          <span>{state.targetCoins} Pts</span>
        </div>
        <div className="h-4 w-full bg-slate-100 border-2 border-slate-200 rounded-full relative overflow-hidden">
          <div
            className="h-full bg-yellow-300 border-r-2 border-slate-800 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Today's Rate */}
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-sub tracking-wider uppercase">Today&apos;s Rate</span>
        <div className="text-2xl font-extrabold text-main">
          <span>{todayPunchedCount}</span>
          <span className="text-lg text-slate-300">/{state.members.length}</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/punch-board/TeamHeader.tsx
git commit -m "feat: add TeamHeader (Zone A) with vault, progress, rate"
```

---

### Task 9: Punch Board — HeatmapGrid (Zone B)

**Files:**
- Create: `components/punch-board/HeatmapGrid.tsx`

- [ ] **Step 1: Create HeatmapGrid.tsx**

Matches prototype lines 295-306 + JS renderZoneB lines 500-592. This is the most complex component:

```tsx
"use client";

import { useRef, useEffect } from "react";
import { useBoard } from "@/lib/store";
import { PunchPopup } from "@/components/ui/PunchPopup";

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = 0;

  // Auto-scroll to today column on mount
  useEffect(() => {
    if (containerRef.current) {
      const offset = (state.today - 2) * 60;
      containerRef.current.scrollLeft = offset;
    }
  }, [state.today]);

  return (
    <main className="flex-1 w-full soft-card flex relative overflow-hidden">
      {/* Member column */}
      <div className="w-24 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-xs text-sub rounded-tl-[1.25rem]">
          MEMBERS
        </div>
        <div className="flex-1 flex flex-col py-2 justify-between items-center">
          {state.members.map((m, idx) => {
            const isMe = idx === currentUserIndex;
            return (
              <div
                key={m.id}
                className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border p-1 text-slate-800 bg-slate-50 ${
                  isMe ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                } relative`}
                title={m.name}
              >
                <span dangerouslySetInnerHTML={{ __html: m.avatarSvg }} />
                {isMe && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid area */}
      <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative flex flex-col scroll-smooth">
        {/* Day header */}
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
          {Array.from({ length: state.totalDays }, (_, i) => {
            const day = i + 1;
            const isToday = day === state.today;
            return (
              <div
                key={day}
                className={`w-12 flex justify-center items-center text-xs font-bold rounded-full h-6 ${
                  isToday
                    ? "bg-yellow-300 text-slate-900 border-2 border-slate-800 shadow-[0_2px_0_0_rgba(31,41,55,1)]"
                    : "text-slate-400"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Grid matrix */}
        <div className="flex-1 py-2 px-4 w-max relative">
          <div className="flex flex-col justify-between h-full relative z-10">
            {state.members.map((member, rIndex) => (
              <div key={member.id} className="flex gap-3 h-12 items-center">
                {Array.from({ length: state.totalDays }, (_, i) => {
                  const day = i + 1;
                  const status = state.gridData[rIndex][i];
                  const isMe = rIndex === currentUserIndex;

                  if (day < state.today) {
                    return (
                      <div
                        key={day}
                        className={`cell ${status ? "cell-punched" : "cell-missed"}`}
                      >
                        {status ? "✓" : ""}
                      </div>
                    );
                  } else if (day === state.today) {
                    if (status) {
                      return (
                        <div key={day} className="cell cell-punched">
                          ✓
                        </div>
                      );
                    } else if (isMe) {
                      return (
                        <PunchPopup
                          key={day}
                          onSelect={(punchType) => {
                            dispatch({
                              type: "PUNCH",
                              memberIndex: rIndex,
                              dayIndex: i,
                              punchType,
                            });
                          }}
                        />
                      );
                    } else {
                      return (
                        <div key={day} className="cell cell-future opacity-50" />
                      );
                    }
                  } else {
                    return (
                      <div key={day} className="cell cell-future" />
                    );
                  }
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/punch-board/HeatmapGrid.tsx
git commit -m "feat: add HeatmapGrid (Zone B) with cell matrix and punch popup"
```

---

### Task 10: Punch Board — ActivityStream (Zone C)

**Files:**
- Create: `components/punch-board/ActivityStream.tsx`

- [ ] **Step 1: Create ActivityStream.tsx**

Matches prototype lines 309-322 + JS addLog/checkAndRenderUrgeButtons:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { QuestBtn } from "@/components/ui/QuestBtn";
import { Toast } from "@/components/ui/Toast";
import { SvgIcons } from "@/components/ui/SvgIcons";

function getLogIcon(type: string) {
  switch (type) {
    case "success": return SvgIcons.msgSuccess;
    case "alert": return SvgIcons.msgAlert;
    case "highlight": return SvgIcons.msgHighlight;
    default: return SvgIcons.msgLog;
  }
}

function getLogColorClass(type: string) {
  switch (type) {
    case "success": return "text-main";
    case "alert": return "text-orange-500";
    case "highlight": return "text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200 shadow-sm";
    default: return "text-sub";
  }
}

interface ToastData {
  avatarSvg: string;
  text: string;
}

export function ActivityStream() {
  const { state, dispatch } = useBoard();
  const streamRef = useRef<HTMLDivElement>(null);
  const [pokedMembers, setPokedMembers] = useState<Set<string>>(new Set());
  const [toastData, setToastData] = useState<ToastData | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [state.logs]);

  // Detect remote punches (highlight logs) and show toast
  useEffect(() => {
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.type === "highlight" && state.logs.length > 2) {
      // Extract member name from log text for toast
      const memberMatch = lastLog.text.match(/<b>(\w+)<\/b>/);
      if (memberMatch) {
        const memberName = memberMatch[1];
        const member = state.members.find((m) => m.name === memberName);
        if (member) {
          setToastData({ avatarSvg: member.avatarSvg, text: `${member.name} 刚刚打卡了！` });
        }
      }
    }
  }, [state.logs.length, state.members]);

  const unpunchedMembers = state.members.filter(
    (m, idx) => idx !== 0 && state.gridData[idx][state.today - 1] === false
  );

  return (
    <footer className="h-[20vh] w-full soft-card flex flex-col shrink-0 overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-50 text-sub text-[10px] px-6 py-2 font-bold border-b-2 border-slate-100 flex justify-between rounded-t-[1.25rem] tracking-wider">
        <span>ACTIVITY STREAM (LIVE)</span>
        <span className="text-green-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" /> SYNCING
        </span>
      </div>

      {/* Log stream */}
      <div ref={streamRef} className="flex-1 p-3 px-6 text-sm overflow-y-auto flex flex-col gap-2">
        {state.logs.map((log) => {
          const timeStr = log.timestamp.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return (
            <div key={log.id} className={`w-full flex items-start gap-2 ${getLogColorClass(log.type)}`}>
              <span className="text-slate-300 font-mono text-[10px] mt-1 shrink-0">[{timeStr}]</span>
              <span
                className="flex items-center pt-0.5"
                dangerouslySetInnerHTML={{ __html: getLogIcon(log.type) }}
              />
              <span className="text-xs leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: log.text }} />
            </div>
          );
        })}

        {/* Poke buttons */}
        {unpunchedMembers.length > 0 && (
          <div className="w-full flex flex-col gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex gap-2 flex-wrap">
              {unpunchedMembers.map((m) => {
                const isPoked = pokedMembers.has(m.id);
                return (
                  <button
                    key={m.id}
                    className={`quest-btn px-3 py-1 text-[10px] tracking-wide flex items-center gap-1 ${isPoked ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (isPoked) return;
                      setPokedMembers((prev) => new Set(prev).add(m.id));
                      dispatch({
                        type: "ADD_LOG",
                        log: {
                          id: `poke-${Date.now()}`,
                          text: `${SvgIcons.signal} <span class="align-middle">已向 ${m.name} 发送催促提示。</span>`,
                          type: "system",
                          timestamp: new Date(),
                        },
                      });
                    }}
                    disabled={isPoked}
                  >
                    <span dangerouslySetInnerHTML={{ __html: SvgIcons.poke }} />
                    <span>{isPoked ? "✓ Poked" : `Poke`}</span>
                    <b>{m.name}</b>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <Toast data={toastData} />
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/punch-board/ActivityStream.tsx
git commit -m "feat: add ActivityStream (Zone C) with logs, poke buttons, and toast"
```

---

### Task 11: Punch Board Container

**Files:**
- Create: `components/punch-board/PunchBoard.tsx`

- [ ] **Step 1: Create PunchBoard.tsx**

```tsx
"use client";

import { TeamHeader } from "./TeamHeader";
import { HeatmapGrid } from "./HeatmapGrid";
import { ActivityStream } from "./ActivityStream";

export function PunchBoard() {
  return (
    <div className="absolute inset-0 flex flex-col gap-4 transition-opacity duration-300">
      <TeamHeader />
      <HeatmapGrid />
      <ActivityStream />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/punch-board/PunchBoard.tsx
git commit -m "feat: add PunchBoard container combining Zone A/B/C"
```

---

### Task 12: Report Center Components

**Files:**
- Create: `components/report-center/ReportHeader.tsx`
- Create: `components/report-center/Milestones.tsx`
- Create: `components/report-center/Highlights.tsx`
- Create: `components/report-center/TrendChart.tsx`
- Create: `components/report-center/ReportCenter.tsx`

- [ ] **Step 1: Create ReportHeader.tsx**

Matches prototype lines 328-341:

```tsx
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function ReportHeader() {
  return (
    <div className="flex justify-between items-end mb-4 relative z-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight">OCTOBER REPORT</h1>
        <p className="text-sub font-bold mt-1 flex items-center gap-2">
          10月团队荣誉战报
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold text-sub">TEAM SCORE</div>
        <div className="text-3xl font-black text-yellow-500">+12,450</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Milestones.tsx**

Matches prototype lines 345-366:

```tsx
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function Milestones() {
  return (
    <div className="col-span-2 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-48 h-48 opacity-20 rotate-[-15deg] text-slate-400">
        <span dangerouslySetInnerHTML={{ __html: SvgIcons.burger }} />
      </div>
      <h2 className="text-xl font-black mb-2 relative z-10">MILESTONES / 团队里程碑</h2>
      <div className="mt-4 relative z-10">
        <p className="text-sub font-bold text-sm">本月全员共同燃烧热量，相当于消耗了...</p>
        <div className="text-6xl font-black text-orange-500 mt-2">50 个巨无霸汉堡!</div>
      </div>
      <div className="mt-6 flex gap-4 relative z-10">
        <div className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl flex-1 shadow-sm">
          <div className="text-xs text-sub font-bold">总打卡次数</div>
          <div className="text-2xl font-black">124 次</div>
        </div>
        <div className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl flex-1 shadow-sm">
          <div className="text-xs text-sub font-bold">全勤天数</div>
          <div className="text-2xl font-black text-green-500">12 天</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Highlights.tsx**

Matches prototype lines 369-386:

```tsx
"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function Highlights() {
  return (
    <div className="col-span-1 flex flex-col gap-4">
      <div className="bg-blue-50 border-4 border-blue-100 rounded-[1.5rem] p-5 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-10 h-10 mb-2 text-blue-500">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.megaphone }} />
        </div>
        <h3 className="font-black text-blue-900 text-lg">月度打气筒</h3>
        <p className="text-xs text-blue-700 font-bold mt-1">Bob 催促了 15 次！</p>
      </div>
      <div className="bg-purple-50 border-4 border-purple-100 rounded-[1.5rem] p-5 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-10 h-10 mb-2 text-purple-500">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.ice }} />
        </div>
        <h3 className="font-black text-purple-900 text-lg">早起破冰者</h3>
        <p className="text-xs text-purple-700 font-bold mt-1">Dave 18天首位打卡</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TrendChart.tsx**

Matches prototype lines 389-410:

```tsx
"use client";

export function TrendChart() {
  return (
    <div className="col-span-3 bg-white border-4 border-slate-100 rounded-[1.5rem] p-6 flex flex-col mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black">ACTIVITY TREND / 活跃趋势</h2>
        <span className="text-xs font-bold text-sub bg-slate-100 px-2 py-1 rounded">
          纵轴: 当日打卡人数 (0-5)
        </span>
      </div>
      <div className="w-full h-32 relative mt-2 bg-slate-50 border-2 border-slate-200 rounded-xl pt-4">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full drop-shadow-md">
          <line x1="0" y1="20" x2="1000" y2="20" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <line x1="0" y1="50" x2="1000" y2="50" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <line x1="0" y1="80" x2="1000" y2="80" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <polyline
            fill="none"
            stroke="#fde047"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="0,44 100,32 200,20 300,56 400,20 500,20 600,44 700,68 800,20 900,32 1000,20"
          />
          <circle cx="200" cy="20" r="8" fill="#1f2937" />
          <circle cx="400" cy="20" r="8" fill="#1f2937" />
          <circle cx="500" cy="20" r="8" fill="#1f2937" />
          <circle cx="800" cy="20" r="8" fill="#1f2937" />
          <circle cx="1000" cy="20" r="8" fill="#1f2937" />
        </svg>
        <div className="absolute inset-0 pointer-events-none flex justify-around items-end pb-1 px-4 text-[10px] font-bold text-slate-400">
          <span>10.01</span>
          <span>10.05</span>
          <span>10.10</span>
          <span>10.15</span>
          <span>10.20</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ReportCenter.tsx**

```tsx
"use client";

import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { Highlights } from "./Highlights";
import { TrendChart } from "./TrendChart";

export function ReportCenter() {
  return (
    <div className="absolute inset-0 flex flex-col gap-4 transition-opacity duration-300 bg-white soft-card p-6 overflow-y-auto">
      <ReportHeader />
      <div className="grid grid-cols-3 gap-4 flex-1">
        <Milestones />
        <Highlights />
        <TrendChart />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/report-center/
git commit -m "feat: add ReportCenter with header, milestones, highlights, and trend chart"
```

---

### Task 13: Page Assembly & Layout Integration

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Update app/layout.tsx to wrap with BoardProvider**

```tsx
import type { Metadata } from "next";
import { BoardProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Todo - 团队打卡看板",
  description: "团队健身打卡与战报看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen w-screen flex flex-col p-4 gap-4 text-main relative">
        <BoardProvider>{children}</BoardProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create app/page.tsx**

```tsx
"use client";

import { useBoard } from "@/lib/store";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { ReportCenter } from "@/components/report-center/ReportCenter";

export default function Home() {
  const { state } = useBoard();

  return (
    <>
      <Navbar />
      <div className="flex-1 w-full relative overflow-hidden">
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "punch" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <PunchBoard />
        </div>
        <div
          className={`transition-opacity duration-300 ${
            state.activeTab === "dash" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ position: "absolute", inset: 0 }}
        >
          <ReportCenter />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify full page renders**

Run: `npm run dev`
Expected: Full dashboard renders at localhost:3000 matching prototype layout. Check:
- Dot-pattern background visible
- Navbar with Logo, Tabs, Profile button
- Zone A: Team Vault, progress bar, today rate
- Zone B: Member avatars, day headers, grid cells
- Zone C: Activity stream with seed log
- Tab switching works
- Profile dropdown opens/closes
- "+" punch button shows popup
- After 5s, Bob remote punch appears with toast

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: assemble full page with BoardProvider, Navbar, and view switching"
```

---

### Task 14: Visual Polish & Final Verification

- [ ] **Step 1: Side-by-side visual comparison**

Open `design/prototype.html` and `localhost:3000` side by side. Verify pixel-perfect match for:
- [ ] Body background dot pattern
- [ ] Navbar: logo box shadow, tab styling, profile button border
- [ ] Zone A: trophy icon, progress bar colors, font sizes
- [ ] Zone B: member column width, cell sizes (3rem), colors for all 4 cell states
- [ ] Zone C: stream header, log entry formatting, poke button style
- [ ] Report view: all cards, SVG chart, font weights

- [ ] **Step 2: Interaction verification**

- [ ] Click "+" → popup appears with 3 action buttons
- [ ] Select action → cell turns yellow with checkmark, coins +15
- [ ] Poke buttons appear for unpunched members
- [ ] Click Poke → button changes to "✓ Poked"
- [ ] Tab switch: punch ↔ dash views fade in/out
- [ ] Profile dropdown: click opens, click outside closes
- [ ] After 5s: Bob remote punch, highlight log, toast notification

- [ ] **Step 3: Fix any discrepancies**

Address any visual or interaction differences found in Steps 1-2.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete pixel-perfect core board page implementation"
```
