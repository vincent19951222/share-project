import type {
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";
import { EmptyState } from "./EmptyState";

const R = 50;
const C = 2 * Math.PI * R;

function arcPath(start: number, end: number): string {
  // start/end 为 0-1 占比
  if (end - start >= 1) {
    // 整圆（单类型退化）
    return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  }
  const a0 = start * 2 * Math.PI - Math.PI / 2;
  const a1 = end * 2 * Math.PI - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

const BAR_W = 10;
const BAR_GAP = 3;
const TREND_H = 100;

export function DrinkCompositionPanel({
  breakdown,
  trend,
}: {
  breakdown: TeamDrinkBreakdownItem[];
  trend: TeamDrinkTrendPoint[];
}) {
  const nonZero = breakdown.filter((b) => b.count > 0);
  const total = nonZero.reduce((a, b) => a + b.count, 0);

  if (total === 0) {
    return (
      <div className="soft-card p-4">
        <h3 className="mb-2 text-sm font-bold text-main">水铺饮品构成</h3>
        <EmptyState message="暂无饮水数据" />
      </div>
    );
  }

  // 饼图扇区
  let acc = 0;
  const slices = nonZero.map((b) => {
    const start = acc / total;
    acc += b.count;
    const end = acc / total;
    return { ...b, start, end };
  });

  // 趋势柱
  const trendMax = Math.max(...trend.map((t) => t.count), 1);
  const trendW = trend.length * (BAR_W + BAR_GAP);

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">水铺饮品构成</h3>
      <div className="flex flex-wrap items-center gap-4">
        <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} role="img" aria-label="饮品构成">
          {slices.map((s) => (
            <path
              key={s.type}
              data-slice
              d={arcPath(s.start, s.end)}
              fill={s.color}
              stroke="#1f2937"
              strokeWidth={1}
            >
              <title>{`${s.label}: ${s.count} 杯 (${Math.round((s.count / total) * 100)}%)`}</title>
            </path>
          ))}
        </svg>
        <ul className="space-y-1 text-xs">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-[#1f2937]/40"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-main">{s.label}</span>
              <span className="text-sub">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
      {trend.length > 0 && (
        <svg className="mt-3" width={trendW} height={TREND_H} role="img" aria-label="每日饮水趋势">
          {trend.map((t, i) => {
            const h = (t.count / trendMax) * (TREND_H - 16);
            return (
              <rect
                key={t.dayKey}
                data-drink-bar
                x={i * (BAR_W + BAR_GAP)}
                y={TREND_H - h}
                width={BAR_W}
                height={Math.max(h, 2)}
                fill="#4fb8d6"
                stroke="#1f2937"
                strokeWidth={1}
              >
                <title>{`${t.dayKey}: ${t.count} 杯`}</title>
              </rect>
            );
          })}
        </svg>
      )}
    </div>
  );
}
