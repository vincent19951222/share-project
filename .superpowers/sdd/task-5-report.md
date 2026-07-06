# Task 5 Report: Build Provider And COS Storage Services

## What I implemented

- Added `lib/gamification/ai-image/provider.ts` as a server-only provider adapter.
  - Exposes `generateAiImage(input)`.
  - Uses `AI_IMAGE_GENERATION_URL`, `AI_IMAGE_EDIT_URL`, `AI_IMAGE_MAX_REFERENCE_IMAGES`, and `AI_IMAGE_PROVIDER_MODEL` from `lib/gamification/ai-image/constants.ts`.
  - Keeps API key lookup server-side via `BOLUOPETS_API_KEY` / `VITE_BOLUOPETS_API_KEY`.
  - Sends JSON requests for pure generation and multipart `FormData` requests for reference-image edits.
  - Returns `{ b64Json, mimeType: "image/png" }`.
  - Throws Chinese errors for missing API key, provider failure, and missing image payload.

- Added `lib/gamification/ai-image/cos-storage.ts` as a server-only COS storage module.
  - Exposes `parseImageDataUrl`, `buildAiImageCosKey`, `uploadAiImageDataUrl`, and `uploadAiImageBase64`.
  - Parses supported `png/jpeg/webp` data URLs without storing base64/data URLs in SQLite.
  - Builds stable COS keys from the Task 5 prefixes in `constants.ts`.
  - Uploads buffers to COS with `cos-nodejs-sdk-v5` using env-based credentials and public base URL.
  - Adds the required `uploadAiImageBase64(input)` helper for provider `b64Json` output uploads.

- Added focused server-side tests:
  - `__tests__/ai-image-provider.test.ts`
  - `__tests__/ai-image-cos-storage.test.ts`

## Tests and exact result

Command:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Exact GREEN result:

```text
Test Files  2 passed (2)
     Tests  8 passed (8)
```

## TDD evidence

### RED

Command:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Result:

```text
FAIL  __tests__/ai-image-cos-storage.test.ts
Error: Cannot find package '@/lib/gamification/ai-image/cos-storage'

FAIL  __tests__/ai-image-provider.test.ts
Error: Cannot find package '@/lib/gamification/ai-image/provider'
```

This verified the tests failed for the expected missing-module reason before implementation.

### GREEN

Command:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Result:

```text
Test Files  2 passed (2)
     Tests  8 passed (8)
```

## Files changed

- `__tests__/ai-image-provider.test.ts`
- `__tests__/ai-image-cos-storage.test.ts`
- `lib/gamification/ai-image/provider.ts`
- `lib/gamification/ai-image/cos-storage.ts`

## Self-review findings

- Change scope stayed inside Task 5 files only.
- No runtime import from `/Users/vincent/Projects/IPStudio`; behavior was translated into share-project-owned modules.
- Provider internals, request bodies, and API key access remain server-side.
- Added explicit coverage for the brief clarification: `uploadAiImageBase64(input)`.
- `git diff --check` returned clean.

## Concerns

- None.

---

## Review fix follow-up

### What I fixed

- Tightened `parseImageDataUrl()` base64 validation.
  - Rejects malformed payloads like `====` and `a`.
  - Rejects zero-byte decodes.
  - Enforces canonical base64 by round-tripping decoded bytes back to `base64`.
- Tightened provider test coverage.
  - Verifies generation request URL, auth header, JSON content type, and exact JSON body fields.
  - Verifies edit request URL, auth header, `FormData` fields, and uploaded image file behavior.
  - Verifies non-OK provider messages propagate.
  - Verifies missing `b64_json` throws `生图服务没有返回图片`.
- Tightened COS test coverage.
  - Added malformed base64 rejection cases.
  - Added jpeg/webp parsing coverage.
  - Added missing COS secrets/config error coverage.
  - Strengthened `uploadAiImageBase64()` contract assertions for `putObject` args and returned URL fields.
- Removed the `VITE_BOLUOPETS_API_KEY` fallback from `getProviderApiKey()`.
  - The Task 5 env contract only declares `BOLUOPETS_API_KEY`.
  - A repo-wide search in this worktree did not show an existing share-project convention requiring the client-style fallback.

### Review-fix TDD evidence

#### RED

Command:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Result:

```text
FAIL  __tests__/ai-image-cos-storage.test.ts > AI image COS storage helpers > rejects malformed base64 payloads
AssertionError: expected [Function] to throw an error
```

This showed the current implementation still accepted malformed base64 payloads.

#### GREEN

Command:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Result:

```text
Test Files  2 passed (2)
     Tests  14 passed (14)
```

### Review-fix files touched

- `__tests__/ai-image-provider.test.ts`
- `__tests__/ai-image-cos-storage.test.ts`
- `lib/gamification/ai-image/provider.ts`
- `lib/gamification/ai-image/cos-storage.ts`

### Review-fix self-review

- `git diff --check` returned clean after the changes.
- Scope stayed inside the four Task 5 code/test files plus this report append.
- No additional runtime dependencies or adjacent refactors were introduced.
