# User Avatar System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SVG inline avatars with 8 preset PNG avatars, add register-in-login flow with avatar picker, and enable profile editing from navbar.

**Architecture:** Avatar images stored in `public/avatars/` as static files, DB stores avatar key string. Login API handles both login and register (auto-detect by username existence). New EditProfileModal for editing avatar and username. All avatar references change from inline SVG to `<img>` tags.

**Tech Stack:** Next.js 15, Prisma (SQLite), Tailwind CSS 4, Vitest, React 19

---

### Task 1: Copy avatar images and create avatar constants

**Files:**
- Create: `public/avatars/` directory with 8 PNG files
- Create: `lib/avatars.ts`

- [ ] **Step 1: Copy avatar PNG files to public/avatars/**

Run:
```bash
mkdir -p public/avatars
cp design/male1.png design/male2.png design/male3.png design/male4.png public/avatars/
cp design/female1.png design/female2.png design/female3.png design/female4.png public/avatars/
```

- [ ] **Step 2: Create lib/avatars.ts with avatar mapping constants**

Create `lib/avatars.ts`:

```ts
export const AVATAR_OPTIONS = [
  { key: "male1", label: "男生 1", url: "/avatars/male1.png" },
  { key: "male2", label: "男生 2", url: "/avatars/male2.png" },
  { key: "male3", label: "男生 3", url: "/avatars/male3.png" },
  { key: "male4", label: "男生 4", url: "/avatars/male4.png" },
  { key: "female1", label: "女生 1", url: "/avatars/female1.png" },
  { key: "female2", label: "女生 2", url: "/avatars/female2.png" },
  { key: "female3", label: "女生 3", url: "/avatars/female3.png" },
  { key: "female4", label: "女生 4", url: "/avatars/female4.png" },
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]["key"];

export function getAvatarUrl(key: string): string {
  return AVATAR_OPTIONS.find((a) => a.key === key)?.url ?? "/avatars/male1.png";
}

export function isValidAvatarKey(key: string): key is AvatarKey {
  return AVATAR_OPTIONS.some((a) => a.key === key);
}
```

- [ ] **Step 3: Commit**

```bash
git add public/avatars/ lib/avatars.ts
git commit -m "feat: add avatar images and avatar mapping constants"
```

---

### Task 2: Update types and remove SVG avatar references

**Files:**
- Modify: `lib/types.ts`
- Modify: `components/ui/SvgIcons.tsx`

- [ ] **Step 1: Update Member type in lib/types.ts**

In `lib/types.ts`, change `Member` interface:

```ts
export interface Member {
  id: string;
  name: string;
  avatarKey: string;
}
```

(Remove `avatarSvg: string`, add `avatarKey: string`)

- [ ] **Step 2: Remove avatar SVG entries from SvgIcons.tsx**

In `components/ui/SvgIcons.tsx`, delete these 5 lines from the object:
- `alen: ...`
- `bob: ...`
- `cindy: ...`
- `dave: ...`
- `eva: ...`

Keep all other SVG icons (action icons, log icons, misc icons) unchanged.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts components/ui/SvgIcons.tsx
git commit -m "refactor: replace avatarSvg with avatarKey in Member type"
```

---

### Task 3: Update seed data and layout data mapping

**Files:**
- Modify: `lib/db-seed.ts`
- Modify: `app/(board)/layout.tsx`

- [ ] **Step 1: Update avatarKey values in lib/db-seed.ts**

In `lib/db-seed.ts`, change `SEED_USERS` array:

```ts
export const SEED_USERS = [
  { username: "li", avatarKey: "male1", coins: 345 },
  { username: "luo", avatarKey: "male2", coins: 280 },
  { username: "liu", avatarKey: "female1", coins: 310 },
  { username: "wu", avatarKey: "male3", coins: 225 },
  { username: "ji", avatarKey: "female2", coins: 290 },
];
```

- [ ] **Step 2: Update layout.tsx to pass avatarKey instead of avatarSvg**

In `app/(board)/layout.tsx`:

1. Remove the import of `SvgIcons` (line 6)
2. Add import: `import { getAvatarUrl } from "@/lib/avatars";`
3. Change the members mapping (line 32-35):

```ts
  const members = team.users.map((u) => ({
    id: u.id,
    name: u.username,
    avatarKey: u.avatarKey,
  }));
```

(Remove the `avatarSvg: (SvgIcons as Record<string, string>)[u.avatarKey] || ""` line)

- [ ] **Step 3: Re-seed the database**

Run:
```bash
npx tsx prisma/seed.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/db-seed.ts app/(board)/layout.tsx
git commit -m "refactor: update seed data and layout to use avatarKey"
```

---

### Task 4: Update store and all components to use avatarKey

**Files:**
- Modify: `lib/store.tsx`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `components/punch-board/ActivityStream.tsx`
- Modify: `components/ui/Toast.tsx`

- [ ] **Step 1: Update store.tsx log text to not use avatarSvg**

In `lib/store.tsx`, update the PUNCH action log text (around line 19):

```ts
logs: [
  ...state.logs,
  {
    id: `log-${Date.now()}`,
    text: `<b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +15.`,
    type: "success",
    timestamp: new Date(),
  },
],
```

And the SIMULATE_REMOTE_PUNCH log text (around line 42):

```ts
logs: [
  ...state.logs,
  {
    id: `log-${Date.now()}`,
    text: `[实时推送] <b>${member.name}</b> 刚刚完成了 ${action.typeDesc}，点亮了格子！`,
    type: "highlight",
    timestamp: new Date(),
  },
],
```

(Remove the avatarSvg HTML embedding from both log texts)

- [ ] **Step 2: Update Navbar.tsx to use img tag for avatar**

In `components/navbar/Navbar.tsx`:

1. Add import: `import { getAvatarUrl } from "@/lib/avatars";`
2. Replace the avatar `<div>` (around line 55-57):

Change from:
```tsx
<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm p-1 text-slate-800">
  <span dangerouslySetInnerHTML={{ __html: currentMember.avatarSvg }} />
</div>
```

To:
```tsx
<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
  <img src={getAvatarUrl(currentMember.avatarKey)} alt={currentMember.name} className="w-full h-full object-cover" />
</div>
```

- [ ] **Step 3: Update HeatmapGrid.tsx avatar display**

In `components/punch-board/HeatmapGrid.tsx`:

1. Add import: `import { getAvatarUrl } from "@/lib/avatars";`
2. Replace the avatar div (around line 31-35):

Change from:
```tsx
<div
  className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border p-1 text-slate-800 bg-slate-50 ${
    isMe ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
  } relative`}
>
  <span dangerouslySetInnerHTML={{ __html: m.avatarSvg }} />
  {isMe && (
    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
  )}
</div>
```

To:
```tsx
<div
  className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
    isMe ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
  } relative`}
>
  <img src={getAvatarUrl(m.avatarKey)} alt={m.name} className="w-full h-full object-cover" />
  {isMe && (
    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
  )}
</div>
```

- [ ] **Step 4: Update ActivityStream.tsx toast data type**

In `components/punch-board/ActivityStream.tsx`:

1. Change `ToastData` interface:

```ts
interface ToastData {
  avatarKey: string;
  text: string;
}
```

2. Update the toast data setting (around line 51):

```ts
setToastData({ avatarKey: member.avatarKey, text: `${member.name} 刚刚打卡了！` });
```

- [ ] **Step 5: Update Toast.tsx to use img tag**

In `components/ui/Toast.tsx`:

1. Update interface:

```ts
interface ToastData {
  avatarKey: string;
  text: string;
}
```

2. Add import: `import { getAvatarUrl } from "@/lib/avatars";`
3. Replace avatar div (around line 29-31):

Change from:
```tsx
<div
  className="w-6 h-6 text-white"
  dangerouslySetInnerHTML={{ __html: data.avatarSvg }}
/>
```

To:
```tsx
<img
  src={getAvatarUrl(data.avatarKey)}
  alt=""
  className="w-6 h-6 rounded-full object-cover"
/>
```

- [ ] **Step 6: Commit**

```bash
git add lib/store.tsx components/navbar/Navbar.tsx components/punch-board/HeatmapGrid.tsx components/punch-board/ActivityStream.tsx components/ui/Toast.tsx
git commit -m "refactor: replace all avatarSvg usage with avatarKey + img tags"
```

---

### Task 5: Extend login API to support registration

**Files:**
- Modify: `app/api/auth/login/route.ts`
- Modify: `__tests__/login-api.test.ts`

- [ ] **Step 1: Write failing tests for registration**

In `__tests__/login-api.test.ts`, add new test cases at the end:

```ts
  it("should register new user when username does not exist", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "newuser", password: "1234", avatarKey: "male1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("newuser");
    expect(body.user.avatarKey).toBe("male1");
    expect(body.user).not.toHaveProperty("password");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("userId=");
  });

  it("should return 400 when registering without avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "another", password: "1234" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 when registering with invalid avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "another2", password: "1234", avatarKey: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/login-api.test.ts`
Expected: New tests FAIL (non-existent user returns 401, not register behavior)

- [ ] **Step 3: Implement registration logic in login API**

Replace the entire `app/api/auth/login/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { isValidAvatarKey } from "@/lib/avatars";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, avatarKey } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (user) {
      // Login existing user
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, avatarKey: user.avatarKey, coins: user.coins },
      });
      response.cookies.set("userId", user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // Register new user
    if (!avatarKey || !isValidAvatarKey(avatarKey)) {
      return NextResponse.json({ error: "请选择头像" }, { status: 400 });
    }

    const teams = await prisma.team.findMany();
    if (teams.length === 0) {
      return NextResponse.json({ error: "没有可用的团队" }, { status: 500 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        avatarKey,
        coins: 0,
        teamId: teams[0].id,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, avatarKey: newUser.avatarKey, coins: newUser.coins },
    });
    response.cookies.set("userId", newUser.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/login-api.test.ts`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.ts __tests__/login-api.test.ts
git commit -m "feat: extend login API to support auto-registration"
```

---

### Task 6: Update LoginForm with register mode and avatar picker

**Files:**
- Modify: `components/login/LoginForm.tsx`

- [ ] **Step 1: Rewrite LoginForm with register mode**

Replace entire `components/login/LoginForm.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_OPTIONS, type AvatarKey } from "@/lib/avatars";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register" && !selectedAvatar) {
      setError("请选择一个头像");
      setLoading(false);
      return;
    }

    try {
      const body: Record<string, string> = { username, password };
      if (mode === "register" && selectedAvatar) {
        body.avatarKey = selectedAvatar;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Username
        </label>
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter username"
            className="brutal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Password
        </label>
        <div className="input-group">
          <input
            type="password"
            placeholder="Enter password"
            className="brutal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      {mode === "register" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
            Choose Avatar
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map((avatar) => (
              <button
                key={avatar.key}
                type="button"
                onClick={() => setSelectedAvatar(avatar.key)}
                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedAvatar === avatar.key
                    ? "border-slate-800 shadow-[0_3px_0_0_#1f2937] scale-105 ring-2 ring-yellow-300"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm font-bold bg-red-50 border-2 border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="quest-btn w-full py-4 text-lg mt-4 flex gap-2 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        {loading ? "LOADING..." : mode === "login" ? "START QUEST" : "CREATE & JOIN"}
      </button>

      <button
        type="button"
        onClick={switchMode}
        className="text-sm font-bold text-sub hover:text-slate-800 transition-colors"
      >
        {mode === "login" ? "新用户？创建账号" : "已有账号？登录"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Remove test account hint from login page**

In `app/(auth)/login/page.tsx`, remove the test account hint section (lines 43-45):

```tsx
          <div className="mt-8 text-center">
            <span className="text-sub text-sm font-bold">测试账号：li / luo / liu / wu / ji </span>
            <span className="text-sub text-sm font-bold ml-2">密码：0000</span>
          </div>
```

- [ ] **Step 3: Commit**

```bash
git add components/login/LoginForm.tsx app/(auth)/login/page.tsx
git commit -m "feat: add register mode with avatar picker to LoginForm"
```

---

### Task 7: Create profile editing API

**Files:**
- Create: `app/api/user/profile/route.ts`
- Create: `__tests__/profile-api.test.ts`

- [ ] **Step 1: Write failing tests for profile API**

Create `__tests__/profile-api.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/user/profile/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("PATCH /api/user/profile", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    userId = user!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should update avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ avatarKey: "female3" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.avatarKey).toBe("female3");
  });

  it("should update username", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "li_updated" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.username).toBe("li_updated");
  });

  it("should return 401 without cookie", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "hack" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ avatarKey: "nonexistent" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/profile-api.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement profile API**

Create `app/api/user/profile/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAvatarKey } from "@/lib/avatars";

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const body = await request.json();
    const { username, avatarKey } = body;

    if (avatarKey !== undefined && !isValidAvatarKey(avatarKey)) {
      return NextResponse.json({ error: "无效的头像" }, { status: 400 });
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length === 0) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "用户名已被占用" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username: username.trim() }),
        ...(avatarKey !== undefined && { avatarKey }),
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        avatarKey: updatedUser.avatarKey,
        coins: updatedUser.coins,
      },
    });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/profile-api.test.ts`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/user/profile/route.ts __tests__/profile-api.test.ts
git commit -m "feat: add PATCH /api/user/profile for editing avatar and username"
```

---

### Task 8: Create EditProfileModal component

**Files:**
- Create: `components/profile/EditProfileModal.tsx`

- [ ] **Step 1: Create EditProfileModal component**

Create `components/profile/EditProfileModal.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_OPTIONS, type AvatarKey } from "@/lib/avatars";

interface EditProfileModalProps {
  currentUsername: string;
  currentAvatarKey: string;
  onClose: () => void;
}

export function EditProfileModal({ currentUsername, currentAvatarKey, onClose }: EditProfileModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(currentAvatarKey as AvatarKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarKey: selectedAvatar }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "更新失败");
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={overlayRef} className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0_0_#1f2937] z-[201] w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">编辑资料</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-800 transition-colors text-slate-400 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="brutal-input"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
              头像
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.key)}
                  disabled={loading}
                  className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedAvatar === avatar.key
                      ? "border-slate-800 shadow-[0_3px_0_0_#1f2937] scale-105 ring-2 ring-yellow-300"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold bg-red-50 border-2 border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 text-sm font-bold border-2 border-slate-200 rounded-xl hover:border-slate-800 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !username.trim()}
              className="quest-btn flex-1 py-3 text-sm disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/profile/EditProfileModal.tsx
git commit -m "feat: add EditProfileModal component"
```

---

### Task 9: Integrate EditProfileModal into ProfileDropdown

**Files:**
- Modify: `components/navbar/ProfileDropdown.tsx`
- Modify: `components/navbar/Navbar.tsx`

- [ ] **Step 1: Add edit profile button to ProfileDropdown**

In `components/navbar/ProfileDropdown.tsx`:

1. Add a new prop to the interface:

```ts
interface ProfileDropdownProps {
  onDismiss: () => void;
  onEditProfile: () => void;
}
```

2. Update function signature:

```ts
export function ProfileDropdown({ onDismiss, onEditProfile }: ProfileDropdownProps) {
```

3. Add "编辑资料" button before the logout button (around line 69, inside the last section div, before the logout button):

```tsx
          <button
            onClick={onEditProfile}
            className="mt-2 w-full py-2 text-sm font-bold text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
          >
            编辑资料
          </button>
```

- [ ] **Step 2: Add EditProfileModal state and handler in Navbar**

In `components/navbar/Navbar.tsx`:

1. Add imports:

```ts
import { getAvatarUrl } from "@/lib/avatars";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
```

(Remove `import { SvgIcons } from "@/components/ui/SvgIcons";` if no longer needed - check if SvgIcons is still used for the logo icon; it IS used for box, target, chart icons, so keep it)

2. Add state:

```ts
const [editModalOpen, setEditModalOpen] = useState(false);
```

3. Pass handler to ProfileDropdown:

```tsx
{profileOpen && <ProfileDropdown onDismiss={handleClickOutside} onEditProfile={() => { setProfileOpen(false); setEditModalOpen(true); }} />}
```

4. Add modal at the end of the nav's return, after the profile dropdown:

```tsx
{editModalOpen && (
  <EditProfileModal
    currentUsername={currentMember.name}
    currentAvatarKey={currentMember.avatarKey}
    onClose={() => setEditModalOpen(false)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/navbar/Navbar.tsx components/navbar/ProfileDropdown.tsx
git commit -m "feat: integrate EditProfileModal into Navbar ProfileDropdown"
```

---

### Task 10: Run all tests and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL tests PASS

- [ ] **Step 2: Run dev server and manual smoke test**

Run: `npm run dev`

Verify:
1. Login page shows login form
2. Click "新用户？创建账号" → avatar picker appears
3. Register a new user with avatar → redirects to board
4. Board shows user avatar as image in navbar and heatmap
5. Click profile dropdown → "编辑资料" button visible
6. Click "编辑资料" → modal opens with current avatar/username
7. Change avatar/username → save → page refreshes with new data
8. Existing user login still works

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```
