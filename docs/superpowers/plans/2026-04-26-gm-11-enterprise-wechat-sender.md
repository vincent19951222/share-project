# GM-11 Enterprise WeChat Sender Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable server-side Enterprise WeChat robot sender with text/markdown formatting, environment-based webhook config, send result logging, and an admin test endpoint.

**Architecture:** Keep all Enterprise WeChat behavior in `lib/integrations/enterprise-wechat.ts` so future GM-12 weak social and GM-15 weekly report code call one stable service. Persist every send attempt to `EnterpriseWechatSendLog`; expected external-channel failures return structured results instead of throwing, while the admin test route exposes a safe way to verify configuration.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, server-side `fetch`.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `EnterpriseWechatSendLog` and optional `Team.enterpriseWechatSendLogs` relation.
- Generated: `lib/generated/prisma`
  - Regenerate Prisma client after schema sync.
- Create: `lib/integrations/enterprise-wechat.ts`
  - Message types, formatter helpers, config reader, sender, response parser, and log writer.
- Create: `app/api/admin/integrations/enterprise-wechat/test/route.ts`
  - Admin-only test send endpoint.
- Create: `__tests__/enterprise-wechat-sender.test.ts`
  - Unit/service tests for formatter, sender result handling, and logs.
- Create: `__tests__/enterprise-wechat-admin-api.test.ts`
  - Route tests for auth, admin permissions, bad bodies, skipped config, and successful send.
- Create: `.env.example`
  - Document `ENTERPRISE_WECHAT_WEBHOOK_URL` without committing a real key.

## Implementation Rules

- Use `ENTERPRISE_WECHAT_WEBHOOK_URL`; do not use a `NEXT_PUBLIC_` variable.
- Do not expose the webhook URL in any API response.
- Do not store the webhook URL in `EnterpriseWechatSendLog`.
- Missing webhook config returns `SKIPPED / MISSING_WEBHOOK_CONFIG`.
- Empty message content returns `FAILED / INVALID_MESSAGE`.
- Network failure returns `FAILED / NETWORK_ERROR`.
- HTTP non-2xx returns `FAILED / HTTP_ERROR`.
- Enterprise WeChat JSON with `errcode !== 0` returns `FAILED / WECHAT_ERROR`.
- Successful response requires HTTP 2xx and `errcode === 0`.
- Sender must log `SENT`, `SKIPPED`, and `FAILED`.
- GM-11 must not create `SocialInvitation`, `CoffeeRecord`, weekly report records, Team Dynamics events, or game economy records.

---

### Task 1: Add Failing Sender Tests

**Files:**
- Create: `__tests__/enterprise-wechat-sender.test.ts`

- [ ] **Step 1: Write sender tests**

