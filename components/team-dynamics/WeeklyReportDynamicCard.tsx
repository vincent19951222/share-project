import { getTeamDynamicMeta, type TeamDynamicListItem } from "@/lib/team-dynamics";

interface WeeklyReportMetricValue {
  totalPunches?: number;
  fullAttendanceDays?: number;
  seasonProgress?: {
    filledSlots?: number;
    targetSlots?: number;
  };
}

interface WeeklyReportPayloadSnapshot {
  weekStartDayKey?: string;
  weekEndDayKey?: string;
  summary?: string;
  metrics?: WeeklyReportMetricValue;
}

function formatOccurredAt(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeekRange(startDayKey?: string, endDayKey?: string) {
  if (!startDayKey || !endDayKey) {
    return null;
  }

  return `${startDayKey.slice(5).replace("-", ".")} - ${endDayKey.slice(5).replace("-", ".")}`;
}

function getWeeklyReportSnapshot(payload: Record<string, unknown>): WeeklyReportPayloadSnapshot {
  return payload as WeeklyReportPayloadSnapshot;
}

export function WeeklyReportDynamicCard({
  item,
  mode,
  onOpen,
}: {
  item: TeamDynamicListItem;
  mode: "panel" | "page";
  onOpen?: (id: string) => void | Promise<void>;
}) {
  const meta = getTeamDynamicMeta(item.type);
  const snapshot = getWeeklyReportSnapshot(item.payload);
  const weekRange = formatWeekRange(snapshot.weekStartDayKey, snapshot.weekEndDayKey);
  const summary = snapshot.summary ?? item.summary;
  const stats = [
    {
      label: "打卡",
      value:
        typeof snapshot.metrics?.totalPunches === "number"
          ? `${snapshot.metrics.totalPunches} 次打卡`
          : null,
    },
    {
      label: "全勤",
      value:
        typeof snapshot.metrics?.fullAttendanceDays === "number"
          ? `${snapshot.metrics.fullAttendanceDays} 天全勤`
          : null,
    },
    {
      label: "赛季",
      value:
        typeof snapshot.metrics?.seasonProgress?.filledSlots === "number" &&
        typeof snapshot.metrics?.seasonProgress?.targetSlots === "number"
          ? `${snapshot.metrics.seasonProgress.filledSlots}/${snapshot.metrics.seasonProgress.targetSlots}`
          : null,
    },
  ].filter((stat): stat is { label: string; value: string } => stat.value !== null);

  return (
    <button
      type="button"
      className={`team-dynamic-card text-left ${
        item.isRead ? "team-dynamic-card-read" : "team-dynamic-card-unread"
      }`}
      onClick={() => void onOpen?.(item.id)}
      disabled={!onOpen}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`team-dynamic-pill team-dynamic-pill-${meta.tone}`}>{meta.label}</span>
        <span className="text-[11px] font-bold text-sub">{formatOccurredAt(item.occurredAt)}</span>
        {weekRange ? (
          <span className="rounded-full border-2 border-slate-200 bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">
            {weekRange}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 text-sm font-black text-main">{item.title}</h3>
      <p className="mt-1 text-sm font-bold text-slate-700">{summary}</p>

      {stats.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${mode === "page" ? "grid-cols-3" : "grid-cols-2"}`}>
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border-2 border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-black tracking-[0.18em] text-sub">{stat.label}</p>
              <p className="mt-1 text-sm font-black text-main">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </button>
  );
}
