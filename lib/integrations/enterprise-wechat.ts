import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

const MAX_CONTENT_PREVIEW_LENGTH = 280;
const MAX_MESSAGE_LENGTH = 3800;
const MAX_RESPONSE_SNIPPET_LENGTH = 500;

export type EnterpriseWechatMessage =
  | { type: "text"; content: string }
  | { type: "markdown"; content: string };

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

export type EnterpriseWechatSendPurpose =
  | "MANUAL_TEST"
  | "WEAK_SOCIAL_INVITATION"
  | "WEEKLY_REPORT"
  | "TEAM_BROADCAST"
  | "TEAM_MILESTONE";

function compactLines(lines: Array<string | undefined>): string[] {
  return lines
    .map((line) => line?.trim() ?? "")
    .filter((line) => line.length > 0);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeMessageContent(content: string): string {
  return truncate(content.trim(), MAX_MESSAGE_LENGTH);
}

function resolveWebhookUrl(override?: string): string {
  return override?.trim() || process.env.ENTERPRISE_WECHAT_WEBHOOK_URL?.trim() || "";
}

function buildPayload(message: EnterpriseWechatMessage) {
  if (message.type === "text") {
    return {
      msgtype: "text",
      text: {
        content: message.content,
      },
    };
  }

  return {
    msgtype: "markdown",
    markdown: {
      content: message.content,
    },
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createSendLog(data: {
  teamId?: string;
  purpose: string;
  messageType: EnterpriseWechatMessage["type"];
  status: string;
  targetType?: string;
  targetId?: string;
  contentPreview: string;
  failureReason?: string;
  errorMessage?: string;
  httpStatus?: number;
  wechatErrcode?: number;
  wechatErrmsg?: string;
  responseBodySnippet?: string;
}) {
  return prisma.enterpriseWechatSendLog.create({
    data: {
      teamId: data.teamId ?? null,
      purpose: data.purpose,
      messageType: data.messageType,
      status: data.status,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      contentPreview: data.contentPreview,
      failureReason: data.failureReason ?? null,
      errorMessage: data.errorMessage ?? null,
      httpStatus: data.httpStatus ?? null,
      wechatErrcode: data.wechatErrcode ?? null,
      wechatErrmsg: data.wechatErrmsg ?? null,
      responseBodySnippet: data.responseBodySnippet ?? null,
    },
  });
}

function parseWechatResponseSnippet(bodyText: string): {
  wechatErrcode?: number;
  wechatErrmsg?: string;
} {
  try {
    const payload = JSON.parse(bodyText) as { errcode?: unknown; errmsg?: unknown };
    return {
      wechatErrcode: typeof payload.errcode === "number" ? payload.errcode : undefined,
      wechatErrmsg: typeof payload.errmsg === "string" ? payload.errmsg : undefined,
    };
  } catch {
    return {};
  }
}

function sanitizeExternalText(value: string | undefined, webhookUrl: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const withoutWebhook = webhookUrl ? value.split(webhookUrl).join("[redacted-webhook]") : value;
  return withoutWebhook.replace(/key=[^&\s"]+/g, "key=[redacted]");
}

function formatMarkdownLine(line: string) {
  if (line.startsWith("- ") || line.startsWith("> ")) {
    return line;
  }

  return `- ${line}`;
}

export function formatEnterpriseWechatText(input: {
  title: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  return {
    type: "text",
    content: truncate(
      compactLines([`【${input.title.trim()}】`, ...input.lines, input.footer]).join("\n"),
      MAX_MESSAGE_LENGTH,
    ),
  };
}

export function formatEnterpriseWechatMarkdown(input: {
  title: string;
  quote?: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  const lines = compactLines(input.lines).map(formatMarkdownLine);

  return {
    type: "markdown",
    content: truncate(
      compactLines([
        `**${input.title.trim()}**`,
        input.quote ? `> ${input.quote.trim()}` : undefined,
        ...lines,
        input.footer,
      ]).join("\n"),
      MAX_MESSAGE_LENGTH,
    ),
  };
}

export async function recordEnterpriseWechatPushEvent(input: {
  teamId: string;
  purpose: EnterpriseWechatSendPurpose;
  eventKey: string;
  targetType?: string;
  targetId?: string;
  payloadJson?: string;
}) {
  try {
    const event = await prisma.enterpriseWechatPushEvent.create({
      data: {
        teamId: input.teamId,
        purpose: input.purpose,
        eventKey: input.eventKey,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        payloadJson: input.payloadJson ?? null,
      },
    });

    return { created: true, event };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const event = await prisma.enterpriseWechatPushEvent.findUniqueOrThrow({
      where: { eventKey: input.eventKey },
    });

    return { created: false, event };
  }
}

export async function sendEnterpriseWechatMessage(input: {
  teamId?: string;
  purpose: EnterpriseWechatSendPurpose;
  targetType?: string;
  targetId?: string;
  webhookUrl?: string;
  fetchImpl?: FetchImpl;
  message: EnterpriseWechatMessage;
}): Promise<EnterpriseWechatSendResult> {
  const content = normalizeMessageContent(input.message.content);
  const contentPreview = truncate(content, MAX_CONTENT_PREVIEW_LENGTH);

  if (!content) {
    const log = await createSendLog({
      teamId: input.teamId,
      purpose: input.purpose,
      messageType: input.message.type,
      status: "FAILED",
      targetType: input.targetType,
      targetId: input.targetId,
      contentPreview,
      failureReason: "INVALID_MESSAGE",
      errorMessage: "Message content must not be empty.",
    });

    return {
      ok: false,
      status: "FAILED",
      logId: log.id,
      reason: "INVALID_MESSAGE",
      errorMessage: "Message content must not be empty.",
    };
  }

  const webhookUrl = resolveWebhookUrl(input.webhookUrl);
  if (!webhookUrl) {
    const log = await createSendLog({
      teamId: input.teamId,
      purpose: input.purpose,
      messageType: input.message.type,
      status: "SKIPPED",
      targetType: input.targetType,
      targetId: input.targetId,
      contentPreview,
      failureReason: "MISSING_WEBHOOK_CONFIG",
    });

    return {
      ok: false,
      status: "SKIPPED",
      logId: log.id,
      reason: "MISSING_WEBHOOK_CONFIG",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload({ ...input.message, content })),
    });
    const responseBody = await response.text();
    const responseBodySnippet = truncate(
      sanitizeExternalText(responseBody, webhookUrl) ?? "",
      MAX_RESPONSE_SNIPPET_LENGTH,
    );
    const parsed = parseWechatResponseSnippet(responseBody);

    if (!response.ok) {
      const log = await createSendLog({
        teamId: input.teamId,
        purpose: input.purpose,
        messageType: input.message.type,
        status: "FAILED",
        targetType: input.targetType,
        targetId: input.targetId,
        contentPreview,
        failureReason: "HTTP_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.wechatErrcode,
        wechatErrmsg: parsed.wechatErrmsg,
        responseBodySnippet,
      });

      return {
        ok: false,
        status: "FAILED",
        logId: log.id,
        reason: "HTTP_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.wechatErrcode,
        wechatErrmsg: parsed.wechatErrmsg,
      };
    }

    if (parsed.wechatErrcode !== 0) {
      const log = await createSendLog({
        teamId: input.teamId,
        purpose: input.purpose,
        messageType: input.message.type,
        status: "FAILED",
        targetType: input.targetType,
        targetId: input.targetId,
        contentPreview,
        failureReason: "WECHAT_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.wechatErrcode,
        wechatErrmsg: parsed.wechatErrmsg,
        responseBodySnippet,
      });

      return {
        ok: false,
        status: "FAILED",
        logId: log.id,
        reason: "WECHAT_ERROR",
        httpStatus: response.status,
        wechatErrcode: parsed.wechatErrcode,
        wechatErrmsg: parsed.wechatErrmsg,
      };
    }

    const log = await createSendLog({
      teamId: input.teamId,
      purpose: input.purpose,
      messageType: input.message.type,
      status: "SENT",
      targetType: input.targetType,
      targetId: input.targetId,
      contentPreview,
      httpStatus: response.status,
      wechatErrcode: 0,
      wechatErrmsg: parsed.wechatErrmsg ?? "ok",
      responseBodySnippet,
    });

    return {
      ok: true,
      status: "SENT",
      logId: log.id,
      httpStatus: response.status,
      wechatErrcode: 0,
      wechatErrmsg: parsed.wechatErrmsg ?? "ok",
    };
  } catch (error) {
    const errorMessage =
      sanitizeExternalText(
        error instanceof Error ? error.message : "Unknown network error",
        webhookUrl,
      ) ?? "Unknown network error";
    const log = await createSendLog({
      teamId: input.teamId,
      purpose: input.purpose,
      messageType: input.message.type,
      status: "FAILED",
      targetType: input.targetType,
      targetId: input.targetId,
      contentPreview,
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
