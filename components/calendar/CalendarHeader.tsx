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
  const returnDisabled = busy || !canReturnToCurrentMonth;

  return (
    <header className="calendar-header">
      <div className="calendar-header-copy">
        <p className="calendar-header-eyebrow">Monthly Record View</p>
        <div className="calendar-header-title-row">
          <h1 className="calendar-header-title">牛马日历</h1>
          <span className="calendar-header-divider" aria-hidden="true" />
          <p className="calendar-header-month">{monthLabel}</p>
        </div>
      </div>
      <div className="calendar-header-actions">
        <button
          type="button"
          disabled={busy}
          onClick={onPreviousMonth}
          className="calendar-prev-btn"
        >
          上个月
        </button>
        <button
          type="button"
          disabled={returnDisabled}
          onClick={onReturnToCurrentMonth}
          className="calendar-return-btn"
        >
          回到本月
        </button>
      </div>
    </header>
  );
}
