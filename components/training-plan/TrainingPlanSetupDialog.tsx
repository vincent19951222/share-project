"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, createTrainingPlan } from "@/lib/api";
import type { BoardSnapshot } from "@/lib/types";
import type { CreateTrainingPlanInput } from "@/lib/training-plan/domain";

interface TrainingPlanSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (snapshot: BoardSnapshot) => void;
}

const FREQUENCY_OPTIONS = [2, 3, 4] as const;
const DURATION_OPTIONS = [30, 45, 60] as const;
const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
] as const;
const DEFAULT_WEEKDAYS: Record<2 | 3 | 4, number[]> = {
  2: [2, 5],
  3: [1, 3, 6],
  4: [1, 2, 4, 6],
};
const AVOID_OPTIONS = [
  { value: "shoulder", label: "肩部不适" },
  { value: "lower-back", label: "腰背不适" },
  { value: "knee", label: "膝部不适" },
] as const;

export function TrainingPlanSetupDialog({
  open,
  onClose,
  onCreated,
}: TrainingPlanSetupDialogProps) {
  const [weeklyFrequency, setWeeklyFrequency] = useState<2 | 3 | 4>(3);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<30 | 45 | 60>(45);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 6]);
  const [avoidTags, setAvoidTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  const toggleWeekday = (weekday: number) => {
    setError(null);
    setWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((item) => item !== weekday)
        : [...current, weekday].sort((left, right) => left - right),
    );
  };

  const toggleAvoidTag = (tag: string) => {
    setAvoidTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  const submit = async () => {
    if (weekdays.length !== weeklyFrequency) {
      setError(`请选择 ${weeklyFrequency} 个训练日`);
      return;
    }

    setBusy(true);
    setError(null);
    const input: CreateTrainingPlanInput = {
      weeklyFrequency,
      sessionDurationMinutes,
      weekdays,
      equipment: ["gym"],
      avoidTags,
    };

    try {
      const snapshot = await createTrainingPlan(input);
      onCreated(snapshot);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setError("已有进行中的计划，请先完成当前四周计划。");
      } else {
        setError("计划生成失败，请稍后再试。");
      }
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="training-plan-dialog-layer">
      <button
        type="button"
        className="training-plan-dialog-backdrop"
        aria-label="关闭训练计划设置"
        disabled={busy}
        onClick={onClose}
      />
      <section
        className="training-plan-dialog training-plan-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-plan-setup-title"
      >
        <header className="training-plan-dialog-header">
          <div>
            <span>BEGINNER / 4 WEEKS</span>
            <h2 id="training-plan-setup-title">定一套能坚持的训练节奏</h2>
          </div>
          <button type="button" className="training-plan-dialog-close" onClick={onClose} disabled={busy}>
            关闭
          </button>
        </header>

        <div className="training-plan-setup-grid">
          <fieldset className="training-plan-fieldset">
            <legend>每周训练几天</legend>
            <p>首版不会因错过某天而顺延后续安排。</p>
            <div className="training-plan-choice-row">
              {FREQUENCY_OPTIONS.map((frequency) => (
                <button
                  key={frequency}
                  type="button"
                  aria-pressed={weeklyFrequency === frequency}
                  onClick={() => {
                    setWeeklyFrequency(frequency);
                    setWeekdays(DEFAULT_WEEKDAYS[frequency]);
                    setError(null);
                  }}
                >
                  {frequency} 天
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="training-plan-fieldset">
            <legend>每次留多少时间</legend>
            <p>包含热身、主训练和放松。</p>
            <div className="training-plan-choice-row">
              {DURATION_OPTIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  aria-pressed={sessionDurationMinutes === duration}
                  onClick={() => setSessionDurationMinutes(duration)}
                >
                  {duration} 分钟
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="training-plan-fieldset training-plan-weekday-fieldset">
          <legend>固定训练日</legend>
          <p>选满 {weeklyFrequency} 天。每一天独立，跳过不会影响第二天到周日。</p>
          <div className="training-plan-weekday-grid">
            {WEEKDAYS.map((weekday) => (
              <button
                key={weekday.value}
                type="button"
                aria-pressed={weekdays.includes(weekday.value)}
                onClick={() => toggleWeekday(weekday.value)}
              >
                {weekday.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="training-plan-fieldset">
          <legend>需要避开的部位（可选）</legend>
          <p>仅用于替换动作，不是医疗判断。</p>
          <div className="training-plan-choice-row training-plan-avoid-row">
            {AVOID_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={avoidTags.includes(option.value)}
                onClick={() => toggleAvoidTag(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <small>如果正在疼痛或受伤，请先咨询专业人士，本计划不提供康复建议。</small>
        </fieldset>

        {error ? <p className="training-plan-dialog-error" role="alert">{error}</p> : null}

        <footer className="training-plan-dialog-actions">
          <button type="button" className="training-plan-dialog-cancel" onClick={onClose} disabled={busy}>
            暂不创建
          </button>
          <button type="button" className="training-plan-card-primary" onClick={submit} disabled={busy}>
            {busy ? "生成中..." : "生成计划"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
