# Social Invitation Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“点名喝水”等弱社交邀请在接收方已有打开页面时可被发现，并在补给站导航和首页清楚展示待响应入口。

**Architecture:** 复用现有 `SocialInvitation`、`buildGamificationStateForUser()` 和 `SupplyStationProductionSnapshot.social`，不新增数据库表。前端把 `pendingReceivedCount + teamWidePendingCount` 提升到补给站导航上下文、Navbar、补给站首页，并在页面可见时做轻量轮询刷新；“忽略”补一个最小持久化接口，避免刷新后又出现。

**Tech Stack:** Next.js App Router, React client components, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, existing supply UI-lab components.

---

## Diagnosis Summary

- 邀请会正常创建：`lib/gamification/social-invitations.ts` 已创建 `SocialInvitation.status = "PENDING"`。
- 接收方状态已有数据：`lib/gamification/state.ts` 返回 `social.received`、`social.teamWide`、`pendingReceivedCount` 和 `teamWidePendingCount`。
- 当前断点在 UI/刷新：入口藏在 `任务记录 -> 队友雷达`，Navbar 没有弱社交 badge，`SupplyStationShell` 只在 mount 或当前用户操作后刷新。
- 企业微信只是外部兜底；未配置或失败时邀请仍保留，但接收方没有任何醒目的站内反馈。

## Files

- Modify: `lib/navigation-routes.ts`
  - 给 `SupplyNavContext` 增加弱社交通知摘要。
- Modify: `lib/supply-nav-context.ts`
  - 从生产 snapshot 提取待响应数和最近邀请文案。
- Modify: `components/navbar/Navbar.tsx`
  - 给桌面补给站主入口、二级“任务记录”、移动补给站入口增加待响应 badge。
- Modify: `app/globals.css`
  - 增加 badge 样式，保证不挤压导航布局。
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
  - 给首页 preview 增加 `socialInvitationNotice`。
- Modify: `components/gamification/production/supply-ui-lab-adapters.ts`
  - 将 snapshot social invitation 转成首页提示卡和任务记录 badge。
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
  - 在首页渲染“队友邀请待响应”提示，点击进入任务记录。
- Modify: `components/gamification/production/SupplyStationShell.tsx`
  - 页面可见时轻量轮询刷新 snapshot；响应或忽略后立即刷新。
- Modify: `lib/gamification/social-invitations.ts`
  - 增加 `dismissSocialInvitation()`，只允许接收方忽略自己的 direct invite；team-wide 可以按用户写响应式忽略时不改变全局邀请状态。
- Create: `app/api/gamification/social/dismiss/route.ts`
  - 当前登录用户忽略邀请。
- Modify: `lib/api.ts`
  - 增加 `dismissSocialInvitation()` client helper。
- Modify: `__tests__/navbar-supply-chrome.test.tsx`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
- Modify: `__tests__/supply-ui-lab-production-adapters.test.ts`
- Modify: `__tests__/supply-production-shell.test.tsx`
- Modify: `__tests__/gamification-social-invitations.test.ts`
- Create: `__tests__/gamification-social-dismiss-api.test.ts`
- Modify: `__tests__/supply-task-record-scene.test.tsx`

## Implementation Rules

- 不改 Prisma schema，除非执行时发现无法持久化 direct ignore；首选把 direct invite 状态更新为 `CANCELLED`，仅用于“对当前接收人关闭”。
- 不把 direct invite 写入 `TeamDynamic`，避免个人邀请变成全队广播。
- 轮询只在 `document.visibilityState === "visible"` 时运行，默认 30 秒一次。
- 刷新失败不打断页面，也不清空已有 snapshot。
- 首页提示卡只在 `pendingReceivedCount + teamWidePendingCount > 0` 时出现。
- Navbar badge 的 aria 文案必须包含待响应数量。

---

### Task 1: Surface Social Pending Count In Navigation

