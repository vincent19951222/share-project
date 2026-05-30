"use client";

import { useState, type FormEvent } from "react";
import { dispatchTeamDynamicsRefresh } from "@/lib/team-dynamics-refresh";

interface AdminReleaseBenefitPanelProps {
  memberCount: number;
  defaultGrantKey?: string;
}

type FormState = {
  grantKey: string;
  message: string;
};

function getShanghaiDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDefaultGrantKey() {
  return `release-${getShanghaiDayKey(new Date())}`;
}

function mapReleaseBenefitError(error: string | null): string {
  if (error === "benefit-already-granted") {
    return "这个福利批次已经发过了，请换一个批次标识。";
  }

  if (error === "invalid-grant-key") {
    return "批次标识需要 3-80 个字符。";
  }

  if (error === "invalid-message") {
    return "通知文案不能超过 80 个字符。";
  }

  if (error === "Unauthorized") {
    return "登录状态过期了，请重新登录。";
  }

  if (error === "Forbidden") {
    return "只有管理员可以发放版本福利。";
  }

  if (error === "Invalid request body") {
    return "福利信息不完整，请检查批次标识。";
  }

  return error || "福利券没发出去，请稍后再试。";
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    const error = typeof data.error === "string" ? data.error.trim() : null;
    return mapReleaseBenefitError(error);
  } catch {
    return "福利券没发出去，请稍后再试。";
  }
}

export function AdminReleaseBenefitPanel({
  memberCount,
  defaultGrantKey,
}: AdminReleaseBenefitPanelProps) {
  const [form, setForm] = useState<FormState>({
    grantKey: defaultGrantKey ?? getDefaultGrantKey(),
    message: "大版本更新福利已到账，每人 20 张抽奖券。",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.grantKey.trim()) {
      setError("福利信息不完整，请检查批次标识。");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/gamification/release-benefit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantKey: form.grantKey.trim(),
          message: form.message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as {
        amount?: number;
        grantedCount?: number;
      };
      const amount = data.amount ?? 20;
      const grantedCount = data.grantedCount ?? memberCount;

      setMessage(`已给 ${grantedCount} 位队员发放 ${amount} 张抽奖券。`);
      dispatchTeamDynamicsRefresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "福利券没发出去，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800">版本福利</h1>
        <p className="text-sm text-sub">
          大更新后手动给当前团队全员发放福利券，固定每人 20 张抽奖券，并写入团队动态通知。
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4"
        onSubmit={handleSubmit}
      >
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-bold text-slate-700">
          本次会覆盖当前团队 {memberCount} 位队员。
        </div>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          福利批次
          <input
            name="grantKey"
            value={form.grantKey}
            onChange={(event) =>
              setForm((current) => ({ ...current, grantKey: event.target.value }))
            }
            disabled={isSubmitting}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          通知文案
          <textarea
            name="message"
            value={form.message}
            onChange={(event) =>
              setForm((current) => ({ ...current, message: event.target.value }))
            }
            disabled={isSubmitting}
            rows={2}
            className="resize-none rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || memberCount === 0}
          className="rounded-xl border-2 border-slate-800 bg-yellow-300 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "发放中..." : "发放福利券"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}
    </section>
  );
}
