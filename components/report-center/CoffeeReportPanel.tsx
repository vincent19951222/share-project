"use client";

import { AssetIcon } from "@/components/ui/AssetIcon";
import type { CoffeeReportData } from "./report-data";

interface CoffeeReportPanelProps {
  coffee: CoffeeReportData;
  loading: boolean;
  error: string | null;
}

const cupAssetPath = "/assets/report-center/coffee-cup-label.png";
const receiptAssetPath = "/assets/report-center/coffee-receipt.png";
const receiptLinePositions = ["41.7%", "49.7%", "57.8%", "66.2%"] as const;

function getCoffeeBarHeight(cups: number, maxCups: number) {
  if (cups <= 0) {
    return "0%";
  }

  return `${Math.max(12, (cups / maxCups) * 100)}%`;
}

function CoffeeBars({ days }: { days: CoffeeReportData["recentDays"] }) {
  const maxCups = Math.max(1, ...days.map((day) => day.cups));

  return (
    <div className="coffee-report-bars mt-4 rounded-2xl border-[3px] border-slate-900 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
          Caffeine Wave
        </div>
        <div className="text-xs font-black text-amber-800">近 7 天咖啡因波形</div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-2">
        {days.length > 0 ? (
          days.map((day) => (
            <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end rounded-full bg-orange-50 px-1">
                <div
                  className={`w-full rounded-full ${
                    day.cups > 0
                      ? "border-2 border-slate-900 bg-orange-300 shadow-[0_2px_0_0_rgba(63,42,29,0.45)]"
                      : ""
                  }`}
                  style={{ height: getCoffeeBarHeight(day.cups, maxCups) }}
                  title={`${day.day} 日 ${day.cups} 杯`}
                />
              </div>
              <span className="text-xs font-black text-amber-800">{day.day}</span>
            </div>
          ))
        ) : (
          <div className="grid h-full w-full place-items-center rounded-2xl bg-orange-50 text-sm font-black text-amber-800">
            等咖啡数据冒泡
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <div
      className="absolute left-[24%] grid h-[5.9%] w-[57%] grid-cols-[minmax(0,1fr)_31%] items-center gap-2 px-[2%] font-black"
      style={{ top: receiptLinePositions[index] }}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,4.6cqw,11px)] leading-none text-amber-800">
        {label}
      </span>
      <strong className="whitespace-nowrap text-center text-[clamp(9px,5.3cqw,13px)] leading-none text-amber-950">
        {value}
      </strong>
    </div>
  );
}

