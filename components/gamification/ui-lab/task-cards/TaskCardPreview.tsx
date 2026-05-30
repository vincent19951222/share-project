"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { SupplyTaskCardPreviewData } from "./types";

type TaskCardPreviewProps = {
  actionControls?: ReactNode;
  card: SupplyTaskCardPreviewData;
  className?: string;
  density?: "review" | "dashboard";
  onReroll?: (cardId: string) => void;
  showControls?: boolean;
};

function joinClassNames(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function TaskCardPreview({
  actionControls,
  card,
  className,
  density = "review",
  onReroll,
  showControls = true,
}: TaskCardPreviewProps) {
  return (
    <article
      aria-label={`${card.title}，${card.completed ? "已完成" : "进行中"}`}
      className={joinClassNames([
        "supply-task-card",
        `supply-task-card--${card.dimension}`,
        `supply-task-card--${density}`,
        className,
      ])}
      data-aspect-ratio={card.aspectRatio}
      data-card-id={card.id}
      data-complete={card.completed}
      data-dimension={card.dimension}
    >
      <div className="supply-task-card-corner supply-task-card-corner--tl" aria-hidden="true" />
      <div className="supply-task-card-corner supply-task-card-corner--tr" aria-hidden="true" />
      <div className="supply-task-card-band">
        <span aria-hidden="true">◆</span>
        <strong>{card.slogan}</strong>
      </div>
      <h3>{card.title}</h3>
      <div className="supply-task-card-art">
        <Image alt="" fill sizes="(max-width: 768px) 82vw, 300px" src={card.image} unoptimized />
      </div>
      <div
        className={joinClassNames([
          "supply-task-card-meta",
          actionControls ? "supply-task-card-meta--actions" : undefined,
        ])}
        aria-label={actionControls ? "任务操作" : "任务标签"}
      >
        <span data-level={card.difficulty}>{card.difficulty}</span>
        {actionControls ?? (
          <>
            <span>{card.sceneLabel}</span>
            <span>{card.cooldownLabel}</span>
          </>
        )}
      </div>
      {showControls ? (
        <>
          <button
            className="supply-task-card-reroll"
            onClick={() => onReroll?.(card.id)}
            type="button"
            aria-label={`更换任务：${card.title}`}
          >
            换一个
          </button>
          <span className="supply-task-card-state" data-complete={card.completed}>
            {card.completed ? "已完成" : "进行中"}
          </span>
        </>
      ) : null}
    </article>
  );
}
