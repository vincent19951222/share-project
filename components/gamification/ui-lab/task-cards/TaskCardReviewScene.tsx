"use client";

import { useState } from "react";
import { TaskCardPreview } from "./TaskCardPreview";
import { taskCardReviewCards } from "./task-card-demo-data";
import type { SupplyTaskCardPreviewData } from "./types";

function DashboardPlacementPreview({
  cards,
  variant,
}: {
  cards: SupplyTaskCardPreviewData[];
  variant: "compact" | "card-first";
}) {
  return (
    <section
      className={`supply-task-card-dashboard-preview supply-task-card-dashboard-preview--${variant}`}
      aria-label={variant === "compact" ? "Compact 2x2 今日主线预览" : "Card-first 2x2 今日主线预览"}
    >
      <div className="supply-task-card-dashboard-preview-heading">
        <strong>{variant === "compact" ? "Compact 2x2" : "Card-first 2x2"}</strong>
        <span>进度 3/4</span>
      </div>
      <div className="supply-task-card-dashboard-preview-grid">
        {cards.map((card) => (
          <TaskCardPreview card={card} density="dashboard" key={`${variant}-${card.id}`} />
        ))}
      </div>
      <footer>
        <p>
          完成全部任务可获得 <span>EXP 200</span><span>银子 100</span><span>抽奖券 1</span>
        </p>
        <button type="button">领取奖励</button>
      </footer>
    </section>
  );
}

export function TaskCardReviewScene({
  cards = taskCardReviewCards,
}: {
  cards?: SupplyTaskCardPreviewData[];
}) {
  const [feedback, setFeedback] = useState("Review only：点击换一个只验证控件位置。");

  return (
    <main className="supply-task-card-review-scene" aria-label="任务卡 3:4 组合评审">
      <header className="supply-task-card-review-header">
        <a href="/ui-lab/supply-dashboard">返回 Dashboard</a>
        <div>
          <p>Task Card Review</p>
          <h1>3:4 今日主线任务卡</h1>
        </div>
        <span aria-live="polite">{feedback}</span>
      </header>

      <section className="supply-task-card-review-panel" aria-label="四卡 contact sheet">
        <div className="supply-task-card-review-panel-heading">
          <h2>四卡 Contact Sheet</h2>
          <p>统一检查边框、插图窗口、中文文字层、状态和换任务按钮。</p>
        </div>
        <div className="supply-task-card-review-grid">
          {cards.map((card) => (
            <TaskCardPreview
              card={card}
              key={card.id}
              onReroll={(cardId) => setFeedback(`已触发换任务预览：${cardId}`)}
            />
          ))}
        </div>
      </section>

      <section className="supply-task-card-review-panel" aria-label="Dashboard 今日主线落位预览">
        <div className="supply-task-card-review-panel-heading">
          <h2>Dashboard 今日主线落位</h2>
          <p>同屏比较当前右侧面板思路和卡牌优先思路。</p>
        </div>
        <div className="supply-task-card-dashboard-preview-list">
          <DashboardPlacementPreview cards={cards} variant="compact" />
          <DashboardPlacementPreview cards={cards} variant="card-first" />
        </div>
      </section>
    </main>
  );
}
