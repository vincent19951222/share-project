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
    <section className="calendar-grid-section" aria-label={`${snapshot.monthKey} 牛马记录`}>
      <div className="calendar-month-table">
        <div className="calendar-weekday-row">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              <span className="calendar-week-prefix">周</span>
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-month-grid">
          {cells.map((cell, index) =>
            cell.kind === "neighbor" ? (
              <div
                key={`${cell.monthRelation}-${cell.day}-${index}`}
                className={`calendar-neighbor-cell calendar-neighbor-cell-${cell.monthRelation}`}
                aria-hidden="true"
              >
                {cell.day}
              </div>
            ) : (
              <CalendarDayCell key={`${snapshot.monthKey}-${cell.day}`} cell={cell} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
