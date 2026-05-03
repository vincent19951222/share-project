# Task Card PNG Assets Design Spec

Date: 2026-05-03

## Goal

Create the final visual asset set for the 20 implemented MVP task cards.

The updated generation rule is:

* generate each task card as one complete 3:4 **base card image**
* do **not** bake the task completion state into the card
* do **not** bake the reroll button into the card
* generate extra transparent overlay assets for state and reroll controls

The examples under `public/assets/task-cards/example/` remain the reference direction for card feel, card-game density, and the four theme colors. The difference is that the interactive elements now need to exist as overlay assets above the card rather than being permanently baked into the card face.

## Source Of Truth

The asset set covers the 20 cards currently implemented in:

* `content/gamification/task-cards.ts`
* `content/gamification/dimensions.ts`

No extra cards are included in this asset batch.

## Output Contract

Final public assets for the main card batch:

```txt
public/assets/task-cards/movement_001.png
public/assets/task-cards/movement_002.png
...
public/assets/task-cards/learning_005.png
```

Overlay assets:

```txt
public/assets/task-cards/overlays/status-pending.png
public/assets/task-cards/overlays/status-complete.png
public/assets/task-cards/overlays/reroll-button-active.png
public/assets/task-cards/overlays/reroll-button-inactive.png
```

Demo assets for review:

```txt
public/assets/task-cards/demo/movement_001-base.png
public/assets/task-cards/demo/status-pending.png
public/assets/task-cards/demo/status-complete.png
public/assets/task-cards/demo/reroll-button-active.png
public/assets/task-cards/demo/reroll-button-inactive.png
```

Each base card PNG must satisfy:

* Format: PNG.
* Card form: complete portrait card, approximately **3:4**.
* Canvas: the whole image is the card composition. No transparent padding shell is required.
* Resolution: keep the high-resolution output from image generation unless a later integration task asks for resizing.
* Card frame: baked into the image.
* Dimension strip / theme bar: baked into the image.
* Card name area: baked into the image.
* Illustration area: baked into the image.
* Tag area: baked into the image.
* A clearly reserved placement area for status overlay.
* A clearly reserved placement area for reroll button overlay.
* No baked completion-state icon.
* No baked reroll button.

Each overlay PNG must satisfy:

* Format: PNG with alpha channel.
* Transparent background.
* Standalone usage above the card.
* `status-pending` and `status-complete`: approximately 1:1 square icon assets.
* `reroll-button-active` and `reroll-button-inactive`: horizontal rectangular button assets.
* `reroll-button-active`: obvious active/emphasized state, clearly yellow-led.
* `reroll-button-inactive`: obvious unavailable/disabled state, clearly gray-led.

## Card Anatomy

Each generated base card should read as one complete compact game card:

```txt
portrait 3:4 card

outer card border
dimension strip / top theme area
card name area
central illustration area
compact tag row
bottom action/status area
reserved state icon slot
reserved reroll button slot
```

Base-card content included in the PNG:

* Dimension slogan:
  * movement: 把电充绿
  * hydration: 把尿喝白
  * social: 把事办黄
  * learning: 把股看红
* Card title
* Main illustration
* Compact tags:
  * effort: 轻 / 中
  * scene: 通用 / 办公室 / 居家
  * cooldown: `N天`
* Empty/reserved visual holder for the status icon
* Empty/reserved visual holder for the reroll button

Base-card content not included in the PNG:

* Completion check mark or completed label
* Pending-state icon
* Reroll button artwork
* Full task description
* Reward amount
* Hover popover text
* Real dynamic interaction states

Overlay content:

* `status-pending`: pending / not yet complete state icon
* `status-complete`: completed state icon
* `reroll-button-active`: clickable active `换一个`
* `reroll-button-inactive`: unavailable/used-up `换一个`

## Dimension Themes

| Dimension | Slogan | Theme | Primary Color | Visual Motif |
| --- | --- | --- | --- | --- |
| movement | 把电充绿 | green energy | `#3E9C35` | battery, leaf, movement, window light |
| hydration | 把尿喝白 | blue/white hydration | `#278BD6` | water bottle, cup, splash, clean hydration |
| social | 把事办黄 | yellow social | `#E1AE20` | chat bubbles, team faces, light office chatter |
| learning | 把股看红 | red learning | `#D9432F` | notes, chart arrow, article, knowledge gain |

All cards keep the project style: Chinese pixel-brutalist fitness game UI, thick black outlines, parchment or warm card material, high-contrast card labels, compact dashboard density, and playful "脱脂牛马" tone.

## Generation Strategy

Use `imagegen` for:

1. the full base card image
2. the two status overlays
3. the two reroll-button overlays

Use built-in `imagegen` first. For overlay assets that need transparency, generate them on a flat chroma-key background and remove the background locally.

Pipeline:

1. Generate one complete 3:4 base card with `imagegen`.
2. Save the selected base-card result directly under the target path.
3. Generate `status-pending`, `status-complete`, `reroll-button-active`, and `reroll-button-inactive` on a flat chroma-key background.
4. Remove the chroma-key background locally to produce transparent PNG overlays.
5. Save the selected overlay results directly under the target paths.
6. Update the Markdown progress checklist immediately after each saved asset.
7. Visually review the saved assets as a set.

## Imagegen Prompt Template: Base Card

