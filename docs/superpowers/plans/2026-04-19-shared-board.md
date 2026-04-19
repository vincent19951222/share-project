# Shared Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `共享看板` as the third main tab, providing a lightweight team sticky-note wall based on `design/board-prototype.html`.

**Architecture:** Add a `BoardNote` Prisma model scoped to `Team` and `User`, expose `/api/board-notes` API routes for list/create/soft-delete, then build a focused `components/shared-board/` client module that polls every 30 seconds. Keep `activeTab` in the existing board reducer, while note data remains local to `SharedBoard`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Prisma 7 + SQLite, React client components, Tailwind/global CSS, Vitest.

---

## Source Material

- Design spec: `docs/superpowers/specs/2026-04-19-shared-board-design.md`
- Visual prototype: `design/board-prototype.html`
- Existing navigation: `components/navbar/Navbar.tsx`
- Existing tab state: `lib/types.ts`, `lib/store.tsx`, `app/(board)/page.tsx`
- Existing DB patterns: `prisma/schema.prisma`, `lib/prisma.ts`, `app/api/user/profile/route.ts`
- Existing test patterns: `__tests__/profile-api.test.ts`, `__tests__/seed.test.ts`

## Scope Check

This plan implements one subsystem: the shared-board tab. It must not implement Quest/GP, punch persistence, image uploads, reactions, comments, pinned-note UI, or administrator permissions.

## File Structure

- Modify: `prisma/schema.prisma` — add `BoardNote` model and relations.
- Modify: `__tests__/seed.test.ts` — delete board notes before deleting users/teams.
- Create: `__tests__/board-note-schema.test.ts` — verify Prisma can create/query board notes.
- Create: `lib/board-notes.ts` — shared constants, validation, DTO mapping, relative time helper.
- Create: `__tests__/board-notes-api.test.ts` — API contract tests.
- Create: `app/api/board-notes/route.ts` — list and create notes.
- Create: `app/api/board-notes/[id]/route.ts` — soft-delete notes.
- Create: `components/shared-board/SharedBoard.tsx` — container, fetch, polling, optimistic UI reconciliation.
- Create: `components/shared-board/NoteComposer.tsx` — post form.
- Create: `components/shared-board/NoteMasonry.tsx` — masonry wrapper and empty state.
- Create: `components/shared-board/NoteCard.tsx` — single note card.
- Create: `components/shared-board/SyncStatus.tsx` — sync status pill.
- Modify: `lib/types.ts` — add `board` active tab value.
- Modify: `components/navbar/Navbar.tsx` — add `共享看板` tab.
- Modify: `app/(board)/page.tsx` — render `SharedBoard`.
- Modify: `app/globals.css` — add note card, masonry, color picker, and sync status styles.

---