Create `__tests__/enterprise-wechat-sender.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  formatEnterpriseWechatMarkdown,
  formatEnterpriseWechatText,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";
import { prisma } from "@/lib/prisma";

const originalWebhook = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;

function response(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enterprise wechat sender", () => {
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const team = await prisma.team.findUniqueOrThrow({ where: { code: "ROOM-88" } });
    teamId = team.id;
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalWebhook === undefined) {
      delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    } else {
      process.env.ENTERPRISE_WECHAT_WEBHOOK_URL = originalWebhook;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await prisma.$disconnect();
  });

  it("formats text messages and removes empty lines", () => {
    const message = formatEnterpriseWechatText({
      title: "牛马补给站",
      lines: ["luo 点名 li 喝水", " ", "今天别把自己腌入味。"],
      footer: "来自脱脂牛马",
    });

    expect(message).toEqual({
      type: "text",
      content: "【牛马补给站】\nluo 点名 li 喝水\n今天别把自己腌入味。\n来自脱脂牛马",
    });
  });

  it("formats markdown messages", () => {
    const message = formatEnterpriseWechatMarkdown({
      title: "牛马补给站提醒",
      quote: "luo 发起了出门溜达令",
      lines: ["请站起来走一圈。", "让工位以为你离职了。"],
      footer: "今天也要活着下班。",
    });

    expect(message.type).toBe("markdown");
    expect(message.content).toContain("**牛马补给站提醒**");
    expect(message.content).toContain("> luo 发起了出门溜达令");
    expect(message.content).toContain("- 请站起来走一圈。");
    expect(message.content).toContain("今天也要活着下班。");
  });

  it("truncates overlong formatted messages", () => {
    const message = formatEnterpriseWechatText({
      title: "牛马补给站",
      lines: ["x".repeat(5000)],
    });

    expect(message.content.length).toBeLessThanOrEqual(3800);
    expect(message.content.endsWith("...")).toBe(true);
  });

  it("skips send when webhook config is missing and writes a log", async () => {
    const fetchMock = vi.fn();

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });

    expect(result).toMatchObject({
      ok: false,
      status: "SKIPPED",
      reason: "MISSING_WEBHOOK_CONFIG",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toMatchObject({
      teamId,
      purpose: "MANUAL_TEST",
      messageType: "text",
      status: "SKIPPED",
      failureReason: "MISSING_WEBHOOK_CONFIG",
    });
  });

  it("sends text payload to configured webhook and logs success without storing the url", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi.fn().mockResolvedValue(response({ errcode: 0, errmsg: "ok" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      targetType: "AdminTest",
      targetId: "manual",
      message: { type: "text", content: "企业微信测试" },
      fetchImpl: fetchMock,
    });

    const [url, init] = fetchMock.mock.calls[0];
    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });

    expect(result).toMatchObject({
      ok: true,
      status: "SENT",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });
    expect(url).toBe(process.env.ENTERPRISE_WECHAT_WEBHOOK_URL);
    expect(JSON.parse(String(init.body))).toEqual({
      msgtype: "text",
      text: { content: "企业微信测试" },
    });
    expect(log.status).toBe("SENT");
    expect(log.responseBodySnippet).not.toContain("secret-key");
    expect(JSON.stringify(log)).not.toContain("secret-key");
  });

  it("returns failed result for empty message content", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi.fn();

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "markdown", content: "   " },
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "INVALID_MESSAGE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failed result for http errors", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi.fn().mockResolvedValue(response({ error: "bad gateway" }, { status: 502 }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "HTTP_ERROR",
      httpStatus: 502,
    });
  });

  it("returns failed result for enterprise wechat errcode", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi.fn().mockResolvedValue(response({ errcode: 93000, errmsg: "invalid webhook" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "WECHAT_ERROR",
      wechatErrcode: 93000,
      wechatErrmsg: "invalid webhook",
    });
  });

  it("returns failed result for network errors", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "NETWORK_ERROR",
      errorMessage: "network down",
    });
  });
});
```

- [ ] **Step 2: Run sender tests to verify failure**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts
```

Expected: FAIL because `lib/integrations/enterprise-wechat.ts` and `enterpriseWechatSendLog` do not exist.

---

### Task 2: Add Send Log Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `lib/generated/prisma`

- [ ] **Step 1: Add Team relation**

In `prisma/schema.prisma`, add the optional relation to `Team`:

```prisma
  enterpriseWechatSendLogs EnterpriseWechatSendLog[]
```

- [ ] **Step 2: Add log model**

Add this model to `prisma/schema.prisma`:

```prisma
model EnterpriseWechatSendLog {
  id                  String   @id @default(cuid())
  teamId              String?
  team                Team?    @relation(fields: [teamId], references: [id])
  purpose             String
  targetType          String?
  targetId            String?
  messageType         String
  messagePreview      String
  status              String
  failureReason       String?
  httpStatus          Int?
  wechatErrcode       Int?
  wechatErrmsg        String?
  errorMessage        String?
  responseBodySnippet String?
  createdAt           DateTime @default(now())

  @@index([teamId, createdAt])
  @@index([purpose, createdAt])
  @@index([targetType, targetId])
  @@index([status, createdAt])
}
```

- [ ] **Step 3: Sync Prisma schema**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: schema sync succeeds and generated client includes `enterpriseWechatSendLog`.

- [ ] **Step 4: Run schema-dependent sender tests**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts
```

Expected: FAIL because the sender implementation is still missing.

---

### Task 3: Implement Enterprise WeChat Sender

**Files:**
- Create: `lib/integrations/enterprise-wechat.ts`
- Test: `__tests__/enterprise-wechat-sender.test.ts`

- [ ] **Step 1: Create integration directory and file**

