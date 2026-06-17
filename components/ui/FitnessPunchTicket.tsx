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
  initialPayload?: WorkoutTicketPayload | null;
  busy?: boolean;
  error?: string | null;
  helperText?: string;
  confirmLabel?: string;
  busyLabel?: string;
  dangerLabel?: string;
  dangerBusyLabel?: string;
  onDangerAction?: () => Promise<boolean> | boolean;
};

const cardioItems: Array<{ id: CardioItem; label: string }> = [
  { id: "treadmill", label: "跑步机" },
  { id: "elliptical", label: "椭圆机" },
  { id: "walk", label: "散步" },
  { id: "swim", label: "游泳" },
];

const strengthParts: Array<{ id: StrengthPart; label: string }> = [
  { id: "chest", label: "胸部" },
  { id: "back", label: "背部" },
  { id: "shoulder", label: "肩部" },
  { id: "arms", label: "手臂" },
  { id: "abs", label: "腹部" },
  { id: "legs", label: "腿部" },
];

const defaultTicketPayload: WorkoutTicketPayload = {
  trainingType: "cardio",
  cardioItem: "treadmill",
  strengthParts: [],
  durationMinutes: 60,
};

function deriveTrainingType(cardioItem: CardioItem | null, parts: StrengthPart[]): TrainingType | null {
  if (cardioItem && parts.length > 0) {
    return "both";
  }

  if (cardioItem) {
    return "cardio";
  }

  if (parts.length > 0) {
    return "strength";
  }

  return null;
}

function deriveTrainingTypeLabels(cardioItem: CardioItem | null, parts: StrengthPart[]) {
  const labels: string[] = [];

  if (cardioItem) {
    labels.push("有氧");
  }

  if (parts.length > 0) {
    labels.push("力量");
  }

  return labels.length > 0 ? labels : ["未选择"];
}

function togglePart(parts: StrengthPart[], part: StrengthPart) {
  if (parts.includes(part)) {
    return parts.filter((item) => item !== part);
  }

  return [...parts, part];
}

