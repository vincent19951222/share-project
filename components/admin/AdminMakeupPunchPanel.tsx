"use client";

import { useMemo, useState, type FormEvent } from "react";

export interface AdminMakeupPunchMember {
  id: string;
  name: string;
}

interface AdminMakeupPunchPanelProps {
  members: AdminMakeupPunchMember[];
  defaultDayKey?: string;
}

type FormState = {
  targetUserId: string;
  dayKey: string;
};

function getShanghaiDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDefaultMakeupDayKey() {
  return getShanghaiDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

function mapAdminMakeupError(error: string | null): string {
  if (error === "duplicate-punch") {
    return "这一天已经有打卡记录了";
  }

  if (error === "makeup-not-allowed") {
    return "只能补当前月份里今天之前的漏卡日期";
  }

  if (error === "target-user-not-found") {
    return "这个队员不在当前团队里";
  }

  if (error === "Unauthorized") {
    return "登录状态过期了，请重新登录";
  }

  if (error === "Forbidden") {
    return "只有管理员可以全局补卡";
  }

  if (error === "Invalid request body") {
    return "补卡信息不完整，请检查队员和日期";
  }

  return error || "补卡没成功，请稍后再试";
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    const error = typeof data.error === "string" ? data.error.trim() : null;
    return mapAdminMakeupError(error);
  } catch {
    return "补卡没成功，请稍后再试";
  }
}

export function AdminMakeupPunchPanel({
  members,
  defaultDayKey,
}: AdminMakeupPunchPanelProps) {
  const initialDayKey = defaultDayKey ?? getDefaultMakeupDayKey();
  const [form, setForm] = useState<FormState>({
    targetUserId: members[0]?.id ?? "",
    dayKey: initialDayKey,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedMember = useMemo(
    () => members.find((member) => member.id === form.targetUserId) ?? null,
    [form.targetUserId, members],
  );
  const currentMonthKey = initialDayKey.slice(0, 7);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.targetUserId || !form.dayKey) {
      setError("补卡信息不完整，请检查队员和日期");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/board/makeup-punch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: form.targetUserId,
          dayKey: form.dayKey,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const targetName = selectedMember?.name ?? "队员";
      setMessage(`已给 ${targetName} 补卡，固定 +10 银子。`);
      window.dispatchEvent(new Event("activity-events:refresh"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "补卡没成功，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800">全局补卡</h1>
        <p className="text-sm text-sub">
          管理员可以给任意队员补本月漏卡，固定补发 10 银子。
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          队员
          <select
            name="targetUserId"
            value={form.targetUserId}
            onChange={(event) =>
              setForm((current) => ({ ...current, targetUserId: event.target.value }))
            }
            disabled={isSubmitting || members.length === 0}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          补卡日期
          <input
            name="dayKey"
            type="date"
            min={`${currentMonthKey}-01`}
            max={initialDayKey}
            value={form.dayKey}
            onChange={(event) =>
              setForm((current) => ({ ...current, dayKey: event.target.value }))
            }
            disabled={isSubmitting || members.length === 0}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || members.length === 0}
          className="rounded-xl border-2 border-slate-800 bg-yellow-300 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "补卡中..." : "确认补卡"}
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