Create `lib/integrations/enterprise-wechat.ts`:

```ts
import { prisma } from "@/lib/prisma";

export type EnterpriseWechatMessage =
  | { type: "text"; content: string }
  | { type: "markdown"; content: string };

export type EnterpriseWechatSendPurpose =
  | "MANUAL_TEST"
  | "WEAK_SOCIAL_INVITATION"
  | "WEEKLY_REPORT"
  | "TEAM_BROADCAST";

export type EnterpriseWechatSendInput = {
  teamId?: string;
  purpose: EnterpriseWechatSendPurpose;
  targetType?: string;
  targetId?: string;
  message: EnterpriseWechatMessage;
  fetchImpl?: typeof fetch;
};

export type EnterpriseWechatSendResult =
  | {
      ok: true;
      status: "SENT";
      logId: string;
      httpStatus: number;
      wechatErrcode: 0;
      wechatErrmsg: string;
    }
  | {
      ok: false;
      status: "SKIPPED";
      logId: string;
      reason: "MISSING_WEBHOOK_CONFIG";
    }
  | {
      ok: false;
      status: "FAILED";
      logId: string;
      reason: "NETWORK_ERROR" | "HTTP_ERROR" | "WECHAT_ERROR" | "INVALID_MESSAGE";
      httpStatus?: number;
      wechatErrcode?: number;
      wechatErrmsg?: string;
      errorMessage?: string;
    };

type LogStatus = "SENT" | "SKIPPED" | "FAILED";
type FailureReason =
  | "MISSING_WEBHOOK_CONFIG"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "WECHAT_ERROR"
  | "INVALID_MESSAGE";

const MAX_MESSAGE_LENGTH = 3800;
const MAX_PREVIEW_LENGTH = 220;
const MAX_RESPONSE_SNIPPET_LENGTH = 500;

function compactLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function readWebhookUrl() {
  const value = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL?.trim();
  return value && value.length > 0 ? value : null;
}

function sanitizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return truncateText(error.message.trim(), 240);
  }

  return "Unknown network error";
}

function buildWechatPayload(message: EnterpriseWechatMessage) {
  if (message.type === "text") {
    return {
      msgtype: "text",
      text: { content: message.content },
    };
  }

  return {
    msgtype: "markdown",
    markdown: { content: message.content },
  };
}

async function writeSendLog(input: {
  teamId?: string;
  purpose: EnterpriseWechatSendPurpose;
  targetType?: string;
  targetId?: string;
  message: EnterpriseWechatMessage;
  status: LogStatus;
  failureReason?: FailureReason;
  httpStatus?: number;
  wechatErrcode?: number;
  wechatErrmsg?: string;
  errorMessage?: string;
  responseBodySnippet?: string;
}) {
  return prisma.enterpriseWechatSendLog.create({
    data: {
      teamId: input.teamId,
      purpose: input.purpose,
      targetType: input.targetType,
      targetId: input.targetId,
      messageType: input.message.type,
      messagePreview: truncateText(input.message.content, MAX_PREVIEW_LENGTH),
      status: input.status,
      failureReason: input.failureReason,
      httpStatus: input.httpStatus,
      wechatErrcode: input.wechatErrcode,
      wechatErrmsg: input.wechatErrmsg,
      errorMessage: input.errorMessage,
      responseBodySnippet:
        input.responseBodySnippet === undefined
          ? undefined
          : truncateText(input.responseBodySnippet, MAX_RESPONSE_SNIPPET_LENGTH),
    },
  });
}

async function parseWechatJson(response: Response) {
  const bodyText = await response.text();

  try {
    const parsed = JSON.parse(bodyText) as { errcode?: unknown; errmsg?: unknown };
    return {
      bodyText,
      errcode: typeof parsed.errcode === "number" ? parsed.errcode : undefined,
      errmsg: typeof parsed.errmsg === "string" ? parsed.errmsg : undefined,
    };
  } catch {
    return {
      bodyText,
      errcode: undefined,
      errmsg: undefined,
    };
  }
}

export function formatEnterpriseWechatText(input: {
  title: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  const content = compactLines([
    `【${input.title.trim()}】`,
    ...input.lines,
    input.footer ?? "",
  ]).join("\n");

  return {
    type: "text",
    content: truncateText(content, MAX_MESSAGE_LENGTH),
  };
}

export function formatEnterpriseWechatMarkdown(input: {
  title: string;
  quote?: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  const bodyLines = compactLines(input.lines).map((line) => `- ${line}`);
  const parts = compactLines([
    `**${input.title.trim()}**`,
    input.quote ? `> ${input.quote.trim()}` : "",
    ...bodyLines,
    input.footer ?? "",
  ]);

  return {
    type: "markdown",
    content: truncateText(parts.join("\n"), MAX_MESSAGE_LENGTH),
  };
}

export async function sendEnterpriseWechatMessage(
  input: EnterpriseWechatSendInput,
): Promise<EnterpriseWechatSendResult> {
  const trimmedContent = input.message.content.trim();
  const normalizedMessage: EnterpriseWechatMessage = {
    type: input.message.type,
    content: truncateText(trimmedContent, MAX_MESSAGE_LENGTH),
  };

  if (!trimmedContent) {
    const log = await writeSendLog({
      ...input,
      message: normalizedMessage,
      status: "FAILED",
      failureReason: "INVALID_MESSAGE",
      errorMessage: "Enterprise WeChat message content is empty",
    });

    return {
      ok: false,
      status: "FAILED",
      logId: log.id,
      reason: "INVALID_MESSAGE",
      errorMessage: "Enterprise WeChat message content is empty",
    };
  }

  const webhookUrl = readWebhookUrl();

  if (!webhookUrl) {
    const log = await writeSendLog({
      ...input,
      message: normalizedMessage,
      status: "SKIPPED",
      failureReason: "MISSING_WEBHOOK_CONFIG",
    });

    return {
      ok: false,
      status: "SKIPPED",
      logId: log.id,
      reason: "MISSING_WEBHOOK_CONFIG",
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildWechatPayload(normalizedMessage)),
    });
    const parsed = await parseWechatJson(response);

    if (!response.ok) {
      const log = await writeSendLog({
        ...input,
        message: normalizedMessage,
        status: "FAILED",
        failureReason: "HTTP_ERROR",
        httpStatus: response.status,
        responseBodySnippet: parsed.bodyText,
      });

      return {
        ok: false,
        status: "FAILED",
        logId: log.id,
        reason: "HTTP_ERROR",
        httpStatus: response.status,
      };
    }

    if (parsed.errcode !== 0) {
      const log = await writeSendLog({
        ...input,
        message: normalizedMessage,
        status: "FAILED",
        failureReason: "WECHAT_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.errcode,
        wechatErrmsg: parsed.errmsg,
        responseBodySnippet: parsed.bodyText,
      });

      return {
        ok: false,
        status: "FAILED",
        logId: log.id,
        reason: "WECHAT_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.errcode,
        wechatErrmsg: parsed.errmsg,
      };
    }

    const log = await writeSendLog({
      ...input,
      message: normalizedMessage,
      status: "SENT",
      httpStatus: response.status,
      wechatErrcode: 0,
      wechatErrmsg: parsed.errmsg ?? "ok",
      responseBodySnippet: parsed.bodyText,
    });

    return {
      ok: true,
      status: "SENT",
      logId: log.id,
      httpStatus: response.status,
      wechatErrcode: 0,
      wechatErrmsg: parsed.errmsg ?? "ok",
    };
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(error);
    const log = await writeSendLog({
      ...input,
      message: normalizedMessage,
      status: "FAILED",
      failureReason: "NETWORK_ERROR",
      errorMessage,
    });

    return {
      ok: false,
      status: "FAILED",
      logId: log.id,
      reason: "NETWORK_ERROR",
      errorMessage,
    };
  }
}
```

