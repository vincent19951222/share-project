"use client";

import { useMemo, useRef, useState } from "react";
import type {
  CardioItem,
  StrengthPart,
  TrainingType,
  WorkoutTicketPayload,
} from "@/lib/workouts";

type FitnessPunchTicketProps = {
  onCancel?: () => void;
  onConfirm?: (payload: WorkoutTicketPayload) => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
  helperText?: string;
  confirmLabel?: string;
  busyLabel?: string;
};

const trainingTypes: Array<{ id: TrainingType; label: string }> = [
  { id: "cardio", label: "有氧" },
  { id: "strength", label: "力量" },
  { id: "both", label: "都有" },
];

const cardioItems: Array<{ id: CardioItem; label: string }> = [
  { id: "treadmill", label: "跑步机" },
  { id: "elliptical", label: "椭圆机" },
  { id: "swim", label: "游泳" },
];

const strengthParts: Array<{ id: StrengthPart; label: string }> = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背" },
  { id: "shoulder", label: "肩" },
  { id: "glutes", label: "臀" },
  { id: "legs", label: "腿" },
  { id: "abs", label: "腹" },
];

function togglePart(parts: StrengthPart[], part: StrengthPart) {
  if (parts.includes(part)) {
    return parts.filter((item) => item !== part);
  }

  return [...parts, part];
}

export function FitnessPunchTicket({
  onCancel,
  onConfirm,
  busy = false,
  error = null,
  helperText = "确认后会记为今日健身打卡，并获得 1 张健身券。",
  confirmLabel = "确认打卡",
  busyLabel = "提交中...",
}: FitnessPunchTicketProps) {
  const [trainingType, setTrainingType] = useState<TrainingType>("both");
  const [cardioItem, setCardioItem] = useState<CardioItem>("treadmill");
  const [selectedParts, setSelectedParts] = useState<StrengthPart[]>(["chest", "shoulder", "glutes"]);
  const [duration, setDuration] = useState(60);
  const trainingTypeRef = useRef(trainingType);
  const cardioItemRef = useRef(cardioItem);
  const selectedPartsRef = useRef(selectedParts);
  const durationRef = useRef(duration);
  const requiresStrengthPart = trainingType === "strength" || trainingType === "both";
  const isSelectionValid = !requiresStrengthPart || selectedParts.length > 0;

  const selectedPartText = useMemo(
    () =>
      strengthParts
        .filter((part) => selectedParts.includes(part.id))
        .map((part) => part.label)
        .join(" / "),
    [selectedParts],
  );

  function changeDuration(delta: number) {
    const nextDuration = Math.min(180, Math.max(10, durationRef.current + delta));

    durationRef.current = nextDuration;
    setDuration(nextDuration);
  }

  function selectTrainingType(nextTrainingType: TrainingType) {
    trainingTypeRef.current = nextTrainingType;
    setTrainingType(nextTrainingType);
  }

  function selectCardioItem(nextCardioItem: CardioItem) {
    cardioItemRef.current = nextCardioItem;
    setCardioItem(nextCardioItem);
  }

  function toggleSelectedPart(part: StrengthPart) {
    const nextParts = togglePart(selectedPartsRef.current, part);

    selectedPartsRef.current = nextParts;
    setSelectedParts(nextParts);
  }

  function buildPayload(): WorkoutTicketPayload {
    return {
      trainingType: trainingTypeRef.current,
      cardioItem: trainingTypeRef.current === "strength" ? null : cardioItemRef.current,
      strengthParts: trainingTypeRef.current === "cardio" ? [] : selectedPartsRef.current,
      durationMinutes: durationRef.current,
    };
  }

  async function handleConfirm() {
    if (busy || !onConfirm || !isSelectionValid) {
      return;
    }

    const ok = await onConfirm(buildPayload());

    if (ok) {
      onCancel?.();
    }
  }

  return (
    <div className="fitness-ticket-frame">
      <div className="fitness-ticket-card">
        <header className="fitness-ticket-header">
          <span className="fitness-ticket-title-rule" aria-hidden="true" />
          <h1 id="fitness-ticket-title">今日训练小票</h1>
          <span className="fitness-ticket-title-rule" aria-hidden="true" />
          <button
            className="fitness-ticket-close"
            type="button"
            aria-label="关闭训练小票"
            disabled={busy}
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="fitness-ticket-body">
          <section className="fitness-ticket-controls" aria-label="训练选项">
            <div className="fitness-ticket-field">
              <h2>训练类型</h2>
              <div className="fitness-ticket-segment-grid">
                {trainingTypes.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === trainingType ? "fitness-ticket-option-active" : "fitness-ticket-option"}
                    type="button"
                    disabled={busy}
                    onClick={() => selectTrainingType(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fitness-ticket-field">
              <h2>有氧项目</h2>
              <div className="fitness-ticket-segment-grid">
                {cardioItems.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === cardioItem ? "fitness-ticket-option-active" : "fitness-ticket-option"}
                    type="button"
                    disabled={busy}
                    onClick={() => selectCardioItem(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fitness-ticket-field">
              <h2>力量部位</h2>
              <div className="fitness-ticket-parts-grid">
                {strengthParts.map((item) => (
                  <button
                    key={item.id}
                    className={
                      selectedParts.includes(item.id)
                        ? "fitness-ticket-option-active"
                        : "fitness-ticket-option"
                    }
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSelectedPart(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fitness-ticket-field">
              <h2>训练时长 <span>可选</span></h2>
              <div className="fitness-ticket-duration" aria-label="训练时长">
                <button type="button" disabled={busy} onClick={() => changeDuration(-10)} aria-label="减少训练时长">
                  −
                </button>
                <output>
                  <strong>{duration}</strong>
                  <span>分钟</span>
                </output>
                <button type="button" disabled={busy} onClick={() => changeDuration(10)} aria-label="增加训练时长">
                  +
                </button>
              </div>
            </div>
          </section>

          <section className="fitness-ticket-muscle-panel" aria-label="今日训练部位肌肉图">
            <div className="fitness-ticket-panel-header">
              <h2>今日训练部位肌肉图</h2>
              <p>{selectedPartText || "未选择力量部位"}</p>
            </div>
            <div className="fitness-ticket-muscle-map">
              <img
                src="/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png"
                alt="今日训练部位肌肉图"
              />
            </div>
          </section>
        </div>

        {error ? <p className="fitness-ticket-error">{error}</p> : null}
        {!isSelectionValid ? <p className="fitness-ticket-error">至少选择一个力量部位</p> : null}
        <p className="fitness-ticket-helper">{helperText}</p>

        <footer className="fitness-ticket-footer">
          <button className="fitness-ticket-cancel" type="button" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button className="fitness-ticket-confirm" type="button" disabled={busy || !isSelectionValid} onClick={handleConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