### Task 1: Add BoardNote Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `__tests__/seed.test.ts`
- Create: `__tests__/board-note-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `__tests__/board-note-schema.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("BoardNote schema", () => {
  let teamId: string;
  let authorId: string;

  beforeAll(async () => {
    await seedDatabase();
    await prisma.boardNote.deleteMany();

    const user = await prisma.user.findUnique({
      where: { username: "li" },
      include: { team: true },
    });

    authorId = user!.id;
    teamId = user!.teamId;
  });

  afterAll(async () => {
    await prisma.boardNote.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a shared-board note connected to a team and author", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId,
        type: "FREE",
        content: "今天 5km，腿还在。",
        color: "YELLOW",
      },
      include: {
        team: true,
        author: true,
      },
    });

    expect(note.id).toBeTruthy();
    expect(note.team.id).toBe(teamId);
    expect(note.author.id).toBe(authorId);
    expect(note.isDeleted).toBe(false);
    expect(note.pinned).toBe(false);
    expect(note.expiresAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
npm test -- __tests__/board-note-schema.test.ts
```

Expected: FAIL because `prisma.boardNote` does not exist on the generated Prisma client.

- [ ] **Step 3: Update Prisma schema**

Modify `prisma/schema.prisma` so `Team` and `User` include board-note relations:

```prisma
model Team {
  id         String      @id @default(cuid())
  name       String
  code       String      @unique
  createdAt  DateTime    @default(now())
  users      User[]
  boardNotes BoardNote[]
}

model User {
  id           String        @id @default(cuid())
  username     String        @unique
  password     String
  avatarKey    String
  coins        Int           @default(0)
  teamId       String
  team         Team          @relation(fields: [teamId], references: [id])
  punchRecords PunchRecord[]
  boardNotes   BoardNote[]
  createdAt    DateTime      @default(now())
}
```

Add this model after `PunchRecord`:

```prisma
model BoardNote {
  id        String    @id @default(cuid())
  teamId    String
  team      Team      @relation(fields: [teamId], references: [id])
  authorId  String
  author    User      @relation(fields: [authorId], references: [id])
  type      String
  content   String
  color     String?
  isDeleted Boolean   @default(false)
  pinned    Boolean   @default(false)
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([teamId, isDeleted, pinned, createdAt])
  @@index([authorId])
}
```

- [ ] **Step 4: Update seed cleanup for the new relation**

In `__tests__/seed.test.ts`, update the `beforeAll` cleanup:

```typescript
beforeAll(async () => {
  await prisma.boardNote.deleteMany();
  await prisma.punchRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
});
```

- [ ] **Step 5: Push schema and regenerate Prisma client**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: both commands complete successfully and generated client includes `boardNote`.

- [ ] **Step 6: Run the schema test**

Run:

```bash
npm test -- __tests__/board-note-schema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma __tests__/seed.test.ts __tests__/board-note-schema.test.ts
git commit -m "schema: add shared board notes"
```

---

### Task 2: Add Board Notes API

**Files:**
- Create: `lib/board-notes.ts`
- Create: `__tests__/board-notes-api.test.ts`
- Create: `app/api/board-notes/route.ts`
- Create: `app/api/board-notes/[id]/route.ts`

- [ ] **Step 1: Add shared constants and helpers**

Create `lib/board-notes.ts`:

```typescript
export const BOARD_NOTE_MAX_LENGTH = 1000;

export const BOARD_NOTE_TYPES = ["FREE", "ANNOUNCEMENT"] as const;
export type BoardNoteType = (typeof BOARD_NOTE_TYPES)[number];

export const BOARD_NOTE_COLORS = ["YELLOW", "BLUE", "GREEN", "PINK"] as const;
export type BoardNoteColor = (typeof BOARD_NOTE_COLORS)[number];

export interface BoardNoteDto {
  id: string;
  type: BoardNoteType;
  content: string;
  color: BoardNoteColor | null;
  pinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarKey: string;
  };
  canDelete: boolean;
}

interface BoardNoteRecord {
  id: string;
  type: string;
  content: string;
  color: string | null;
  pinned: boolean;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    username: string;
    avatarKey: string;
  };
}

export function isBoardNoteType(value: unknown): value is BoardNoteType {
  return typeof value === "string" && BOARD_NOTE_TYPES.includes(value as BoardNoteType);
}

export function isBoardNoteColor(value: unknown): value is BoardNoteColor {
  return typeof value === "string" && BOARD_NOTE_COLORS.includes(value as BoardNoteColor);
}

