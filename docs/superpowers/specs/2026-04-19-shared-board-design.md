# Shared Board Design

> 新增第三个主导航 Tab：`共享看板`。它不是 Quest、任务系统、正式公告系统或协作文档，而是脱脂牛马团队内部的轻量便签墙。

## Reference Prototype

视觉、布局和交互参考：`design/board-prototype.html`

该原型定义了第一版共享看板的主要体验：

- 顶部主导航中新增 `共享看板` Tab，与 `健身打卡`、`战报中心` 并列
- 顶部发布区：当前用户头像、多行输入框、类型选择、颜色选择、发布按钮
- 内容区：不同长度卡片组成的响应式瀑布流
- 内容类型：`自由笔记` 和 `普通通告`。实现时统一产品文案为 `团队通告`
- 自由笔记支持黄色、蓝色、绿色、粉色便签样式
- 通告使用更克制的白底卡片和深色标签
- 导航右侧显示同步状态
- 支持发布、删除、卡片进入/删除动效

实现时不需要逐字迁移原型里的演示脚本，但应保留它的产品气质、信息层级、brutalist 视觉语言和核心交互。

## Product Positioning

`共享看板` 是一个脱离正式办公语境的团队便签墙。它承载的是团队成员之间轻松、自由、有生活感的共享消息：

- 训练心得
- 约跑、约饭、约练
- 临时提醒
- 团队趣事
- 简短通告
- 打卡之外的鼓励、吐槽和小记录

它不追求流程闭环，也不做严肃的文档协作。它的目标是让团队成员在数据和战报之外看见彼此，让脱脂牛马更像一个有温度的小团队空间。

## First-Version Scope

第一版保持克制，只实现共享便签墙的核心体验：

- 支持发布纯文本便签，保留换行
- 便签类型分为 `自由笔记` 和 `团队通告`
- 自由笔记可选择黄色、蓝色、绿色、粉色
- 团队通告使用更正式的白底深色标签，但仍保持轻松风格
- 瀑布流展示便签，最新内容在最前
- 进入 `共享看板` Tab 时加载最新便签
- 停留在该 Tab 时每 30 秒自动刷新
- 发布者可以删除自己的便签
- 删除使用软删除
- 数据模型预留置顶和过期能力，但第一版 UI 不暴露

第一版明确不做：

- Quest / Todo / 任务流
- Markdown
- 图片上传
- 评论
- 点赞
- 收藏
- 置顶操作
- 管理员权限
- 真 WebSocket 或 SSE 实时推送
- 正式知识库或协作文档能力

## Lifecycle Strategy

共享看板采用混合生命周期思路，但第一版先只做基础字段预留。

产品方向：

- 普通便签应保持轻量流动，适合短期信息、随手记录和氛围内容
- 重要内容未来可以通过置顶、长期保留或通告类型留下来
- 第一版不暴露置顶或长期保留入口，避免看板过早变成正式公告系统

数据模型预留：

- `pinned`：未来可用于置顶或长期保留
- `expiresAt`：未来可用于普通便签自动过期
- `type`：区分自由笔记和团队通告

第一版列表不主动隐藏过期内容，除非后续实现明确的生命周期策略。

## Navigation

主导航从两个 Tab 扩展为三个 Tab：

```text
健身打卡 / 共享看板 / 战报中心
```

推荐顺序：

1. `健身打卡`：核心行动入口
2. `共享看板`：团队轻量消息空间
3. `战报中心`：阶段性总结与数据回看

`BoardState.activeTab` 从：

```typescript
"punch" | "dash"
```

扩展为：

```typescript
"punch" | "board" | "dash"
```

`共享看板` 和现有打卡、战报一样作为主视图切换，不新增独立路由。

## Page Layout

页面沿用 `design/board-prototype.html` 的结构。

### Top Composer

发布区位于内容流上方，不做悬浮。

包含：

- 当前用户头像
- 多行文本输入框
- 类型选择：`自由笔记` / `团队通告`。原型中的 `普通通告` 作为早期文案参考，产品内统一使用 `团队通告`
- 自由笔记颜色选择：黄色、蓝色、绿色、粉色
- 发布按钮

交互：

- 内容为空时不允许发布
- `Ctrl + Enter` 可以作为可选快捷发布
- 切换到 `团队通告` 时，颜色选择禁用或隐藏
- 发布中按钮进入 loading/disabled 状态
- 发布失败时保留输入内容

### Masonry Notes

便签区使用响应式瀑布流：

