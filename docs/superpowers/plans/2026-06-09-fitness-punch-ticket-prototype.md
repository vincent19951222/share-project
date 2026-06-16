# Fitness Punch Ticket Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate a richer fitness punch confirmation ticket for the real today `+` punch flow.

**Architecture:** Extract the ticket UI into `components/ui/FitnessPunchTicket.tsx`, reuse it from the prototype route, and render it from `PunchPopup` through a `document.body` portal for the real today `+` flow. Keep submission delegated to existing punch handlers.

**Tech Stack:** Next.js App Router, React local state, CSS Modules, Vitest + jsdom.

---

### Task 1: Static Prototype Route

**Files:**
- Create: `__tests__/fitness-punch-ticket-prototype.test.tsx`
- Modify: `__tests__/punch-popup.test.tsx`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
- Create: `app/ui-prototypes/fitness-punch-ticket/page.tsx`
- Create: `app/ui-prototypes/fitness-punch-ticket/FitnessPunchTicketPrototype.module.css`
- Create: `components/ui/FitnessPunchTicket.tsx`
- Modify: `components/ui/PunchPopup.tsx`
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `app/globals.css`
- Create: `public/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png`

- [ ] **Step 1: Write the failing test**

Test that rendering the route exposes the ticket title, option groups, muscle map image, duration control, and confirm button.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/fitness-punch-ticket-prototype.test.tsx`

Expected: fail because the route module does not exist yet.

- [ ] **Step 3: Add the route and local asset**

Create the page, CSS module, and copy the generated muscle map asset into `public/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/fitness-punch-ticket-prototype.test.tsx`

Expected: pass.

- [ ] **Step 5: Visual check**

Run the dev server and open `/ui-prototypes/fitness-punch-ticket` in the in-app browser. Capture desktop and mobile screenshots or inspect the rendered page for obvious overlap.
