interface CalendarHeaderProps {
  monthLabel: string;
  busy: boolean;
  canReturnToCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onReturnToCurrentMonth: () => void;
}

export function CalendarHeader({
  monthLabel,
  busy,
  canReturnToCurrentMonth,
  onPreviousMonth,
  onReturnToCurrentMonth,
}: CalendarHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-[4px] border-slate-100 pb-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Monthly Record View
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          牛马日历
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-600 sm:text-base">{monthLabel}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onPreviousMonth}
          className="quest-btn min-h-11 px-4 py-2 text-sm disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:shadow-[0_4px_0_0_#1f2937]"
        >
          上个月
        </button>
        {canReturnToCurrentMonth ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReturnToCurrentMonth}
            className="calendar-return-btn min-h-11 px-4 py-2 text-sm"
          >
            回到本月
          </button>
        ) : null}
      </div>
    </header>
  );
}
