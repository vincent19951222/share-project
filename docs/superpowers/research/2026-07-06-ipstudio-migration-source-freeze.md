# IPStudio Migration Source Freeze

> Captured for share-project Phase 1 AI image migration.

## Source

- Path: `/Users/vincent/Projects/IPStudio`
- HEAD: `be4578accbbab29dec46af4d606db454093f8f13`
- Captured at: `2026-07-06 Asia/Shanghai`

## Dirty Files Included

```text
M CLAUDE.md
M app/api/images/playground/tasks/route.test.ts
M app/api/images/tasks/route.test.ts
M lib/server/generationRepository.ts
M lib/server/generationTaskApi.ts
M lib/server/playgroundTaskRepository.test.ts
M lib/server/playgroundTaskRepository.ts
M lib/server/themeConfigRepository.ts
M screens/UnifiedCreation.test.tsx
M screens/UnifiedCreation.tsx
M services/generationTaskService.test.ts
M services/generationTaskService.ts
M types.ts
?? app/api/images/playground/tasks/[taskId]/retry/
?? app/api/images/tasks/[taskId]/retry/
?? docs/superpowers/plans/2026-07-04-desktop-playground-chat-flow.md
?? docs/superpowers/specs/2026-07-05-generation-task-retry-design.md
?? lib/server/sqlite.ts
```

## Source Files To Read During Implementation

- `/Users/vincent/Projects/IPStudio/lib/server/imageGeneration.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/cosStorage.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/generationTaskApi.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/playgroundTaskRepository.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/playgroundTaskRunner.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/themeRegistry.ts`
- `/Users/vincent/Projects/IPStudio/lib/designScenes.ts`
- `/Users/vincent/Projects/IPStudio/screens/UnifiedCreation.tsx`
- `/Users/vincent/Projects/IPStudio/services/generationTaskService.ts`

## Runtime Boundary

share-project must not import from `/Users/vincent/Projects/IPStudio` at runtime. All migrated code is copied or translated into share-project-owned modules.