- 桌面宽屏：4 列
- 中等桌面：3 列
- 平板：2 列
- 移动端：1 列

每张卡片包含：

- 作者头像
- 作者名
- 类型标签
- 相对时间
- 纯文本正文，保留换行
- 作者本人的删除按钮

删除按钮：

- 桌面端 hover 时出现
- 移动端应保持可访问，不能依赖 hover
- 非作者不显示删除入口

### Sync Status

原型中的 `实时同步` 文案改为更准确的自动同步表达：

- 正常：`自动同步`
- 拉取中：`同步中`
- 失败：`同步异常`

第一版使用定时轮询，不承诺真正实时。

## Data Model

新增 Prisma 表：`BoardNote`

字段建议：

```prisma
model BoardNote {
  id        String   @id @default(cuid())
  teamId    String
  authorId  String
  type      String
  content   String
  color     String?
  isDeleted Boolean  @default(false)
  pinned    Boolean  @default(false)
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team      Team     @relation(fields: [teamId], references: [id])
  author    User     @relation(fields: [authorId], references: [id])

  @@index([teamId, isDeleted, pinned, createdAt])
  @@index([authorId])
}
```

Allowed `type` values:

- `FREE`
- `ANNOUNCEMENT`

Allowed `color` values:

- `YELLOW`
- `BLUE`
- `GREEN`
- `PINK`
- `null` for announcements

Use string values instead of Prisma enums to stay consistent with the existing SQLite-friendly modeling style.

## API Design

Use `/api/board-notes` instead of `/api/board` to avoid confusion with punch-board APIs.

### `GET /api/board-notes`

Returns notes for the current user's team.

Rules:

- Requires authenticated `userId` cookie
- Finds the current user and team
- Returns only notes from that team
- Excludes `isDeleted = true`
- Sorts by `pinned desc`, then `createdAt desc`
- Includes author display data: id, username, avatarKey

Response shape:

```typescript
interface BoardNoteDto {
  id: string;
  type: "FREE" | "ANNOUNCEMENT";
  content: string;
  color: "YELLOW" | "BLUE" | "GREEN" | "PINK" | null;
  pinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarKey: string;
  };
  canDelete: boolean;
}
```

### `POST /api/board-notes`

Creates a note in the current user's team.

Request:

```typescript
{
  type: "FREE" | "ANNOUNCEMENT";
  content: string;
  color?: "YELLOW" | "BLUE" | "GREEN" | "PINK";
}
```

Validation:

- Authenticated user required
- `content.trim()` must not be empty
- Content max length: 1000 characters
- `type` must be `FREE` or `ANNOUNCEMENT`
- `FREE` requires a valid color, defaulting to `YELLOW` if omitted
- `ANNOUNCEMENT` ignores color and stores `null`

Response:

- Returns the created note DTO

### `DELETE /api/board-notes/[id]`

Soft-deletes a note.

Rules:

- Authenticated user required
- Note must belong to the current user's team
- Only the author can delete
- Sets `isDeleted = true`
- Returns success status

## Frontend Architecture

Add a focused module:

```text
components/shared-board/
  SharedBoard.tsx
  NoteComposer.tsx
  NoteMasonry.tsx
  NoteCard.tsx
  SyncStatus.tsx
```

### `SharedBoard.tsx`

Page-level container for the new Tab.

Responsibilities:

- Fetch notes on mount
- Manage notes list
- Manage sync state
- Start/stop polling when the shared board is active
- Handle create/delete callbacks
- Preserve current notes if refresh fails

### `NoteComposer.tsx`

Publishing form.

Responsibilities:

- Input content state
- Type selection
- Color selection
- Submit disabled/loading states
- Inline validation feedback
- Preserve content after failed submit

### `NoteMasonry.tsx`

Pure layout component.

Responsibilities:

- Responsive column layout
- Empty state
- Mapping notes to `NoteCard`

### `NoteCard.tsx`

Single note card.

Responsibilities:

- Render color and type style
- Render author and timestamp
- Preserve text line breaks
- Render delete action only when `canDelete`
- Call delete handler

### `SyncStatus.tsx`

Small status pill.

Responsibilities:

- Render `自动同步` / `同步中` / `同步异常`
- Use a subtle pulse only for active sync states

This can live inside `SharedBoard` first. If the navigation needs to show the status globally, it can be lifted later.

## State Management

Only `activeTab` belongs in the existing `BoardProvider`.

Shared-board notes should remain local to `SharedBoard` rather than being added to the board reducer. Reasons:

