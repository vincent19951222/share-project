import type { TeamDynamic } from "@/lib/generated/prisma/client";

type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

type WeeklyReportDynamic = Pick<TeamDynamic, "title" | "summary" | "payloadJson">;

export type WeWorkPushResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing-webhook" | "already-published" }
  | { status: "failed"; reason: string };

const MAX_MARKDOWN_LENGTH = 3800;

function resolveWebhookUrl(webhookUrl?: string): string {
  return (
    webhookUrl?.trim() ||
    process.env.WEWORK_WEBHOOK_URL?.trim() ||
    process.env.WEWORK_WEEKLY_REPORT_WEBHOOK_URL?.trim() ||
    ""
  );
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getFirstHighlightValue(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = asRecord(value[0]);
  return first ? getString(first.value) : null;
}

function clampMarkdown(content: string): string {
  if (content.length <= MAX_MARKDOWN_LENGTH) {
    return content;
  }

  return `${content.slice(0, MAX_MARKDOWN_LENGTH - 12)}\n...`;
}

export function buildWeeklyReportWeWorkMarkdown(dynamic: WeeklyReportDynamic): string {
  const payload = parsePayload(dynamic.payloadJson);
  const metrics = asRecord(payload.metrics);
  const highlights = asRecord(payload.highlights);
  const seasonProgress = metrics ? asRecord(metrics.seasonProgress) : null;

  const weekStartDayKey = getString(payload.weekStartDayKey);
  const weekEndDayKey = getString(payload.weekEndDayKey);
  const totalPunches = metrics ? getNumber(metrics.totalPunches) : null;
  const fullAttendanceDays = metrics ? getNumber(metrics.fullAttendanceDays) : null;
  const topMember = highlights ? getFirstHighlightValue(highlights.topMembers) : null;
  const coffee = highlights ? asRecord(highlights.coffee) : null;
  const coffeeValue = coffee ? getString(coffee.value) : null;
  const filledSlots = seasonProgress ? getNumber(seasonProgress.filledSlots) : null;
  const targetSlots = seasonProgress ? getNumber(seasonProgress.targetSlots) : null;

  const lines = [
    `**${dynamic.title}**`,
    weekStartDayKey && weekEndDayKey ? `> 统计区间：${weekStartDayKey} 至 ${weekEndDayKey}` : null,
    `> 概览：${dynamic.summary}`,
    totalPunches !== null ? `> 打卡：${totalPunches} 次` : null,
    fullAttendanceDays !== null ? `> 全勤：${fullAttendanceDays} 天` : null,
    filledSlots !== null && targetSlots !== null ? `> 赛季进度：${filledSlots}/${targetSlots}` : null,
    topMember ? `> 高光：${topMember}` : null,
    coffeeValue ? `> 咖啡：${coffeeValue}` : null,
  ].filter((line): line is string => Boolean(line));

  return clampMarkdown(lines.join("\n"));
}

async function readWeWorkError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { errcode?: unknown; errmsg?: unknown };
    const errcode = typeof payload.errcode === "number" ? payload.errcode : null;
    const errmsg = typeof payload.errmsg === "string" ? payload.errmsg : "unknown error";

    if (errcode === 0) {
      return "";
    }

    return `企业微信 webhook 返回错误：${errcode ?? response.status} ${errmsg}`;
  } catch {
    return `企业微信 webhook 返回 HTTP ${response.status}`;
  }
}

export async function pushWeeklyReportDynamicToWeWork(input: {
  dynamic: WeeklyReportDynamic;
  webhookUrl?: string;
  fetchImpl?: FetchImpl;
}): Promise<WeWorkPushResult> {
  const webhookUrl = resolveWebhookUrl(input.webhookUrl);

  if (!webhookUrl) {
    return { status: "skipped", reason: "missing-webhook" };
  }

  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content: buildWeeklyReportWeWorkMarkdown(input.dynamic),
        },
      }),
    });
    const error = await readWeWorkError(response);

    if (!response.ok || error) {
      return { status: "failed", reason: error || `企业微信 webhook 返回 HTTP ${response.status}` };
    }

    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "企业微信 webhook 推送失败",
    };
  }
}