- [ ] **Step 2: Run sender tests**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts
```

Expected: PASS.

---

### Task 4: Add Admin Test API

**Files:**
- Create: `app/api/admin/integrations/enterprise-wechat/test/route.ts`
- Create: `__tests__/enterprise-wechat-admin-api.test.ts`

- [ ] **Step 1: Write admin API tests**

Create `__tests__/enterprise-wechat-admin-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/integrations/enterprise-wechat/test/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

const originalWebhook = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;

function request(userId: string | null, body?: unknown) {
  const headers: Record<string, string> = {};

  if (userId) {
    headers.Cookie = `userId=${createCookieValue(userId)}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest("http://localhost/api/admin/integrations/enterprise-wechat/test", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function response(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enterprise wechat admin test api", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalWebhook === undefined) {
      delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    } else {
      process.env.ENTERPRISE_WECHAT_WEBHOOK_URL = originalWebhook;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const result = await POST(request(null, { message: "test" }));
    expect(result.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const result = await POST(request(memberId, { message: "test" }));
    expect(result.status).toBe(403);
  });

  it("returns 400 for malformed json", async () => {
    const result = await POST(
      new NextRequest("http://localhost/api/admin/integrations/enterprise-wechat/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${createCookieValue(adminId)}`,
        },
        body: "{bad-json",
      }),
    );

    expect(result.status).toBe(400);
  });

  it("returns skipped result when webhook is missing", async () => {
    const result = await POST(request(adminId, { message: "配置检查" }));

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.result).toMatchObject({
      ok: false,
      status: "SKIPPED",
      reason: "MISSING_WEBHOOK_CONFIG",
    });
  });

  it("sends a configured test message as admin", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ errcode: 0, errmsg: "ok" })));

    const result = await POST(request(adminId, { message: "牛马补给站 webhook 测试" }));

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.result).toMatchObject({
      ok: true,
      status: "SENT",
    });
    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: body.result.logId },
    });
    expect(log).toMatchObject({
      teamId,
      purpose: "MANUAL_TEST",
      status: "SENT",
    });
  });
});
```

- [ ] **Step 2: Create route**

Create `app/api/admin/integrations/enterprise-wechat/test/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  formatEnterpriseWechatText,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

