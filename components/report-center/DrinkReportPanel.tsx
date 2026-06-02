"use client";

import { AssetIcon } from "@/components/ui/AssetIcon";
import type { DrinkReportData } from "./report-data";

interface DrinkReportPanelProps {
  drink: DrinkReportData;
  loading: boolean;
  error: string | null;
}

const cupAssetPath = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_cup_label.png";
const receiptAssetPath = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_receipt.png";

function getDrinkBarHeight(cups: number, maxCups: number) {
  if (cups <= 0) {
    return "0%";
  }

  return `${Math.max(12, (cups / maxCups) * 100)}%`;
}

function DrinkBars({ days }: { days: DrinkReportData["recentDays"] }) {
  const maxCups = Math.max(1, ...days.map((day) => day.cups));

  return (
    <div className="coffee-report-bars mt-4 rounded-2xl border-[3px] border-slate-900 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
          Hydration Wave
        </div>
        <div className="text-xs font-black text-cyan-800">近 7 天饮品流水</div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-2">
        {days.length > 0 ? (
          days.map((day) => (
            <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end rounded-full bg-cyan-50 px-1">
                <div
                  className={`w-full rounded-full ${
                    day.cups > 0
                      ? "border-2 border-slate-900 bg-cyan-300 shadow-[0_2px_0_0_rgba(8,47,73,0.35)]"
                      : ""
                  }`}
                  style={{ height: getDrinkBarHeight(day.cups, maxCups) }}
                  title={`${day.day} 日 ${day.cups} 杯`}
                />
              </div>
              <span className="text-xs font-black text-cyan-800">{day.day}</span>
            </div>
          ))
        ) : (
          <div className="grid h-full w-full place-items-center rounded-2xl bg-cyan-50 text-sm font-black text-cyan-800">
            等饮品数据冒泡
          </div>
        )}
      </div>
    </div>
  );
}

export function DrinkReportPanel({ drink, loading, error }: DrinkReportPanelProps) {
  const weekKing = drink.weekKing
    ? `${drink.weekKing.name} · ${drink.weekKing.cups} 杯`
    : "本周暂无";
  const roast = error ? "水铺短暂离线。" : drink.roast;
  const todayTotal = loading ? "记账中" : `${drink.todayTotalCups} 杯`;
  const todayDrinkers = loading ? "记账中" : `${drink.todayDrinkers}/${drink.memberCount}`;
  const monthTotal = loading ? "记账中" : `${drink.monthTotalCups} 杯`;
  const todayStatus = error ? "离线" : loading ? "记账中" : drink.todayTotalCups > 0 ? "Relax" : "待开张";
  const receiptLines = [
    { label: "今日全队", value: todayTotal },
    { label: "饮品人数", value: todayDrinkers },
    { label: "本月累计", value: monthTotal },
    { label: "今日状态", value: todayStatus },
  ];

  return (
    <aside className="coffee-report-panel coffee-report-inset-shell relative flex min-h-[560px] flex-col overflow-hidden rounded-[1.35rem] border-[4px] border-[#0891b2] bg-[radial-gradient(circle_at_50%_12%,rgba(236,254,255,0.95),transparent_30%),linear-gradient(180deg,#ecfeff,#cffafe)] p-4 shadow-[0_8px_0_0_rgba(8,145,178,0.18)] xl:min-h-0">
      <div className="pointer-events-none absolute inset-x-4 top-16 h-28 rounded-full bg-white/50 blur-2xl" aria-hidden="true" />
      <div className="coffee-report-heading coffee-report-appendix-head flex items-start justify-between gap-3 border-b-[3px] border-dashed border-cyan-700/35 pb-4">
        <div className="min-w-0">
          <div className="report-chip border-cyan-900/20 bg-white text-cyan-900">团队饮品打卡</div>
          <h2 className="coffee-report-title mt-3 text-[1.8rem] font-black leading-tight text-cyan-950">
            牛马水铺
          </h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-cyan-900/80">
            一页附录，专门记录最近几天的水铺流水和今日饮品情况。
          </p>
        </div>
        <div className="coffee-report-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] border-slate-900 bg-cyan-200 shadow-[0_4px_0_0_#1f2937]">
          <AssetIcon name="coffee" className="h-8 w-8 object-contain" />
        </div>
      </div>

      <div className="coffee-report-visual-center">
        <div className="coffee-report-scene relative z-10 mt-2 flex min-h-0 flex-1 items-center justify-center gap-1 py-1 sm:gap-3 xl:gap-2">
          <div className="relative grid min-w-0 flex-[0_1_56%] place-items-center">
            <div className="coffee-report-cup-artboard">
              <img
                src={cupAssetPath}
                alt="像素风水铺饮品杯"
                className="coffee-report-art-image coffee-report-cup-image"
              />
              <div className="coffee-report-cup-label-copy">
                <div className="coffee-report-cup-label-eyebrow">Daily Sip</div>
                <div className="coffee-report-cup-label-title">本周饮品王</div>
                <div className="coffee-report-cup-label-meta">{weekKing}</div>
              </div>
            </div>
          </div>

          <div className="relative min-w-0 flex-[0_1_44%] rotate-[2.2deg] translate-y-2">
            <div className="coffee-report-receipt-artboard">
              <img
                src={receiptAssetPath}
                alt="饮品统计小票"
                className="coffee-report-art-image coffee-report-receipt-image"
              />
              <div className="coffee-report-receipt-copy-layer" aria-label="饮品统计小票内容">
                <div className="sr-only">
                  {receiptLines.map((line) => `${line.label} ${line.value}`).join("，")}
                </div>
                <div className="absolute left-[24.5%] top-[27.2%] flex h-[10.4%] w-[55%] flex-col justify-center px-[3%]">
                  <strong className="text-[clamp(11px,6.5cqw,16px)] font-black leading-tight text-cyan-950">
                    {roast}
                  </strong>
                </div>
                <div className="absolute left-[24%] top-[41.7%] flex w-[57%] flex-col gap-1 px-[2%] font-black text-cyan-950">
                  {receiptLines.map((line) => (
                    <div key={line.label} className="grid grid-cols-[minmax(0,1fr)_31%] items-center gap-2">
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(8px,4.6cqw,11px)] leading-none text-cyan-800">
                        {line.label}
                      </span>
                      <strong className="whitespace-nowrap text-center text-[clamp(9px,5.3cqw,13px)] leading-none">
                        {line.value}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="coffee-report-receipt-footer">
                  <span>{drink.recentDays.at(-1)?.day ?? "今日"} 日</span>
                  <span>{error ? "待恢复" : "已入账"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DrinkBars days={drink.recentDays} />
    </aside>
  );
}