function CoffeeReceiptScene({
  coffee,
  loading,
  error,
}: CoffeeReportPanelProps) {
  const weekKing = coffee.weekKing
    ? `${coffee.weekKing.name} · ${coffee.weekKing.cups} 杯`
    : "本周暂无";
  const roast = error ? "咖啡机短暂离线。" : coffee.roast;
  const todayTotal = loading ? "萃取中" : `${coffee.todayTotalCups} 杯`;
  const todayDrinkers = loading ? "萃取中" : `${coffee.todayDrinkers}/${coffee.memberCount}`;
  const monthTotal = loading ? "萃取中" : `${coffee.monthTotalCups} 杯`;
  const todayStatus = error ? "离线" : loading ? "萃取中" : coffee.todayTotalCups > 0 ? "Relax" : "待开机";
  const receiptLines = [
    { label: "今日全队", value: todayTotal },
    { label: "续命人数", value: todayDrinkers },
    { label: "本月累计", value: monthTotal },
    { label: "今日状态", value: todayStatus },
  ];
  const receiptSummary = receiptLines.map((line) => `${line.label} ${line.value}`).join("，");

  return (
    <div className="coffee-report-scene relative z-10 mt-2 flex min-h-0 flex-1 items-center justify-center gap-1 py-1 sm:gap-3 xl:gap-2">
      <div className="relative grid min-w-0 flex-[0_1_56%] place-items-center">
        <div className="relative aspect-[2/3] w-full max-w-[292px]">
          <div className="pointer-events-none absolute left-1/2 top-[5%] h-14 w-28 -translate-x-1/2" aria-hidden="true">
            <span className="absolute bottom-0 left-5 h-10 w-2.5 rounded-full bg-white/70 blur-md" />
            <span className="absolute bottom-0 left-12 h-14 w-2.5 rounded-full bg-white/70 blur-md" />
            <span className="absolute bottom-0 right-5 h-10 w-2.5 rounded-full bg-white/70 blur-md" />
          </div>
          <img
            src={cupAssetPath}
            alt="像素风外带咖啡杯"
            className="h-full w-full object-contain [image-rendering:pixelated] drop-shadow-[0_18px_20px_rgba(94,53,19,0.18)]"
          />
          <div className="pointer-events-none absolute left-[25%] top-[47.5%] flex min-h-[18%] w-1/2 -rotate-[0.4deg] flex-col justify-center gap-1 px-[4%] text-left text-[#3f250c]">
            <div className="text-[clamp(9px,0.65vw,12px)] font-black uppercase leading-none tracking-[0.12em] text-amber-700">
              Daily Roast
            </div>
            <div className="text-[clamp(16px,1.35vw,22px)] font-black leading-tight text-amber-950">
              本周咖啡王
            </div>
            <div className="border-t-2 border-amber-900/25 pt-1 text-[clamp(10px,0.75vw,12px)] font-black leading-snug text-amber-800">
              {weekKing}
            </div>
          </div>
        </div>
      </div>

      <div className="relative min-w-0 flex-[0_1_44%] rotate-[2.2deg] translate-y-2">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[238px] [container-type:inline-size]">
          <img
            src={receiptAssetPath}
            alt="咖啡统计小票"
            className="h-full w-full object-contain [image-rendering:pixelated] drop-shadow-[0_14px_14px_rgba(94,53,19,0.14)]"
          />
          <div className="pointer-events-none absolute inset-0 text-[#3f250c]" aria-label="咖啡统计小票内容">
            <div className="sr-only">{receiptSummary}</div>
            <div className="absolute left-[24.5%] top-[27.2%] flex h-[10.4%] w-[55%] flex-col justify-center px-[3%]">
              <strong className="text-[clamp(11px,6.5cqw,16px)] font-black leading-tight text-amber-950">
                {roast}
              </strong>
            </div>
            {receiptLines.map((line, index) => (
              <ReceiptLine key={line.label} label={line.label} value={line.value} index={index} />
            ))}
            <div className="absolute left-[24.4%] top-[78.2%] grid h-[6.4%] w-[49%] grid-cols-2 items-center text-center text-[clamp(7px,4cqw,10px)] font-black text-lime-800">
              <span>{coffee.recentDays.at(-1)?.day ?? "今日"} 日</span>
              <span>{error ? "待恢复" : "已入账"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoffeeReportPanel({
  coffee,
  loading,
  error,
}: CoffeeReportPanelProps) {
  return (
    <aside className="coffee-report-panel relative flex min-h-[620px] flex-col overflow-hidden rounded-[1.45rem] border-[6px] border-orange-100 bg-[radial-gradient(circle_at_50%_12%,rgba(255,248,214,0.95),transparent_34%),linear-gradient(180deg,#fff8ea,#ffedd5)] p-5 shadow-sm xl:col-span-1 xl:min-h-0">
      <div className="pointer-events-none absolute inset-x-4 top-16 h-28 rounded-full bg-white/50 blur-2xl" aria-hidden="true" />
      <div className="coffee-report-heading flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="report-chip bg-white text-amber-900">团队咖啡打卡</div>
          <h2 className="coffee-report-title mt-3 text-2xl font-black leading-tight text-amber-950">
            咖啡能量站
          </h2>
        </div>
        <div className="coffee-report-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] border-slate-900 bg-yellow-200 shadow-[0_4px_0_0_#1f2937]">
          <AssetIcon name="coffee" className="h-8 w-8 object-contain" />
        </div>
      </div>

      <CoffeeReceiptScene coffee={coffee} loading={loading} error={error} />

      <CoffeeBars days={coffee.recentDays} />
    </aside>
  );
}