function StrengthPartIcon({ part }: { part: StrengthPart }) {
  return (
    <img
      className="fitness-ticket-part-icon"
      data-strength-part-icon={part}
      src={`/assets/ui-prototypes/fitness-punch-ticket/generated/part-icons/${part}.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function FitnessPunchTicket({
  onCancel,
  onConfirm,
  initialPayload = null,
  busy = false,
  error = null,
  helperText = "确认后会记录今日健身打卡，并同步训练数据。",
  confirmLabel = "确认打卡",
  busyLabel = "提交中...",
  dangerLabel,
  dangerBusyLabel = "处理中...",
  onDangerAction,
}: FitnessPunchTicketProps) {
  const hasDangerAction = Boolean(onDangerAction && dangerLabel);
  const startingPayload = initialPayload ?? defaultTicketPayload;
  const [cardioItem, setCardioItem] = useState<CardioItem | null>(startingPayload.cardioItem);
  const [selectedParts, setSelectedParts] = useState<StrengthPart[]>(startingPayload.strengthParts);
  const [duration, setDuration] = useState(startingPayload.durationMinutes);
  const cardioItemRef = useRef<CardioItem | null>(startingPayload.cardioItem);
  const selectedPartsRef = useRef(startingPayload.strengthParts);
  const durationRef = useRef(startingPayload.durationMinutes);
  const trainingType = deriveTrainingType(cardioItem, selectedParts);
  const trainingTypeSummaryLabels = deriveTrainingTypeLabels(cardioItem, selectedParts);
  const isSelectionValid = trainingType !== null;

  const selectedPartText = useMemo(
    () =>
      strengthParts
        .filter((part) => selectedParts.includes(part.id))
        .map((part) => part.label)
        .join("、"),
    [selectedParts],
  );
  const selectedCardioText = cardioItems.find((item) => item.id === cardioItem)?.label ?? "未选择";
  const selectedPartSummaryText = selectedPartText || "未选择";

  function changeDuration(delta: number) {
    const nextDuration = Math.min(180, Math.max(10, durationRef.current + delta));

    durationRef.current = nextDuration;
    setDuration(nextDuration);
  }

  function selectCardioItem(nextCardioItem: CardioItem) {
    const nextSelection = cardioItemRef.current === nextCardioItem ? null : nextCardioItem;

    cardioItemRef.current = nextSelection;
    setCardioItem(nextSelection);
  }

  function toggleSelectedPart(part: StrengthPart) {
    const nextParts = togglePart(selectedPartsRef.current, part);

    selectedPartsRef.current = nextParts;
    setSelectedParts(nextParts);
  }

  function buildPayload(): WorkoutTicketPayload | null {
    const nextTrainingType = deriveTrainingType(cardioItemRef.current, selectedPartsRef.current);

    if (!nextTrainingType) {
      return null;
    }

    return {
      trainingType: nextTrainingType,
      cardioItem: nextTrainingType === "strength" ? null : cardioItemRef.current,
      strengthParts: nextTrainingType === "cardio" ? [] : selectedPartsRef.current,
      durationMinutes: durationRef.current,
    };
  }

  async function handleConfirm() {
    const payload = buildPayload();

    if (busy || !onConfirm || !payload) {
      return;
    }

    const ok = await onConfirm(payload);

    if (ok) {
      onCancel?.();
    }
  }

  async function handleDangerAction() {
    if (busy || !onDangerAction) {
      return;
    }

    const ok = await onDangerAction();

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
              <div className="fitness-ticket-section-heading">
                <span className="fitness-ticket-section-marker">A</span>
                <h2>有氧项目</h2>
              </div>
              <div className="fitness-ticket-cardio-grid">
                {cardioItems.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === cardioItem ? "fitness-ticket-option-active" : "fitness-ticket-option"}
                    type="button"
                    aria-pressed={item.id === cardioItem}
                    disabled={busy}
                    onClick={() => selectCardioItem(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fitness-ticket-field">
              <div className="fitness-ticket-section-heading">
                <span className="fitness-ticket-section-marker">B</span>
                <h2>今日重点部位</h2>
              </div>
              <div className="fitness-ticket-strength-grid">
                {strengthParts.map((item) => (
                  <button
                    key={item.id}
                    className={
                      selectedParts.includes(item.id)
                        ? "fitness-ticket-strength-card fitness-ticket-option-active"
                        : "fitness-ticket-strength-card fitness-ticket-option"
                    }
                    type="button"
                    aria-pressed={selectedParts.includes(item.id)}
                    disabled={busy}
                    onClick={() => toggleSelectedPart(item.id)}
                  >
                    <StrengthPartIcon part={item.id} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="fitness-ticket-field">
              <div className="fitness-ticket-section-heading">
                <span className="fitness-ticket-section-marker">C</span>
                <h2>训练时长 <span>可选</span></h2>
              </div>
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

            <div className="fitness-ticket-workout-summary" aria-live="polite">
              <span><strong>有氧：</strong>{selectedCardioText}</span>
              <i aria-hidden="true">•</i>
              <span><strong>部位：</strong>{selectedPartSummaryText}</span>
              <i aria-hidden="true">•</i>
              <span><strong>时长：</strong>{duration}分钟</span>
              <div
                className={`fitness-ticket-training-summary${
                  trainingType ? "" : " fitness-ticket-training-summary-empty"
                }`}
                aria-label="训练类型摘要"
              >
                <span>训练类型</span>
                <div className="fitness-ticket-training-summary-tags">
                  {trainingTypeSummaryLabels.map((label) => (
                    <strong key={label}>{label}</strong>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {error ? <p className="fitness-ticket-error">{error}</p> : null}
        {!isSelectionValid ? <p className="fitness-ticket-error">至少选择一个有氧项目或力量部位</p> : null}
        <p className="fitness-ticket-helper">{helperText}</p>

        <footer className={`fitness-ticket-footer${hasDangerAction ? " fitness-ticket-footer-editing" : ""}`}>
          {hasDangerAction ? (
            <button
              className="fitness-ticket-cancel fitness-ticket-danger"
              type="button"
              disabled={busy}
              onClick={handleDangerAction}
            >
              {busy ? dangerBusyLabel : dangerLabel}
            </button>
          ) : null}
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
