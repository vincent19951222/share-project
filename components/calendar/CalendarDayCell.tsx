import type { CalendarDayCell as CalendarGridDayCell } from "./calendar-data";
import { AssetIcon } from "@/components/ui/AssetIcon";

export function CalendarDayCell({ cell }: { cell: CalendarGridDayCell }) {
  const hasActivity = cell.workedOut || cell.coffeeCups > 0;

  return (
    <div
      className={`calendar-day-cell ${cell.isToday ? "calendar-day-cell-today" : ""} ${
        hasActivity ? "calendar-day-cell-active" : ""
      }`}
    >
      <div className="calendar-day-top flex items-start justify-between gap-2">
        <span className="calendar-day-number text-base font-black text-slate-900 sm:text-lg">{cell.day}</span>
        {cell.workedOut ? (
          <span className="calendar-workout-chip" aria-label="已训练">
            练
          </span>
        ) : null}
      </div>
      {cell.coffeeCups > 0 ? (
        <div
          className="calendar-coffee-stack"
          aria-label={`咖啡 ${cell.coffeeCups} 杯`}
          role="img"
        >
          {Array.from({ length: cell.coffeeCups }, (_, index) => (
            <AssetIcon
              key={`${cell.day}-${index}`}
              name="coffee"
              className="image-render-pixel h-4 w-4 shrink-0 sm:h-5 sm:w-5"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