export function normalizeBoardNoteInput(body: unknown):
  | { ok: true; value: { type: BoardNoteType; content: string; color: BoardNoteColor | null } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "请求内容无效" };
  }

  const input = body as { type?: unknown; content?: unknown; color?: unknown };

  if (!isBoardNoteType(input.type)) {
    return { ok: false, error: "无效的便签类型" };
  }

  if (typeof input.content !== "string") {
    return { ok: false, error: "内容不能为空" };
  }

  const content = input.content.trim();

  if (content.length === 0) {
    return { ok: false, error: "内容不能为空" };
  }

  if (content.length > BOARD_NOTE_MAX_LENGTH) {
    return { ok: false, error: `内容不能超过 ${BOARD_NOTE_MAX_LENGTH} 字` };
  }

  if (input.type === "ANNOUNCEMENT") {
    return { ok: true, value: { type: input.type, content, color: null } };
  }

  if (input.color === undefined || input.color === null || input.color === "") {
    return { ok: true, value: { type: input.type, content, color: "YELLOW" } };
  }

  if (!isBoardNoteColor(input.color)) {
    return { ok: false, error: "无效的便签颜色" };
  }

  return { ok: true, value: { type: input.type, content, color: input.color } };
}

export function mapBoardNoteToDto(note: BoardNoteRecord, currentUserId: string): BoardNoteDto {
  return {
    id: note.id,
    type: note.type as BoardNoteType,
    content: note.content,
    color: note.color as BoardNoteColor | null,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    author: {
      id: note.author.id,
      name: note.author.username,
      avatarKey: note.author.avatarKey,
    },
    canDelete: note.authorId === currentUserId,
  };
}

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString("zh-CN");
}
```

- [ ] **Step 2: Write failing API tests**

Create `__tests__/board-notes-api.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/board-notes/route";
import { DELETE } from "@/app/api/board-notes/[id]/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

function request(method: string, userId?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/board-notes", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
  });
}

