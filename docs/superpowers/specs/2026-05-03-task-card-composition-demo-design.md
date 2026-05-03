# Task Card Composition Demo Design Spec

Date: 2026-05-03

## Goal

Build a four-card composition demo before generating the full task-card batch.

This demo validates the final asset pipeline for task cards:

* which card elements should become shared UI components
* what fixed format AI-generated center illustrations should use
* how code composes shared UI, illustration art, and dynamic text into final PNG cards

This spec supersedes the batch-generation portion of `2026-05-03-task-card-png-assets-design.md` until the composition demo is reviewed and approved. The previous 20-card full-base-card generation path should stay paused.

## Demo Scope

The demo covers one representative card from each task dimension:

| Card ID | Dimension | Slogan | Title |
| --- | --- | --- | --- |
| `movement_004` | movement | 把电充绿 | 窗边回血 |
| `hydration_003` | hydration | 把尿喝白 | 杯子见底 |
| `social_001` | social | 把事办黄 | 废话 KPI |
| `learning_005` | learning | 把股看红 | 一句话笔记 |

The source of truth for title, dimension, effort, scene, and cooldown remains:

* `content/gamification/task-cards.ts`
* `content/gamification/dimensions.ts`

No other task cards are included in this demo.

## Output Contract

The demo produces four final PNG cards:

```txt
public/assets/task-cards/review/movement_004.png
public/assets/task-cards/review/hydration_003.png
public/assets/task-cards/review/social_001.png
public/assets/task-cards/review/learning_005.png
```

It also produces one review contact sheet:

```txt
public/assets/task-cards/review/contact-sheet.png
```

The review PNGs are for visual validation only. They are not yet wired into the app and should not replace the production task-card assets until the demo is approved.

## Asset Layers

Each final demo card is composed from three layers.

### 1. AI Illustration Layer

AI-generated art should provide only the central illustration or scene content.

The AI illustration should not contain:

* final card border
* final title text
* final dimension slogan
* effort, scene, or cooldown labels
* completion state
* reroll button
* status slot

Raw illustration format for newly generated art:

```txt
1500x1050 PNG
10:7 landscape ratio
RGB or RGBA
no transparent padding requirement
```

The composition script crops the raw illustration into the fixed card art window using cover behavior. It may crop edges, but it must not stretch or distort the image.

The current demo input folder is:

```txt
design/assets/task-card-art/raw/
```

The normalized crop cache is:

```txt
design/assets/task-card-art/cropped/
```

### 2. Shared UI Layer

Shared UI should be controlled by one template so the four cards prove they belong to the same system.

For this demo, the following elements are code-rendered:

* final canvas size and card ratio
* outer card silhouette
* thick black border
* parchment base fill
* dimension color frame
* title placement
* dimension slogan placement
* central illustration window
* tag row
* status slot placeholder
* reroll slot placeholder
* small bottom decoration

The following elements may be extracted into transparent PNG components after the demo proves the layout:

* hand-drawn distressed outer frame
* parchment grain or paper texture
* corner metal blocks
* pixel sticker accents
* decorative theme-strip overlays
* special status-slot shell
* special reroll-slot shell

Do not create many transparent UI assets in the first demo pass. First prove the layout and composition contract with code-rendered shared UI. Assetize only the parts where code looks too flat or fails to match the desired game-card feel.

### 3. Dynamic Text Layer

Dynamic card text is rendered by code, not baked into AI images.

Rendered text includes:

* dimension slogan
* card title
* effort label
* scene label
* cooldown label

This avoids AI text drift and makes future copy changes possible without regenerating art.

## Composition Rules

Use one deterministic composition script for all four cards.

The script must:

1. read the four demo card definitions from a local demo manifest whose values match `content/gamification/task-cards.ts` and `content/gamification/dimensions.ts`
2. load each card's raw illustration
3. crop each illustration into the fixed art window
4. draw the shared card template
5. render dynamic text from the card definition
6. write each final PNG to `public/assets/task-cards/review/`
7. write a contact sheet containing all four final PNGs

The composition should use fixed dimensions for the review cards. The initial review target can stay compact for fast iteration, but the coordinate system must be reusable for a higher-resolution final export.

Demo review canvas:

```txt
202x270 PNG
approximately 3:4
transparent outside the card silhouette
```

Future production export candidate:

```txt
900x1200 PNG
3:4 portrait card
same relative layout as the review canvas
```

## Theme Tokens

The four dimensions use these theme colors:

| Dimension | Color | Visual Role |
| --- | --- | --- |
| movement | `#3E9C35` | green energy frame and active accent |
| hydration | `#278BD6` | blue hydration frame and active accent |
| social | `#E1AE20` | yellow social frame and active accent |
| learning | `#D9432F` | red learning frame and active accent |

Neutral shared colors:

| Token | Color | Use |
| --- | --- | --- |
| ink | `#0F100E` | black outlines and main text |
| parchment | `#F2E5C7` | card body |
| parchment dark | `#D3BE97` | mats and recessed surfaces |
| white | `#FFFFF6` | contrast marks |
| tag background | `#F4EBD6` | secondary tags |

These tokens should live in the composition script first. If the demo is approved and the system moves into app integration, the tokens can be promoted into shared frontend constants or CSS variables.

## Review Criteria

The demo is accepted only if all four rendered cards satisfy:

* all four cards have the same outer geometry
* title, slogan, tags, status slot, and reroll slot align consistently
* each dimension color is clearly distinguishable
* central AI art is visible and not distorted
* AI art does not fight the text layer or card UI
* Chinese title and labels are readable
* the set reads as one card system, not four unrelated images
* the contact sheet makes inconsistency easy to spot

Reject or revise the demo if:

* a card relies on AI-generated text
* a raw illustration includes a baked full card frame that visually conflicts with the template
* one dimension needs a different layout to work
* the card feels too flat because too much visual style is code-only
* the card feels inconsistent because too much visual style remains in per-card AI art

## Decisions Deferred Until After Demo Review

The demo intentionally does not decide:

* whether final production cards should be exported as PNG or rendered live in React
* whether all 20 current raw card images are reusable
* how many transparent UI components should be generated with AI
* whether the production export size is exactly `900x1200`
* how the final cards are integrated into the task UI

Those decisions should be made after reviewing the four-card contact sheet.

## Implementation Follow-Up

After this spec is approved, write a separate implementation plan for:

1. normalizing the four demo illustration inputs
2. updating or creating the composition script
3. rendering the four final review PNGs
4. rendering the contact sheet
5. reviewing whether any shared UI elements need transparent PNG assetization

Do not start the full 20-card batch until this demo has been reviewed and the final asset pipeline is selected.
