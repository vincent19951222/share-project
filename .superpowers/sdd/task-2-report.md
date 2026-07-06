# Task 2 Report: Add AI Image Prisma Models And Seed Reset

## Scope

- Modified `prisma/schema.prisma`
- Modified `lib/db-seed.ts`
- Added `__tests__/ai-image-schema.test.ts`

No other task-owned files were changed.

## Requirements Read

- `docs/superpowers/specs/2026-06-26-supply-station-ai-incentive-design.md`
- `docs/superpowers/specs/2026-07-06-supply-ai-image-ipstudio-migration-design.md`
- `.superpowers/sdd/task-2-brief.md`

## TDD Flow

### 1. RED: add failing schema test

Added `__tests__/ai-image-schema.test.ts` with two focused checks:

1. `stores theme unlocks, generation tasks, items, input images, and artworks`
2. `seedDatabase clears AI image rows for the seed team`

Ran:

```bash
npm test -- __tests__/ai-image-schema.test.ts
```

Observed expected failure:

- `TypeError: Cannot read properties of undefined (reading 'create')`
- Missing delegates:
  - `prisma.aiImageThemeUnlock`
  - `prisma.aiImageGenerationTask`

This confirmed the test was failing for the intended missing-schema reason.

### 2. GREEN: implement minimal schema and seed reset

In `prisma/schema.prisma`:

- Added relation arrays on `Team`
- Added relation arrays on `User`
- Added models:
  - `AiImageThemeUnlock`
  - `AiImageGenerationTask`
  - `AiImageGenerationItem`
  - `AiImageArtwork`
  - `AiImageTaskInputImage`

In `lib/db-seed.ts`:

- Added AI image row cleanup for the seed team in dependency order:
  1. `aiImageArtwork`
  2. `aiImageTaskInputImage`
  3. `aiImageGenerationItem`
  4. `aiImageGenerationTask`
  5. `aiImageThemeUnlock`

## Prisma Validation

Ran:

```bash
npx prisma generate
npx prisma db push
```

Both commands completed successfully.

## Focused Verification

Ran:

```bash
npm test -- __tests__/ai-image-schema.test.ts
```

Result:

- `1` test file passed
- `2` tests passed

## Prisma Relation Adjustment Note

The relation snippets from the task brief generated successfully as implemented. No extra relation renaming or schema broadening was required.

## Commit

- `feat: add ai image data models`
