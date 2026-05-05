import type { CalendarDayCell as CalendarGridDayCell } from "./calendar-data";
import { AssetIcon } from "@/components/ui/AssetIcon";

export function CalendarDayCell({ cell }: { cell: CalendarGridDayCell }) {
  const hasActivity = cell.workedOut || cell.coffeeCups > 0;

  return (
    <div
      className={`calendar-day-cell ${cell.isToday ? "calendar-day-cell-today" : ""} ${
        hasActivity ? "calendar-day-cell-active" : "calendar-day-cell-empty"
      }`}
    >
      <div className="calendar-day-top">
        <span className="calendar-day-number">{cell.day}</span>
        {cell.workedOut ? (
          <span className="calendar-workout-chip" aria-label="已训练">
            练
          </span>
        ) : null}
      </div>
      {cell.coffeeCups > 0 ? (
        <div
          className="calendar-coffee-count"
          aria-label={`咖啡 ${cell.coffeeCups} 杯`}
          role="img"
        >
          <AssetIcon name="coffee" className="calendar-coffee-icon" />
          <span>{cell.coffeeCups}</span>
        </div>
      ) : null}
      {!hasActivity ? <span className="calendar-empty-mark" aria-hidden="true" /> : null}
    </div>
  );
}