**Files:**
- Modify: `lib/navigation-routes.ts`
- Modify: `lib/supply-nav-context.ts`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/navbar-supply-chrome.test.tsx`

- [ ] **Step 1: Write failing navbar test**

Add or extend a `supplyNavContext` fixture in `__tests__/navbar-supply-chrome.test.tsx` with:

```ts
const supplyNavContextWithSocial = {
  resources: [
    { id: "coins", label: "银子", value: 120, iconImage: "/coins.png" },
    { id: "ticket", label: "抽奖券", value: 2, iconImage: "/ticket.png" },
    { id: "backpack", label: "背包", value: 6, maxValue: 60, iconImage: "/backpack.png" },
  ],
  profile: { username: "li", avatarKey: "male1" },
  social: {
    pendingCount: 2,
    latestLabel: "luo 邀请你喝水",
  },
};
```

Add assertions:

```tsx
expect(container.querySelector(".app-supply-social-badge")?.textContent).toBe("2");
expect(
  container.querySelector(".app-supply-primary-tab")?.getAttribute("aria-label"),
).toContain("2 个队友邀请待响应");
expect(
  Array.from(container.querySelectorAll(".app-supply-secondary-tab")).find((tab) =>
    tab.textContent?.includes("任务记录"),
  )?.textContent,
).toContain("2");
expect(container.querySelector(".app-supply-mobile-wallet")?.getAttribute("aria-label")).toContain(
  "luo 邀请你喝水",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: FAIL because `SupplyNavContext` has no `social` field and Navbar has no social badge.

- [ ] **Step 3: Add nav context type and builder**

Update `lib/navigation-routes.ts`:

```ts
export interface SupplyNavSocialContext {
  pendingCount: number;
  latestLabel: string | null;
}

export interface SupplyNavContext {
  resources: SupplyNavResource[];
  profile: {
    username: string;
    avatarKey: string;
  };
  social: SupplyNavSocialContext;
}
```

Update `lib/supply-nav-context.ts`:

```ts
function buildLatestSocialLabel(snapshot: SupplyStationProductionSnapshot): string | null {
  const latest = [...snapshot.social.received, ...snapshot.social.teamWide].find(
    (invite) => invite.status === "PENDING",
  );

  if (!latest) {
    return null;
  }

  return `${latest.senderUsername ?? "队友"} 邀请你${latest.invitationType === "DRINK_WATER" ? "喝水" : "互动"}`;
}
```

Return:

```ts
social: {
  pendingCount: snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount,
  latestLabel: buildLatestSocialLabel(snapshot),
},
```

- [ ] **Step 4: Render navbar badges**

In `components/navbar/Navbar.tsx`, derive:

```ts
const socialPendingCount = supplyNavContext?.social.pendingCount ?? 0;
const socialPendingLabel =
  socialPendingCount > 0
    ? `${socialPendingCount} 个队友邀请待响应${supplyNavContext?.social.latestLabel ? `，${supplyNavContext.social.latestLabel}` : ""}`
    : "";
```

Add badge inside the desktop supply primary tab and mobile supply tab:

```tsx
{socialPendingCount > 0 ? <span className="app-supply-social-badge">{socialPendingCount}</span> : null}
```

For secondary nav, add the same badge only when `item.id === "taskRecord"`.

Extend relevant `aria-label` values with `socialPendingLabel`.

- [ ] **Step 5: Add stable badge CSS**

Add to `app/globals.css`:

```css
.app-supply-social-badge {
  display: inline-flex;
  min-width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border: 2px solid #1f2937;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 2px 0 0 #1f2937;
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- __tests__/navbar-supply-chrome.test.tsx
```

Expected: PASS.

---

### Task 2: Add Dashboard Invitation Entry

**Files:**
- Modify: `components/gamification/ui-lab/supply-dashboard/types.ts`
- Modify: `components/gamification/production/supply-ui-lab-adapters.ts`
- Modify: `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`
- Modify: `__tests__/supply-dashboard-scene.test.tsx`
- Modify: `__tests__/supply-ui-lab-production-adapters.test.ts`

- [ ] **Step 1: Write failing adapter test**

In `__tests__/supply-ui-lab-production-adapters.test.ts`, build a snapshot with:

```ts
social: {
  ...snapshot.social,
  pendingReceivedCount: 1,
  teamWidePendingCount: 0,
  received: [
    {
      id: "invite-water-1",
      senderUserId: "u2",
      senderUsername: "luo",
      recipientUserId: "u1",
      recipientUsername: "li",
      invitationType: "DRINK_WATER",
      status: "PENDING",
      dayKey: "2026-06-04",
      message: "喝口水",
      responseCount: 0,
      wechatWebhookSentAt: null,
      respondedAt: null,
      expiredAt: null,
      createdAt: "2026-06-04T02:00:00.000Z",
    },
  ],
}
```

Assert:

```ts
const dashboard = toSupplyDashboardPreview(snapshotWithInvite);
expect(dashboard.socialInvitationNotice).toEqual({
  pendingCount: 1,
  title: "队友邀请待响应",
  message: "luo 邀请你喝水：喝口水",
  actionLabel: "去回应",
  target: "task-record",
});
expect(dashboard.shortcutLinks.find((link) => link.id === "task-record")?.badge).toBe("1 待回应");
```

- [ ] **Step 2: Run adapter test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-ui-lab-production-adapters.test.ts
```

Expected: FAIL because `socialInvitationNotice` does not exist.

- [ ] **Step 3: Add dashboard preview type**

Update `components/gamification/ui-lab/supply-dashboard/types.ts`:

```ts
export type SupplyDashboardSocialInvitationNotice = {
  pendingCount: number;
  title: string;
  message: string;
  actionLabel: string;
  target: "task-record";
};
```

Add to `SupplyDashboardPreview`:

```ts
socialInvitationNotice?: SupplyDashboardSocialInvitationNotice;
```

- [ ] **Step 4: Map snapshot social state to notice**

In `components/gamification/production/supply-ui-lab-adapters.ts`, add:

```ts
function getSocialInvitationNotice(snapshot: SupplyStationProductionSnapshot) {
  const pendingCount = snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount;
  const latest = [...snapshot.social.received, ...snapshot.social.teamWide].find(
    (invite) => invite.status === "PENDING",
  );

  if (pendingCount <= 0 || !latest) {
    return undefined;
  }

  const action = latest.invitationType === "DRINK_WATER" ? "喝水" : "互动";

  return {
    pendingCount,
    title: "队友邀请待响应",
    message: `${latest.senderUsername ?? "队友"} 邀请你${action}：${latest.message}`,
    actionLabel: "去回应",
    target: "task-record" as const,
  };
}
```

In `toSupplyDashboardPreview()`, set:

```ts
socialInvitationNotice: getSocialInvitationNotice(snapshot),
```

Change the task-record shortcut badge:

```ts
badge:
  snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount > 0
    ? `${snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount} 待回应`
    : String(snapshot.taskRecord.timeline.length),
```

- [ ] **Step 5: Render dashboard notice**

In `components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx`, render near the shortcut or announcement area:

```tsx
{data.socialInvitationNotice ? (
  <button
    className="supply-dashboard-social-notice"
    onClick={() => onNavigate?.(data.socialInvitationNotice!.target)}
    type="button"
  >
    <strong>{data.socialInvitationNotice.title}</strong>
    <span>{data.socialInvitationNotice.message}</span>
    <em>{data.socialInvitationNotice.actionLabel}</em>
  </button>
) : null}
```

- [ ] **Step 6: Write and run scene test**

In `__tests__/supply-dashboard-scene.test.tsx`, add a test with `socialInvitationNotice` and `onNavigate`:

```tsx
expect(container.textContent).toContain("队友邀请待响应");
expect(container.textContent).toContain("luo 邀请你喝水");
container.querySelector<HTMLButtonElement>(".supply-dashboard-social-notice")?.click();
expect(onNavigate).toHaveBeenCalledWith("task-record");
```

Run:

```bash
npm test -- __tests__/supply-dashboard-scene.test.tsx __tests__/supply-ui-lab-production-adapters.test.ts
```

Expected: PASS.

---

### Task 3: Refresh Recipient State While Page Is Visible

**Files:**
- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `__tests__/supply-production-shell.test.tsx`

- [ ] **Step 1: Write failing polling test**

In `__tests__/supply-production-shell.test.tsx`, use fake timers:

```tsx
vi.useFakeTimers();
Object.defineProperty(document, "visibilityState", {
  configurable: true,
  value: "visible",
});
```

Stub fetch so first state has `pendingReceivedCount: 0`, second has `pendingReceivedCount: 1`.

Assert:

```tsx
expect(fetch).toHaveBeenCalledTimes(1);
await act(async () => {
  vi.advanceTimersByTime(30_000);
});
await flush();
expect(fetch).toHaveBeenCalledTimes(2);
expect(container.textContent).toContain("队友邀请待响应");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected: FAIL because there is no interval refresh.

- [ ] **Step 3: Add visible-only refresh loop**

In `components/gamification/production/SupplyStationShell.tsx`, add a refresh helper:

```ts
const refreshSnapshotSilently = useCallback(async () => {
  try {
    const nextSnapshot = await fetchSupplyStationState();
    applySnapshot(nextSnapshot);
  } catch {
    // Keep the current snapshot if a background refresh fails.
  }
}, [applySnapshot]);
```

Add effect:

```ts
useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  const refreshIfVisible = () => {
    if (document.visibilityState === "visible") {
      void refreshSnapshotSilently();
    }
  };

  const timer = window.setInterval(refreshIfVisible, 30_000);
  document.addEventListener("visibilitychange", refreshIfVisible);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", refreshIfVisible);
  };
}, [refreshSnapshotSilently]);
```

- [ ] **Step 4: Run shell test**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

---

### Task 4: Persist Ignore For Direct Invitations

**Files:**
- Modify: `lib/gamification/social-invitations.ts`
- Create: `app/api/gamification/social/dismiss/route.ts`
- Modify: `lib/api.ts`
- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Modify: `components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx`
- Modify: `__tests__/gamification-social-invitations.test.ts`
- Create: `__tests__/gamification-social-dismiss-api.test.ts`
- Modify: `__tests__/supply-task-record-scene.test.tsx`
- Modify: `__tests__/supply-production-shell.test.tsx`

- [ ] **Step 1: Write service test**

Add to `__tests__/gamification-social-invitations.test.ts`:

```ts
it("lets the direct recipient dismiss a pending invitation", async () => {
  await prisma.inventoryItem.create({
    data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
  });
  const created = await createSocialInvitationFromItem({
    userId: senderId,
    itemId: "drink_water_ping",
    target: { recipientUserId: recipientId },
    fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
  });

  const dismissed = await dismissSocialInvitation({
    userId: recipientId,
    invitationId: created.invitation.id,
  });

  expect(dismissed.status).toBe("CANCELLED");
  const invitation = await prisma.socialInvitation.findUniqueOrThrow({
    where: { id: created.invitation.id },
  });
  expect(invitation.status).toBe("CANCELLED");
});
```

Also test sender cannot dismiss:

```ts
await expect(
  dismissSocialInvitation({ userId: senderId, invitationId: created.invitation.id }),
).rejects.toMatchObject({ code: "RESPONDER_NOT_ALLOWED" });
```

- [ ] **Step 2: Implement minimal service**

In `lib/gamification/social-invitations.ts`, export:

```ts
export async function dismissSocialInvitation(input: { userId: string; invitationId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, teamId: true },
  });

  if (!user) {
    throw new SocialInvitationError("用户不存在。", "USER_NOT_FOUND", 401);
  }

  const invitation = await prisma.socialInvitation.findUnique({
    where: { id: input.invitationId },
    select: { id: true, teamId: true, recipientUserId: true, status: true },
  });

  if (!invitation || invitation.teamId !== user.teamId) {
    throw new SocialInvitationError("邀请不存在。", "INVITATION_NOT_FOUND", 404);
  }

  if (invitation.recipientUserId !== user.id) {
    throw new SocialInvitationError("只有被邀请人可以忽略。", "RESPONDER_NOT_ALLOWED", 403);
  }

  if (invitation.status !== "PENDING") {
    throw new SocialInvitationError("邀请已不可忽略。", "INVITATION_CLOSED");
  }

  return prisma.socialInvitation.update({
    where: { id: invitation.id },
    data: { status: "CANCELLED" },
  });
}
```

- [ ] **Step 3: Add API route and client helper**

Create `app/api/gamification/social/dismiss/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  dismissSocialInvitation,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { invitationId?: unknown } | null;

    if (!payload || typeof payload.invitationId !== "string") {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const invitation = await dismissSocialInvitation({
      userId,
      invitationId: payload.invitationId,
    });

    return NextResponse.json({ invitation: { id: invitation.id, status: invitation.status } });
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

Add to `lib/api.ts`:

```ts
export async function dismissSocialInvitation(payload: { invitationId: string }) {
  const response = await fetch("/api/gamification/social/dismiss", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "忽略队友邀请失败");
}
```

- [ ] **Step 4: Wire UI ignore action**

In `SupplyTaskRecordScene`, replace local-only ignore with:

```ts
if (action === "ignore" && onDismissSocialInvitation) {
  onDismissSocialInvitation(inviteId);
  return;
}
```

In `SupplyStationShell`, add action key `"dismiss-social-invitation"` and callback:

```ts
const handleDismissSocialInvitation = useCallback(
  (invitationId: string) => {
    void runAction("dismiss-social-invitation", async () => {
      await dismissSocialInvitation({ invitationId });
      return "已忽略队友邀请";
    });
  },
  [runAction],
);
```

Pass it to `SupplyTaskRecordScene`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts __tests__/gamification-social-dismiss-api.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

---

### Task 5: Verification And Commit

**Files:**
- All files touched above.

- [ ] **Step 1: Run targeted social and supply tests**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts __tests__/gamification-social-respond-api.test.ts __tests__/gamification-state-api.test.ts __tests__/navbar-supply-chrome.test.tsx __tests__/supply-dashboard-scene.test.tsx __tests__/supply-ui-lab-production-adapters.test.ts __tests__/supply-task-record-scene.test.tsx __tests__/supply-production-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual browser smoke**

Start dev server if needed:

```bash
npm run dev -- --host 127.0.0.1 --port 3002
```

Open:

```text
http://127.0.0.1:3002/dashboard/status
```

Manual checks:

- Send `drink_water_ping` from user A to user B.
- Keep user B page open and visible.
- Within 30 seconds, B sees Navbar badge and dashboard invitation notice.
- Clicking notice opens task record; “队友雷达” shows the invite.
- Clicking “回应” clears pending count after refresh.
- Send another invite; clicking “忽略” clears pending count and does not return after reload.

- [ ] **Step 4: Commit**

Run:

```bash
git add lib/navigation-routes.ts lib/supply-nav-context.ts lib/api.ts lib/gamification/social-invitations.ts app/api/gamification/social/dismiss/route.ts components/navbar/Navbar.tsx components/gamification/production/SupplyStationShell.tsx components/gamification/production/supply-ui-lab-adapters.ts components/gamification/ui-lab/supply-dashboard/types.ts components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene.tsx components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene.tsx app/globals.css __tests__/navbar-supply-chrome.test.tsx __tests__/supply-dashboard-scene.test.tsx __tests__/supply-ui-lab-production-adapters.test.ts __tests__/supply-production-shell.test.tsx __tests__/gamification-social-invitations.test.ts __tests__/gamification-social-dismiss-api.test.ts __tests__/supply-task-record-scene.test.tsx
git commit -m "fix: surface social invitation notifications"
```

Expected: commit created.

## Open Decision

- Team-wide “忽略”不能用 `SocialInvitation.status = CANCELLED`，否则会影响全队。第一版可以只对 direct invite 开启忽略持久化；team-wide 保留“回应”，不显示“忽略”。如果产品必须支持 team-wide per-user ignore，需要新增 per-user dismissal 数据结构，另开小任务。
