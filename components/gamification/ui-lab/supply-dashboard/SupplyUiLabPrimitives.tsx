"use client";

import { useState, type PropsWithChildren, type ReactNode } from "react";

export type SupplyUiLabPanelTone = "hero" | "primary" | "paper" | "yellow" | "dark" | "quiet";
export type SupplyUiLabStatusTone = "success" | "warning" | "danger" | "muted" | "rare";

export function SupplyUiLabPixelPanel({
  ariaLabel,
  children,
  className = "",
  title,
  tone = "paper",
}: PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  title?: ReactNode;
  tone?: SupplyUiLabPanelTone;
}>) {
  return (
    <section
      aria-label={ariaLabel}
      className={`supply-ui-lab-panel supply-ui-lab-panel--${tone} ${className}`.trim()}
    >
      {title ? <h2 className="supply-ui-lab-panel-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SupplyUiLabActionButton({
  ariaLabel,
  children,
  className = "",
  disabled = false,
  onClick,
  tone = "primary",
  type = "button",
}: PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "quiet" | "danger";
  type?: "button" | "submit" | "reset";
}>) {
  return (
    <button
      aria-label={ariaLabel}
      className={`supply-ui-lab-action supply-ui-lab-action--${tone} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function SupplyUiLabStatusBadge({
  children,
  tone = "muted",
}: PropsWithChildren<{ tone?: SupplyUiLabStatusTone }>) {
  return <span className={`supply-ui-lab-status supply-ui-lab-status--${tone}`}>{children}</span>;
}

export function SupplyUiLabProgress({
  current,
  label,
  max,
  showPercent = false,
  valueDisplay = "inline",
}: {
  current: number;
  label: string;
  max: number;
  showPercent?: boolean;
  valueDisplay?: "inline" | "tooltip";
}) {
  const safeMax = Math.max(0, max);
  const safeCurrent = Math.min(safeMax, Math.max(0, current));
  const percent = safeMax <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((safeCurrent / safeMax) * 100)));
  const valueLabel = showPercent ? `${current}/${max} · ${percent}%` : `${current}/${max}`;
  const showInlineValue = valueDisplay === "inline";
  const showTooltipValue = valueDisplay === "tooltip";
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  return (
    <div
      className="supply-ui-lab-progress"
      data-progress-label={valueDisplay === "tooltip" ? valueLabel : undefined}
    >
      <div className="supply-ui-lab-progress-label">
        <span>{label}</span>
        {showInlineValue ? <strong>{valueLabel}</strong> : null}
      </div>
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={safeCurrent}
        aria-valuetext={valueLabel}
        data-progress-label={valueDisplay === "tooltip" ? valueLabel : undefined}
        onBlur={showTooltipValue ? () => setIsTooltipVisible(false) : undefined}
        onFocus={showTooltipValue ? () => setIsTooltipVisible(true) : undefined}
        onMouseEnter={showTooltipValue ? () => setIsTooltipVisible(true) : undefined}
        onMouseLeave={showTooltipValue ? () => setIsTooltipVisible(false) : undefined}
        role="progressbar"
        tabIndex={valueDisplay === "tooltip" ? 0 : undefined}
      >
        <span style={{ width: `${percent}%` }} />
        {showTooltipValue && isTooltipVisible ? (
          <strong className="supply-ui-lab-progress-tooltip">{valueLabel}</strong>
        ) : null}
      </div>
    </div>
  );
}

export function SupplyUiLabFilterBar({
  ariaLabel,
  filters,
  onSelect,
}: {
  ariaLabel: string;
  filters: Array<{ id: string; label: string; active: boolean }>;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="supply-ui-lab-filterbar" role="tablist" aria-label={ariaLabel}>
      {filters.map((filter) => (
        <button
          aria-selected={filter.active}
          key={filter.id}
          onClick={() => onSelect?.(filter.id)}
          role="tab"
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
