"use client";

import { useState, type ReactNode } from "react";

/**
 * 战报中心柱状图 hover 标签。
 * 复用项目 Brutalist tooltip 视觉语言（圆角厚边 + 落影 + 小箭头），
 * 但用独立的 class（report-bar-tooltip）避免与日历专属的 dashboard-day-tooltip scope 冲突。
 * 样式见 globals.css。
 *
 * 包裹任意柱体，hover/focus 时在柱顶浮出 children。
 */
export function BarTooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="report-bar-tooltip-host"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      role="img"
      aria-label={label}
    >
      {children}
      {hovered && (
        <div className="report-bar-tooltip" role="tooltip">
          <span className="report-bar-tooltip-arrow" aria-hidden="true" />
          {label}
        </div>
      )}
    </div>
  );
}
