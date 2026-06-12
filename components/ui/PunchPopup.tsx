"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QuestBtn } from "./QuestBtn";
import { FitnessPunchTicket } from "./FitnessPunchTicket";
import type { WorkoutTicketPayload } from "@/lib/workouts";

interface PunchPopupProps {
  onConfirm: (payload?: WorkoutTicketPayload) => Promise<boolean> | boolean;
  variant?: "simple" | "fitness-ticket";
  busy?: boolean;
  error?: string | null;
  triggerContent?: ReactNode;
  triggerClassName?: string;
  title?: string;
  description?: string;
  helperText?: string;
  confirmLabel?: string;
  busyLabel?: string;
  initialWorkoutPayload?: WorkoutTicketPayload | null;
  onDangerAction?: () => Promise<boolean> | boolean;
  dangerLabel?: string;
  dangerBusyLabel?: string;
}

export function PunchPopup({
  onConfirm,
  variant = "simple",
  busy = false,
  error = null,
  triggerContent = "+",
  triggerClassName = "cell my-punch-btn text-xl cursor-pointer disabled:opacity-50",
  title = "确认打卡",
  description = "确认打卡今天吗？",
  helperText = "确认后会直接记为今日健身打卡。",
  confirmLabel = "确认打卡",
  busyLabel = "提交中...",
  initialWorkoutPayload = null,
  onDangerAction,
  dangerLabel,
  dangerBusyLabel = "处理中...",
}: PunchPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setShow(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [show, busy]);

  const popupLayer =
    variant === "fitness-ticket" ? (
      <div className="fitness-ticket-modal-layer">
        <button
          type="button"
          className="fitness-ticket-modal-backdrop"
          aria-label="关闭训练小票"
          disabled={busy}
          onClick={() => !busy && setShow(false)}
        />
        <div
          className="fitness-ticket-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fitness-ticket-title"
        >
          <FitnessPunchTicket
            busy={busy}
            error={error}
            helperText={helperText}
            confirmLabel={confirmLabel}
            busyLabel={busyLabel}
            initialPayload={initialWorkoutPayload}
            onDangerAction={onDangerAction}
            dangerLabel={dangerLabel}
            dangerBusyLabel={dangerBusyLabel}
            onCancel={() => !busy && setShow(false)}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    ) : (
      <>
        <div className="fixed inset-0 bg-black/30 z-[200]" onClick={() => !busy && setShow(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0_0_#1f2937] z-[201] w-full max-w-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-black text-slate-800">{title}</h3>
            <button
              type="button"
              onClick={() => !busy && setShow(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-800 transition-colors text-slate-400 hover:text-slate-800"
            >
              ✕
            </button>
          </div>
          <p className="text-sm font-bold text-main leading-relaxed">{description}</p>
          <p className="text-xs font-bold text-sub mt-2">{helperText}</p>
          {error ? <p className="mt-3 text-xs font-bold text-orange-500">{error}</p> : null}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => !busy && setShow(false)}
              className="flex-1 py-3 text-sm font-bold border-2 border-slate-200 rounded-xl hover:border-slate-800 transition-colors"
            >
              取消
            </button>
            <QuestBtn
              type="button"
              className="flex-1 py-3 text-sm"
              disabled={busy}
              onClick={async () => {
                const ok = await onConfirm();
                if (ok) {
                  setShow(false);
                }
              }}
            >
              {busy ? busyLabel : confirmLabel}
            </QuestBtn>
          </div>
        </div>
      </>
    );

  return (
    <div style={{ position: "relative" }}>
      <button
        className={triggerClassName}
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          setShow(true);
        }}
      >
        {triggerContent}
      </button>
      {show ? createPortal(popupLayer, document.body) : null}
    </div>
  );
}