describe("/api/board-notes", () => {
  let userId: string;
  let otherUserId: string;
  let crossTeamUserId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    await prisma.boardNote.deleteMany();

    const user = await prisma.user.findUnique({
      where: { username: "li" },
      include: { team: true },
    });
    const otherUser = await prisma.user.findUnique({ where: { username: "luo" } });

    userId = user!.id;
    teamId = user!.teamId;
    otherUserId = otherUser!.id;

    const crossTeam = await prisma.team.upsert({
      where: { code: "BOARD-X" },
      update: { name: "外部小队" },
      create: { code: "BOARD-X", name: "外部小队" },
    });

    const crossUser = await prisma.user.upsert({
      where: { username: "board_cross_user" },
      update: { teamId: crossTeam.id, avatarKey: "male4", password: "test", coins: 0 },
      create: {
        username: "board_cross_user",
        password: "test",
        avatarKey: "male4",
        coins: 0,
        teamId: crossTeam.id,
      },
    });

    crossTeamUserId = crossUser.id;
  });

  afterAll(async () => {
    await prisma.boardNote.deleteMany();
    await prisma.user.deleteMany({ where: { username: "board_cross_user" } });
    await prisma.team.deleteMany({ where: { code: "BOARD-X" } });
    await prisma.$disconnect();
  });

  it("creates a free note", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "今天练背，明天约跑。",
      color: "GREEN",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.note.type).toBe("FREE");
    expect(body.note.content).toBe("今天练背，明天约跑。");
    expect(body.note.color).toBe("GREEN");
    expect(body.note.author.id).toBe(userId);
    expect(body.note.canDelete).toBe(true);
  });

  it("creates an announcement and stores null color", async () => {
    const response = await POST(request("POST", userId, {
      type: "ANNOUNCEMENT",
      content: "周五团队聚餐。",
      color: "PINK",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.note.type).toBe("ANNOUNCEMENT");
    expect(body.note.color).toBeNull();
  });

  it("rejects empty content", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "   ",
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid type", async () => {
    const response = await POST(request("POST", userId, {
      type: "TASK",
      content: "不要混进任务系统。",
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid color", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "颜色不对。",
      color: "PURPLE",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects content longer than 1000 characters", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "牛".repeat(1001),
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("returns only notes from the current user's team", async () => {
    await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "本队便签",
        color: "BLUE",
      },
    });

    const crossUser = await prisma.user.findUnique({ where: { id: crossTeamUserId } });
    await prisma.boardNote.create({
      data: {
        teamId: crossUser!.teamId,
        authorId: crossTeamUserId,
        type: "FREE",
        content: "外队便签",
        color: "PINK",
      },
    });

    const response = await GET(request("GET", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const contents = body.notes.map((note: { content: string }) => note.content);

    expect(contents).toContain("本队便签");
    expect(contents).not.toContain("外队便签");
  });

  it("excludes soft-deleted notes", async () => {
    await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "已经删掉的便签",
        color: "YELLOW",
        isDeleted: true,
      },
    });

    const response = await GET(request("GET", userId));
    const body = await response.json();
    const contents = body.notes.map((note: { content: string }) => note.content);

    expect(contents).not.toContain("已经删掉的便签");
  });

  it("soft-deletes the author's own note", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "我自己删",
        color: "GREEN",
      },
    });

    const response = await DELETE(request("DELETE", userId), { params: Promise.resolve({ id: note.id }) });
    expect(response.status).toBe(200);

    const deleted = await prisma.boardNote.findUnique({ where: { id: note.id } });
    expect(deleted!.isDeleted).toBe(true);
  });

  it("rejects deletion by another user", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "别人不能删",
        color: "BLUE",
      },
    });

    const response = await DELETE(request("DELETE", otherUserId), { params: Promise.resolve({ id: note.id }) });

    expect(response.status).toBe(403);
  });

  it("requires authentication", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run API tests to verify they fail**

Run:

```bash
npm test -- __tests__/board-notes-api.test.ts
```

Expected: FAIL because the API route files do not exist.

- [ ] **Step 4: Implement list/create route**

Create `app/api/board-notes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapBoardNoteToDto, normalizeBoardNoteInput } from "@/lib/board-notes";

async function getCurrentUser(userId: string | undefined) {
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request.cookies.get("userId")?.value);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const notes = await prisma.boardNote.findMany({
      where: {
        teamId: user.teamId,
        isDeleted: false,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarKey: true,
          },
        },
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      notes: notes.map((note) => mapBoardNoteToDto(note, user.id)),
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request.cookies.get("userId")?.value);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const normalized = normalizeBoardNoteInput(body);

    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const note = await prisma.boardNote.create({
      data: {
        teamId: user.teamId,
        authorId: user.id,
        type: normalized.value.type,
        content: normalized.value.content,
        color: normalized.value.color,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarKey: true,
          },
        },
      },
    });

    return NextResponse.json({
      note: mapBoardNoteToDto(note, user.id),
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement delete route**

Create `app/api/board-notes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getCurrentUser(userId: string | undefined) {
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request.cookies.get("userId")?.value);

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;

    const note = await prisma.boardNote.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
        authorId: true,
      },
    });

    if (!note || note.teamId !== user.teamId) {
      return NextResponse.json({ error: "便签不存在" }, { status: 404 });
    }

    if (note.authorId !== user.id) {
      return NextResponse.json({ error: "只能删除自己的便签" }, { status: 403 });
    }

    await prisma.boardNote.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run API tests**

Run:

```bash
npm test -- __tests__/board-notes-api.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/board-notes.ts app/api/board-notes __tests__/board-notes-api.test.ts
git commit -m "feat: add shared board notes API"
```

---

### Task 3: Build Shared Board UI Components

**Files:**
- Create: `components/shared-board/SyncStatus.tsx`
- Create: `components/shared-board/NoteCard.tsx`
- Create: `components/shared-board/NoteMasonry.tsx`
- Create: `components/shared-board/NoteComposer.tsx`
- Create: `components/shared-board/SharedBoard.tsx`

- [ ] **Step 1: Create SyncStatus component**

Create `components/shared-board/SyncStatus.tsx`:

