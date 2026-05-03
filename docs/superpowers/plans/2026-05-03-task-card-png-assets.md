# Task Card PNG Assets Implementation Plan

> **Review gate:** Before producing the full 20-card set, create and review one demo set: a base card plus four transparent overlays.

**Goal:** Generate one approved demo set, then roll the same pattern across the 20 MVP task cards.

**Updated rule:** The card is now split into:

* one complete 3:4 **base card** image
* one transparent `status-pending` overlay
* one transparent `status-complete` overlay
* one transparent `reroll-button-active` overlay
* one transparent `reroll-button-inactive` overlay

The base card must reserve visual space for the overlays. The overlays sit above the card at runtime.

**Output folders:**

* `public/assets/task-cards/demo/`
* `public/assets/task-cards/overlays/`
* `public/assets/task-cards/`

---

## Task 1: Update Generation Rule

- [x] Remove baked completion-state icon from the base-card rule.
- [x] Remove baked reroll button from the base-card rule.
- [x] Add two transparent status overlay assets: `pending` and `complete`.
- [x] Add two transparent reroll-button overlay assets: `active` and `inactive`.
- [x] Require the base card to reserve space for those overlays.
- [x] Build and review one demo set before the 20-card batch starts.

Expected result: the asset contract matches the real interaction logic.

## Task 2: Demo Set

Demo target:

* `public/assets/task-cards/demo/movement_001-base.png`
* `public/assets/task-cards/demo/status-pending.png`
* `public/assets/task-cards/demo/status-complete.png`
* `public/assets/task-cards/demo/reroll-button-active.png`
* `public/assets/task-cards/demo/reroll-button-inactive.png`

Demo steps:

1. Generate one base card for `movement_001`.
2. Generate one pending-state square overlay on a chroma-key background.
3. Generate one completed-state square overlay on a chroma-key background.
4. Generate one active reroll-button overlay on a chroma-key background.
5. Generate one inactive reroll-button overlay on a chroma-key background.
6. Remove chroma-key backgrounds from the four overlays.
7. Save all five demo assets.
8. Visually review the set together.

Reject and regenerate any demo asset if it has:

```txt
missing reserved slot on the base card
baked completion-state art on the base card
baked reroll button on the base card
weak transparency cutout
theme mismatch between card and overlays
unreadable title or slogan
unreadable overlay silhouette
active state not clearly yellow
inactive state not clearly gray
watermark
```

## Task 3: Demo Progress Ledger

| Status | Asset | Output |
| --- | --- | --- |
| Done | movement_001 base card | `public/assets/task-cards/demo/movement_001-base.png` |
| Done | pending overlay | `public/assets/task-cards/demo/status-pending.png` |
| Done | complete overlay | `public/assets/task-cards/demo/status-complete.png` |
| Done | reroll active overlay | `public/assets/task-cards/demo/reroll-button-active.png` |
| Done | reroll inactive overlay | `public/assets/task-cards/demo/reroll-button-inactive.png` |

Update each row to `Done` immediately after the corresponding file is saved and checked.

## Task 4: Batch Rule After Demo Approval

After the user approves the demo set:

- [ ] Generate the final 20 base cards under `public/assets/task-cards/`.
- [ ] Generate the approved overlay set under `public/assets/task-cards/overlays/`.
- [ ] Update the final 20-card progress ledger.

Do not start this task until the demo is approved.

## Task 5: Final Handoff

- [ ] Report the demo folder and final asset folders.
- [ ] Note any remaining text-accuracy issues from image generation.
- [ ] Keep UI integration as a separate follow-up.
