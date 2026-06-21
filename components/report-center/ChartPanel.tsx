import type { ReactNode } from "react";

/**
 * 战报中心图表卡片外壳，复用项目 dashboard-chart-panel 设计系统。
 * chip + title 标题头是项目图表的统一识别符。
 */
export function ChartPanel({
  chip,
  title,
  children,
}: {
  chip: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-chart-panel">
      <div className="dashboard-chart-heading">
        <span className="dashboard-chart-chip">{chip}</span>
        <h2 className="dashboard-chart-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
