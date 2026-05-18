# Supply UI Lab Task 03 Guardrails And Primitives Design

> Phase 2 task-level spec for shared interaction primitives and global UI Lab guardrails. This task corresponds to Task 3 in `docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`.

## Goal

Add test guardrails that keep the six UI Lab pages on the Phase 2 vocabulary, and make shared primitives support controlled local interactions.

## User-Visible Changes

- Filter bars become clickable local controls instead of static visual tabs.
- Future page work has a shared pattern for category, date, and status switching.
- Banned old terms are caught by tests before they return to rendered UI.
- Dead main-flow links such as `href="#"` are caught by tests.

## Data And Component Changes

Modify:

- `components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives.tsx`
- `__tests__/supply-ui-lab-primitives.test.tsx`

Create:

- `__tests__/supply-ui-lab-static-business-closure.test.tsx`

The primitive change is small but important: `SupplyUiLabFilterBar` accepts an optional `onSelect(id)` callback.

The global guardrail test renders all six UI Lab scene components and checks for banned rendered terms:

- `补给券`
- `生命票`
- `体力`
- `扩容`
- `帮助中心`
- `意见反馈`
- `设置`

## Non-Goals

- Do not force all page-specific interactions into shared primitives.
- Do not change production UI components.
- Do not make the global guardrail pass in this task; later page tasks make it pass.

## Acceptance Criteria

- Shared primitive tests pass.
- Global guardrail test exists and initially fails until page cleanup tasks complete.
- Filter controls can call `onSelect`.
- No production code imports the UI Lab guardrail test helpers.

## Plan Link

Implementation details live in Task 3 of:

`docs/superpowers/plans/2026-05-18-supply-ui-lab-static-business-closure.md`
