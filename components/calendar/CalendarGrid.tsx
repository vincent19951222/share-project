import type { CalendarMonthSnapshot } from "@/lib/types";
import { buildCalendarGrid } from "./calendar-data";
import { CalendarDayCell } from "./CalendarDayCell";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

function getFirstDayOffset(monthKey: string): number {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  const utcDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  return (utcDay + 6) % 7;
}

export function CalendarGrid({ snapshot }: { snapshot: CalendarMonthSnapshot }) {
  const cells = buildCalendarGrid(snapshot, getFirstDayOffset(snapshot.monthKey));

  return (
    <section className="calendar-grid-section flex min-h-0 flex-1 flex-col gap-3">
      <div className="calendar-weekday-row grid grid-cols-7 gap-2 text-center text-[11px] font-black text-slate-500 sm:text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday rounded-full bg-slate-100 py-2">
            <span className="calendar-week-prefix">周</span>{label}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid grid grid-cols-7 gap-2 pb-1">
        {cells.map((cell, index) =>
          cell.kind === "blank" ? (
            <div
              key={`blank-${index}`}
              className="calendar-day-cell calendar-day-cell-blank"
              aria-hidden="true"
            />
          ) : (
            <CalendarDayCell key={`${snapshot.monthKey}-${cell.day}`} cell={cell} />
          ),
        )}
      </div>
    </section>
  );
}