```txt
Use case: stylized-concept
Asset type: complete 3:4 portrait base task card PNG for a Chinese fitness gamification dashboard

Primary request: Create one full base card for “[CARD_TITLE]”.

Card UI requirements: include the entire base card in one image: thick black outer border, dimension color strip, card name area, central illustration area, compact tag area, a reserved square holder for a future status icon overlay, and a reserved horizontal holder for a future reroll button overlay. The card should feel like a compact collectible game card with a Hearthstone-like card presence, but in a Chinese pixel-brutalist fitness game style.

Required visible Chinese text:
- Dimension slogan: “[DIMENSION_SLOGAN]”
- Card title: “[CARD_TITLE]”
- Tags: “[EFFORT_TAG] / [SCENE_TAG] / [COOLDOWN_TAG]”

Scene/backdrop: [SCENE]
Subject: [SUBJECT]
Style/medium: cute Chinese pixel-brutalist fitness game card, matching “脱脂牛马 / 牛马补给站”; thick black outlines, chunky pixel accents, warm parchment card material, compact readable card-game UI, playful workplace fitness tone.
Composition/framing: complete 3:4 portrait card, centered, full card visible, strong border silhouette, dense but readable layout, no external mockup frame.
Color palette: [THEME_COLOR] theme accents, black outlines, parchment base, yellow gym brand accents where appropriate.
Constraints: single complete base card only; no separate transparent cutout; no blank background around the card; no baked completion-state icon; no baked reroll button; leave clean reserved slots for overlays; no watermark.
Text tolerance: Chinese text should be as close as possible to the required labels; reject if the title or dimension slogan becomes unrecognizable.
```

## Imagegen Prompt Template: Overlay Assets

Status-pending:

```txt
Use case: stylized-concept
Asset type: square overlay icon for a task-card status state

Primary request: Create one 1:1 pending-state overlay icon for the task card system.
Style/medium: Chinese pixel-brutalist game UI sticker/icon, thick black outlines, parchment-compatible, compact and readable at small size.
Composition/framing: centered single icon only, generous padding, no card behind it.
Color palette: neutral parchment, black outline, subtle green accent, not as strong as success state.
Text (verbatim): “待完成”
Constraints: place the icon on a perfectly flat solid #ff00ff chroma-key background for transparency removal. No shadow on the background. No card frame. No watermark.
Avoid: photorealism, scene background, extra UI, clutter.
```

Status-complete:

```txt
Use case: stylized-concept
Asset type: square overlay icon for a task-card status state

Primary request: Create one 1:1 completed-state overlay icon for the task card system, clearly stronger than the pending state.
Style/medium: Chinese pixel-brutalist game UI sticker/icon, thick black outlines, parchment-compatible, compact and readable at small size.
Composition/framing: centered single icon only, generous padding, no card behind it.
Color palette: strong green success accent, black outline, high contrast.
Text (verbatim): “已完成”
Constraints: place the icon on a perfectly flat solid #ff00ff chroma-key background for transparency removal. No shadow on the background. No card frame. No watermark.
Avoid: photorealism, scene background, extra UI, clutter.
```

Reroll button active:

```txt
Use case: stylized-concept
Asset type: horizontal overlay button for a task-card reroll action

Primary request: Create one horizontal active “换一个” overlay button for the task card system.
Style/medium: Chinese pixel-brutalist game UI button, thick black outlines, collectible-game control feel, readable at compact size.
Composition/framing: centered single button only, no card behind it.
Color palette: obvious yellow active state, black outline, small accent area allowed, parchment-compatible.
Text (verbatim): “换一个”
Constraints: place the button on a perfectly flat solid #ff00ff chroma-key background for transparency removal. No shadow on the background. No card frame. No watermark.
Avoid: photorealism, scene background, extra UI, clutter.
```

Reroll button inactive:

```txt
Use case: stylized-concept
Asset type: horizontal overlay button for a task-card reroll action

Primary request: Create one horizontal inactive “换一个” overlay button for the task card system.
Style/medium: Chinese pixel-brutalist game UI button, thick black outlines, collectible-game control feel, readable at compact size.
Composition/framing: centered single button only, no card behind it.
Color palette: obvious gray inactive/disabled state, black outline, visually lower-energy than the active state.
Text (verbatim): “换一个”
Constraints: place the button on a perfectly flat solid #ff00ff chroma-key background for transparency removal. No shadow on the background. No card frame. No watermark.
Avoid: photorealism, scene background, extra UI, clutter.
```

## Demo Target

The first review target is one demo set for `movement_001`:

* `public/assets/task-cards/demo/movement_001-base.png`
* `public/assets/task-cards/demo/status-pending.png`
* `public/assets/task-cards/demo/status-complete.png`
* `public/assets/task-cards/demo/reroll-button-active.png`
* `public/assets/task-cards/demo/reroll-button-inactive.png`

This demo set is the review gate before generating the remaining 20-card batch.

## Acceptance Criteria

The demo is acceptable only when:

* the base card reads clearly as a complete 3:4 card
* the base card has no baked completion-state icon or reroll button
* the base card visibly leaves clean room for those overlays
* both status overlays are readable and transparent
* both reroll-button overlays are readable and transparent
* the active reroll state reads clearly yellow
* the inactive reroll state reads clearly gray
* the five assets look like they belong to one card system