- Notes are an independent API resource
- Punch-board state and message-board state have different lifecycles
- Polling and transient sync states are easier to manage locally
- It keeps the existing reducer focused on board-level navigation and punch interactions

Suggested local state:

```typescript
type SyncState = "idle" | "syncing" | "error";

interface SharedBoardState {
  notes: BoardNoteDto[];
  syncState: SyncState;
  submitting: boolean;
  deletingIds: Set<string>;
}
```

## Data Flow

Initial load:

1. User clicks `共享看板`
2. `activeTab` becomes `board`
3. `SharedBoard` mounts
4. Client calls `GET /api/board-notes`
5. Notes render in masonry layout

Polling:

1. While the shared board is active, poll every 30 seconds
2. Set status to `同步中` during fetch
3. Replace notes with latest successful response
4. If fetch fails, keep existing notes and show `同步异常`

Publishing:

1. User writes content and clicks `发布`
2. Client validates non-empty content
3. Client calls `POST /api/board-notes`
4. On success, clear input and insert returned note at the top
5. Trigger one follow-up fetch to reconcile with server ordering
6. On failure, keep input content and show a lightweight error

Deleting:

1. Author clicks delete on their own note
2. Client calls `DELETE /api/board-notes/[id]`
3. On success, remove the note locally
4. Trigger one follow-up fetch to reconcile
5. On failure, keep the note visible and show a lightweight error

## Error Handling

Validation:

- Empty content: disable publish button or show inline message
- Over 1000 characters: show inline message and prevent submit
- Invalid type/color: API returns `400`

Network/API failures:

- Fetch failure: keep existing notes; show `同步异常`
- Publish failure: keep composer content; show `发布失败，稍后再试`
- Delete failure: keep card visible; show `删除失败`

Auth/team failures:

- Missing auth cookie: return `401` from API
- Missing user/team: return `401` or `404`, consistent with existing API patterns
- Cross-team access: return `404` so other teams' notes are not discoverable
- Delete by non-author: return `403`

Empty state:

- Show a small friendly empty state when there are no notes, such as `还没人贴便签，先来一张？`

## Visual Design Notes

Keep the existing product language:

- Brutalist borders and shadows
- Yellow primary action button with press-down effect
- Dotted page background
- Bold rounded typography
- Avatar treatment consistent with current member avatars
- Card colors from the prototype, but keep the palette balanced and not dominated by one hue

Implementation details:

- Reuse `.soft-card` and `.quest-btn` where possible
- Add shared-board-specific classes for note colors and masonry layout
- Avoid nested cards; composer can be a single framed panel, note cards are repeated items
- Ensure long content wraps without overflowing
- Ensure mobile layout works without hover-only controls

## Security and Content Safety

First version renders plain text only.

Rules:

- Do not use `dangerouslySetInnerHTML` for note content
- Preserve line breaks through CSS, for example `white-space: pre-wrap`
- Trim leading/trailing whitespace before saving
- Enforce max length on both client and server
- Soft-delete instead of hard-delete

## Testing Plan

### API Tests

Add focused tests for `/api/board-notes`:

- `GET` returns only notes for the current user's team
- `GET` excludes soft-deleted notes
- `POST` creates a free note
- `POST` creates an announcement and stores `color = null`
- `POST` rejects empty content
- `POST` rejects invalid type
- `POST` rejects invalid color
- `POST` rejects content longer than 1000 characters
- `DELETE` soft-deletes the author's own note
- `DELETE` rejects deletion by another user
- Cross-team note access is not allowed

### Component Tests

Where practical:

- Composer disables publish for empty content
- Type switching disables or hides color selection for announcements
- Own note renders delete action
- Other users' notes do not render delete action
- Empty state renders when notes list is empty

### Manual Verification

- Three-tab navigation works: `健身打卡` / `共享看板` / `战报中心`
- Shared board matches `design/board-prototype.html` layout and tone
- Notes render in responsive masonry layout
- Publishing inserts a new note at the top
- Deleting own note removes it
- Non-author delete action is not visible
- Automatic polling does not clear content when fetch fails
- Sync status changes correctly
- Long multi-line text wraps cleanly on desktop and mobile

## Implementation Boundaries

This spec only defines the shared-board feature. It should not implement or modify:

- Quest / GP system
- Punch persistence
- Report-center charts
- Profile rank system
- Browser notifications
- Image uploads

If future work adds images, comments, reactions, pinned notes, or automatic expiry, those should be designed as follow-up specs rather than folded into the first implementation.