```tsx
"use client";

type SyncState = "idle" | "syncing" | "error";

const LABELS: Record<SyncState, string> = {
  idle: "自动同步",
  syncing: "同步中",
  error: "同步异常",
};

export function SyncStatus({ state }: { state: SyncState }) {
  const isError = state === "error";

  return (
    <div
      className={`sync-status-pill ${isError ? "sync-status-error" : "sync-status-ok"}`}
      aria-live="polite"
    >
      <span className={`sync-status-dot ${state === "syncing" ? "pulse-dot" : ""}`} />
      <span>{LABELS[state]}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create NoteCard component**

Create `components/shared-board/NoteCard.tsx`:

```tsx
"use client";

import type { BoardNoteDto } from "@/lib/board-notes";
import { formatRelativeTime } from "@/lib/board-notes";
import { getAvatarUrl } from "@/lib/avatars";

const COLOR_CLASS = {
  YELLOW: "note-free-yellow",
  BLUE: "note-free-blue",
  GREEN: "note-free-green",
  PINK: "note-free-pink",
} as const;

interface NoteCardProps {
  note: BoardNoteDto;
  deleting?: boolean;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, deleting = false, onDelete }: NoteCardProps) {
  const isAnnouncement = note.type === "ANNOUNCEMENT";
  const colorClass = isAnnouncement ? "note-announcement" : COLOR_CLASS[note.color ?? "YELLOW"];

  return (
    <article className={`note-card ${colorClass} ${deleting ? "opacity-60 pointer-events-none" : ""}`}>
      {note.canDelete && (
        <button
          type="button"
          className="note-close-btn"
          onClick={() => onDelete(note.id)}
          aria-label="删除便签"
          disabled={deleting}
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-3 mb-3 pr-9">
        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center border-2 border-slate-300 shadow-sm shrink-0 overflow-hidden">
          <img
            src={getAvatarUrl(note.author.avatarKey)}
            alt={note.author.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-sm text-main truncate max-w-[9rem]">{note.author.name}</span>
            <span className={`type-badge ${isAnnouncement ? "badge-announcement" : "badge-free"}`}>
              {isAnnouncement ? "团队通告" : "自由笔记"}
            </span>
          </div>
          <span className="text-xs text-sub font-bold">{formatRelativeTime(note.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm font-bold text-main leading-relaxed whitespace-pre-wrap break-words">
        {note.content}
      </p>
    </article>
  );
}
```

- [ ] **Step 3: Create NoteMasonry component**

Create `components/shared-board/NoteMasonry.tsx`:

```tsx
"use client";

import type { BoardNoteDto } from "@/lib/board-notes";
import { NoteCard } from "./NoteCard";

interface NoteMasonryProps {
  notes: BoardNoteDto[];
  deletingIds: Set<string>;
  onDelete: (id: string) => void;
}

export function NoteMasonry({ notes, deletingIds, onDelete }: NoteMasonryProps) {
  if (notes.length === 0) {
    return (
      <div className="soft-card p-8 text-center">
        <p className="font-black text-xl text-main">还没人贴便签</p>
        <p className="font-bold text-sm text-sub mt-2">先来一张，给今天的团队小墙开个张。</p>
      </div>
    );
  }

  return (
    <div className="note-masonry">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          deleting={deletingIds.has(note.id)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create NoteComposer component**

Create `components/shared-board/NoteComposer.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { BoardNoteColor, BoardNoteType } from "@/lib/board-notes";
import { BOARD_NOTE_MAX_LENGTH } from "@/lib/board-notes";
import { getAvatarUrl } from "@/lib/avatars";

const COLORS: Array<{ value: BoardNoteColor; className: string; label: string }> = [
  { value: "YELLOW", className: "bg-yellow-200", label: "黄色" },
  { value: "BLUE", className: "bg-blue-200", label: "蓝色" },
  { value: "GREEN", className: "bg-green-200", label: "绿色" },
  { value: "PINK", className: "bg-pink-200", label: "粉色" },
];

interface NoteComposerProps {
  currentUser: {
    name: string;
    avatarKey: string;
  };
  submitting: boolean;
  onSubmit: (input: { type: BoardNoteType; content: string; color: BoardNoteColor | null }) => Promise<boolean>;
}

export function NoteComposer({ currentUser, submitting, onSubmit }: NoteComposerProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<BoardNoteType>("FREE");
  const [color, setColor] = useState<BoardNoteColor>("YELLOW");
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = content.trim().length;
  const isTooLong = content.length > BOARD_NOTE_MAX_LENGTH;
  const canSubmit = useMemo(
    () => trimmedLength > 0 && !isTooLong && !submitting,
    [trimmedLength, isTooLong, submitting],
  );

  async function submit() {
    if (trimmedLength === 0) {
      setError("先写点内容再发布。");
      return;
    }

    if (isTooLong) {
      setError(`内容不能超过 ${BOARD_NOTE_MAX_LENGTH} 字。`);
      return;
    }

    setError(null);
    const ok = await onSubmit({
      type,
      content,
      color: type === "FREE" ? color : null,
    });

    if (ok) {
      setContent("");
      setType("FREE");
      setColor("YELLOW");
    }
  }

  return (
    <section className="soft-card p-6 mb-4">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 shadow-sm shrink-0 overflow-hidden">
          <img
            src={getAvatarUrl(currentUser.avatarKey)}
            alt={currentUser.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="分享你的想法、训练心得、约饭约练或团队提醒..."
            className="shared-note-input"
            rows={4}
            maxLength={BOARD_NOTE_MAX_LENGTH + 1}
          />

          <div className="flex flex-col gap-3 mt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-sub">
                类型:
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as BoardNoteType)}
                  className="shared-note-select"
                >
                  <option value="FREE">自由笔记</option>
                  <option value="ANNOUNCEMENT">团队通告</option>
                </select>
              </label>

              <div className={`flex items-center gap-2 ${type === "ANNOUNCEMENT" ? "opacity-50" : ""}`}>
                <span className="text-xs font-bold text-sub">颜色:</span>
                <div className="flex gap-1">
                  {COLORS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`color-option ${item.className} ${color === item.value ? "selected" : ""}`}
                      onClick={() => setColor(item.value)}
                      disabled={type === "ANNOUNCEMENT"}
                      aria-label={item.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="quest-btn px-6 py-2 text-sm gap-2 min-w-24"
              onClick={() => void submit()}
              disabled={!canSubmit}
            >
              {submitting ? "发布中" : "发布"}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs font-bold text-red-500 min-h-4">{error}</p>
            <p className={`text-xs font-bold ${isTooLong ? "text-red-500" : "text-sub"}`}>
              {content.length}/{BOARD_NOTE_MAX_LENGTH}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create SharedBoard container**

Create `components/shared-board/SharedBoard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardNoteColor, BoardNoteDto, BoardNoteType } from "@/lib/board-notes";
import { useBoard } from "@/lib/store";
import { NoteComposer } from "./NoteComposer";
import { NoteMasonry } from "./NoteMasonry";
import { SyncStatus } from "./SyncStatus";

type SyncState = "idle" | "syncing" | "error";

export function SharedBoard() {
  const { state } = useBoard();
  const [notes, setNotes] = useState<BoardNoteDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);

  const currentMember = useMemo(
    () => state.members.find((member) => member.id === state.currentUserId) ?? state.members[0],
    [state.currentUserId, state.members],
  );

  const fetchNotes = useCallback(async () => {
    setSyncState("syncing");

    try {
      const response = await fetch("/api/board-notes", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const body = await response.json() as { notes: BoardNoteDto[] };
      setNotes(body.notes);
      setSyncState("idle");
    } catch {
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    void fetchNotes();
    const timer = window.setInterval(() => {
      void fetchNotes();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [fetchNotes]);

  async function createNote(input: { type: BoardNoteType; content: string; color: BoardNoteColor | null }) {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/board-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to publish note");
      }

      const body = await response.json() as { note: BoardNoteDto };
      setNotes((current) => [body.note, ...current.filter((note) => note.id !== body.note.id)]);
      void fetchNotes();
      return true;
    } catch {
      setMessage("发布失败，稍后再试");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: string) {
    setDeletingIds((current) => new Set(current).add(id));
    setMessage(null);

    try {
      const response = await fetch(`/api/board-notes/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      setNotes((current) => current.filter((note) => note.id !== id));
      void fetchNotes();
    } catch {
      setMessage("删除失败");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section className="h-full overflow-y-auto p-4 no-scrollbar">
      <div className="flex justify-end mb-3">
        <SyncStatus state={syncState} />
      </div>

      <NoteComposer
        currentUser={{
          name: currentMember.name,
          avatarKey: currentMember.avatarKey,
        }}
        submitting={submitting}
        onSubmit={createNote}
      />

      {message && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
          {message}
        </div>
      )}

      <NoteMasonry notes={notes} deletingIds={deletingIds} onDelete={deleteNote} />
    </section>
  );
}
```

- [ ] **Step 6: Run type check through build**

Run:

```bash
npm run build
```

Expected: FAIL at this point because CSS classes and navigation integration are not added yet, or PASS if no type errors. If it fails for missing runtime imports or TypeScript errors, fix the component files before continuing.

- [ ] **Step 7: Commit**

```bash
git add components/shared-board
git commit -m "feat: add shared board UI components"
```

---

### Task 4: Integrate the Third Tab and Styles

**Files:**
- Modify: `lib/types.ts`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/(board)/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Extend active tab type**

In `lib/types.ts`, update the tab union:

```typescript
activeTab: "punch" | "board" | "dash";
```

Update `BoardAction`:

```typescript
| { type: "SET_TAB"; tab: "punch" | "board" | "dash" }
```

- [ ] **Step 2: Add Shared Board tab to Navbar**

In `components/navbar/Navbar.tsx`, add this `TabBtn` between `协同打卡` and `战报中心`:

```tsx
<TabBtn
  active={state.activeTab === "board"}
  onClick={() => dispatch({ type: "SET_TAB", tab: "board" })}
>
  <span className="w-4 h-4" dangerouslySetInnerHTML={{ __html: SvgIcons.megaphone }} />
  共享看板
</TabBtn>
```

Keep the existing punch and dash tabs unchanged except for their position around this new tab.

- [ ] **Step 3: Render SharedBoard in the main page**

In `app/(board)/page.tsx`, import the component:

```typescript
import { SharedBoard } from "@/components/shared-board/SharedBoard";
```

Replace the view container with three absolute panels:

```tsx
<div className="flex-1 w-full relative overflow-hidden">
  <div
    className={`absolute inset-0 transition-opacity duration-300 ${
      state.activeTab === "punch" ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <PunchBoard />
  </div>
  <div
    className={`absolute inset-0 transition-opacity duration-300 ${
      state.activeTab === "board" ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <SharedBoard />
  </div>
  <div
    className={`absolute inset-0 transition-opacity duration-300 ${
      state.activeTab === "dash" ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <ReportCenter />
  </div>
</div>
```

- [ ] **Step 4: Add shared-board styles**

Append to `app/globals.css`:

```css
.note-masonry {
  column-count: 4;
  column-gap: 1.25rem;
}
@media (max-width: 1400px) {
  .note-masonry { column-count: 3; }
}
@media (max-width: 1024px) {
  .note-masonry { column-count: 2; }
}
@media (max-width: 640px) {
  .note-masonry { column-count: 1; }
}

.note-card {
  break-inside: avoid;
  display: inline-block;
  width: 100%;
  margin-bottom: 1.25rem;
  position: relative;
  border: 4px solid #1f2937;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 4px 0 0 #1f2937;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.note-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 0 0 rgba(31, 41, 55, 0.3);
}
.note-free-yellow { background-color: #fef9c3; border-color: #fde047; }
.note-free-blue { background-color: #dbeafe; border-color: #93c5fd; }
.note-free-green { background-color: #dcfce7; border-color: #86efac; }
.note-free-pink { background-color: #fce7f3; border-color: #f9a8d4; }
.note-announcement { background-color: #ffffff; border-color: #e2e8f0; }

.note-close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #1f2937;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 800;
  color: #1f2937;
}
.note-close-btn:hover {
  background: #1f2937;
  color: #fde047;
  transform: rotate(90deg);
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
}
.badge-announcement {
  background-color: #1f2937;
  color: #fde047;
}
.badge-free {
  background-color: rgba(255, 255, 255, 0.8);
  color: #1f2937;
  border: 2px solid #1f2937;
}

.shared-note-input {
  width: 100%;
  padding: 1rem;
  border: 3px solid #e2e8f0;
  border-radius: 0.75rem;
  resize: none;
  outline: none;
  font-weight: 700;
  font-size: 0.875rem;
  color: #1e293b;
  background-color: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.shared-note-input:focus {
  border-color: #1f2937;
  box-shadow: 0 0 0 2px #fde047;
}
.shared-note-select {
  padding: 0.25rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 800;
  outline: none;
  background-color: #ffffff;
}
.shared-note-select:focus {
  border-color: #1f2937;
}

.color-option {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 3px solid #1f2937;
  cursor: pointer;
  transition: all 0.2s;
}
.color-option:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 2px 0 0 #1f2937;
}
.color-option.selected {
  box-shadow: 0 0 0 3px #1f2937;
}
.color-option:disabled {
  cursor: not-allowed;
}

.sync-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  border: 2px solid;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
}
.sync-status-ok {
  background-color: #dcfce7;
  border-color: #bbf7d0;
  color: #15803d;
}
.sync-status-error {
  background-color: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}
.sync-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: currentColor;
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts components/navbar/Navbar.tsx app/(board)/page.tsx app/globals.css
git commit -m "feat: add shared board tab"
```

---

### Task 5: Manual UX Verification and Final Fixes

**Files:**
- Modify only files required by verification findings.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 2: Verify core navigation manually**

Open the app in a browser and verify:

- `协同打卡` tab still renders the existing punch board.
- `共享看板` tab renders the composer and note area.
- `战报中心` tab still renders the report center.
- Switching tabs does not throw console errors.

- [ ] **Step 3: Verify shared-board interactions manually**

In `共享看板`, verify:

- Empty composer cannot publish.
- Free note publishes with selected color.
- Team announcement publishes with white announcement card.
- Multi-line content preserves line breaks.
- Own note shows a delete button.
- Deleting own note removes it from the list.
- Refreshing the page keeps created notes.
- Sync pill changes between `自动同步`, `同步中`, and `同步异常` based on fetch state.

- [ ] **Step 4: Verify responsive layout**

Check viewport widths around:

- Desktop: 1440px, masonry should use 4 columns.
- Medium desktop: 1200px, masonry should use 3 columns.
- Tablet: 900px, masonry should use 2 columns.
- Mobile: 390px, masonry should use 1 column and delete action remains usable.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- Tests pass.
- Build passes.
- `git status --short` only shows intentional changes or is clean after final commit.

- [ ] **Step 6: Commit any verification fixes**

If verification required changes:

```bash
git add <changed-files>
git commit -m "fix: polish shared board experience"
```

If no changes were required, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: `共享看板` tab, prototype reference, pure text, free/announcement types, colors, masonry layout, own-note deletion, soft delete, 30-second polling, no Quest scope.
- Placeholder scan: clear of placeholder markers and vague future-work instructions.
- Type consistency: `BoardNoteDto`, `BoardNoteType`, `BoardNoteColor`, `FREE`, `ANNOUNCEMENT`, `YELLOW`, `BLUE`, `GREEN`, `PINK`, `activeTab: "board"`.
- Verification: `npm test`, `npm run build`, and manual browser checks are required before completion.
