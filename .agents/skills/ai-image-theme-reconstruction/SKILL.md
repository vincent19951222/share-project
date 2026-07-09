---
name: ai-image-theme-reconstruction
description: Use when working in share-project and the user provides a raw AI image theme prompt, asks to add or replace a theme, or expects previewImageUrl, COS, or WebP theme cover work.
---

# AI Image Theme Reconstruction

## Overview

Project-local workflow for turning raw image-generation prompts into production `share-project` AI image themes. The theme config, prompt structure, preview image, COS URL, tests, and git scope must move together.

## When to Use

Use this for requests like:
- "新增一个 theme，prompt 是..."
- "第 7 个 theme 用这个 prompt 替换"
- "preview 继续处理好"
- AI image theme prompt, `previewImageUrl`, WebP, COS, `themes.ts`

Do not use for ordinary generated artwork that is not becoming a theme preset.

## Core Contract

1. Inspect current state first:
   - `git status --short --branch`
   - `rg -n "theme-XX|previewImageUrl|promptSections|promptTemplate" lib/gamification/ai-image __tests__`
2. Identify whether the task is `replace` or `add`.
   - Replace: preserve `id`, `sortOrder`, `defaultUnlocked`, and `enabled` unless the user says otherwise.
   - Add: create the next stable `theme-XX`, set `sortOrder`, add tests for count and metadata.
3. Reconstruct raw prompts into structured `promptSections`, not a pasted legacy prompt.
   Required sections: `taskGoal`, `inputFit`, `referenceRules`, `styleRules`, `compositionRules`, `userPromptRules`, `conflictRules`, `qualityRules`, `negativeRules`.
4. Keep the product input model honest:
   - Real variable slots are reference image(s) and `{{user_instruction}}`.
   - Do not bake a one-off sample identity into reusable theme text.
   - Pick `templateKind` and `referencePolicy` from current `types.ts`.
5. Update focused tests:
   - `__tests__/ai-image-themes.test.ts`
   - `__tests__/ai-image-prompt.test.ts` if a legacy-template test used the replaced theme.
   - Prompt template tests only when the shared structure changes.

## Preview Asset Flow

Preview cover assets are remote COS WebP URLs, not committed local public files.

1. Use the project provider path when env is available:
   - Load `.env` with `@next/env`.
   - Use `VITE_BOLUOPETS_API_KEY` or `BOLUOPETS_API_KEY`.
   - Send reference image(s) to `/v1/images/edits` for reference-based themes.
2. Reference image choice:
   - Use the user-provided reference image.
   - If none is provided and `docs/example.png` fits the theme, use it as the default preview reference.
   - If no suitable reference exists for a required-reference theme, ask before generating.
3. Save temporary files under `tmp/ai-image-previews/`.
4. Inspect the generated PNG with `view_image`.
   - Confirm the prompt's core visual elements are present.
   - Regenerate once with a targeted prompt if the first output misses core elements.
5. Compress:
   ```bash
   cwebp -q 84 -m 6 tmp/ai-image-previews/<source>.png -o tmp/ai-image-previews/<slug>.webp
   ```
6. Upload to COS using `cos-nodejs-sdk-v5`.
   - Key pattern: `images/theme-XX-<short-slug>.webp`
   - `ContentType: image/webp`
7. Verify the public URL:
   ```bash
   curl -I --max-time 20 https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-XX-<short-slug>.webp
   ```
   Require `200 OK` and `Content-Type: image/webp`.
8. Replace `previewImageUrl` in `themes.ts` and expected URL in tests.
9. Remove `tmp/ai-image-previews/` before committing.

## Verification

Run focused checks, not broad churn:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts __tests__/ai-image-prompt.test.ts __tests__/ai-image-themes.test.ts
npm run lint
```

Run broader tests or browser preview only when the touched UI surface or shared contracts justify it.

## Git Scope

- Stay on the current branch unless the user asks for a new branch.
- Never stage unrelated dirty files.
- After successful verification, create a small commit for the completed theme or skill work unless the user says not to commit.
- Commit only the theme config, relevant tests, generated project-local skill/docs, and other intentionally changed files.
- Do not push unless the user asks.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Pasting raw prompt as `promptTemplate` | Rebuild as `promptSections` with the user slot. |
| Treating preview as a local `public/` asset | Generate, WebP-compress, upload to COS, then store the URL. |
| Forgetting visual inspection | Always inspect the generated source image before upload. |
| Replacing theme id/order | Preserve id and order for replacements. |
| Running broad commands in parallel with Prisma-generating commands | Run verification serially. |
| Committing unrelated dirty files | Stage explicit paths only. |