async function readBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return null;
    }

    return body as { message?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await readBody(request);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await sendEnterpriseWechatMessage({
    teamId: user.teamId,
    purpose: "MANUAL_TEST",
    targetType: "AdminUser",
    targetId: user.id,
    message: formatEnterpriseWechatText({
      title: "牛马补给站 webhook 测试",
      lines: [message],
      footer: "如果你看到这条消息，说明机器人还活着。",
    }),
  });

  return NextResponse.json({ result });
}
```

- [ ] **Step 3: Run admin API tests**

Run:

```bash
npm test -- __tests__/enterprise-wechat-admin-api.test.ts
```

Expected: PASS.

---

### Task 5: Document Environment Variable

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create env example**

Create `.env.example`:

```dotenv
# Optional. Server-only Enterprise WeChat group robot webhook.
# Do not use NEXT_PUBLIC_ for this value.
ENTERPRISE_WECHAT_WEBHOOK_URL=
```

- [ ] **Step 2: Run a grep check for accidental public config**

Run:

```bash
rg -n "NEXT_PUBLIC_.*WECHAT|WEBHOOK_URL=.*key=" .env.example app lib __tests__
```

Expected: no output.

---

### Task 6: Verification and Commit

**Files:**
- All GM-11 files.

- [ ] **Step 1: Run sender tests**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run admin API tests**

Run:

```bash
npm test -- __tests__/enterprise-wechat-admin-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run existing admin season tests**

Run:

```bash
npm test -- __tests__/admin-seasons-api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit GM-11**

```bash
git add prisma/schema.prisma lib/generated/prisma lib/integrations/enterprise-wechat.ts app/api/admin/integrations/enterprise-wechat/test/route.ts __tests__/enterprise-wechat-sender.test.ts __tests__/enterprise-wechat-admin-api.test.ts .env.example
git commit -m "feat: add enterprise wechat sender"
```

## Self-Review Checklist

- Sender supports text and markdown payloads.
- Sender reads only `ENTERPRISE_WECHAT_WEBHOOK_URL`.
- Missing config returns `SKIPPED`.
- Empty content returns `FAILED / INVALID_MESSAGE`.
- Network, HTTP, and Enterprise WeChat response failures return structured `FAILED` results.
- Every send attempt creates an `EnterpriseWechatSendLog`.
- Logs do not store webhook URL or webhook key.
- Admin test route requires authentication and `ADMIN` role.
- GM-11 does not create weak social invitations.
- GM-11 does not generate weekly reports.
- GM-11 does not add visible UI.
