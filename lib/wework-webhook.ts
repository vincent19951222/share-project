type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

export type WeWorkPushResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing-webhook" }
  | { status: "failed"; reason: string };

export const DAILY_WEWORK_REMINDER_CONTENT = "记得每日健身打卡和咖啡打卡";

function resolveWebhookUrl(override?: string): string {
  return (
    override?.trim() ||
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL?.trim() ||
    process.env.WEWORK_WEBHOOK_URL?.trim() ||
    ""
  );
}

async function readWeWorkError(response: Response): Promise<string | null> {
  const bodyText = await response.text();

  if (!bodyText) {
    return null;
  }

  try {
    const payload = JSON.parse(bodyText) as { errcode?: unknown; errmsg?: unknown };
    const errcode = typeof payload.errcode === "number" ? payload.errcode : null;
    const errmsg = typeof payload.errmsg === "string" ? payload.errmsg : "unknown error";

    return errcode && errcode !== 0 ? `企业微信 webhook 返回错误：${errcode} ${errmsg}` : null;
  } catch {
    return response.ok ? null : bodyText.slice(0, 120);
  }
}

export async function pushDailyReminderToWeWork(input: {
  webhookUrl?: string;
  fetchImpl?: FetchImpl;
} = {}): Promise<WeWorkPushResult> {
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
        msgtype: "text",
        text: {
          content: DAILY_WEWORK_REMINDER_CONTENT,
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
