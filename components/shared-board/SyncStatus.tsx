"use client";

type SyncState = "idle" | "syncing" | "error";

const LABELS: Record<SyncState, string> = {
  idle: "自动同步",
  syncing: "同步中",
  error: "同步异常",
};

const SYMBOLS: Record<SyncState, string> = {
  idle: "✓",
  syncing: "↻",
  error: "!",
};

export function SyncStatus({ state }: { state: SyncState }) {
  const isError = state === "error";

  return (
    <div
      className={`sync-status-pill ${isError ? "sync-status-error" : "sync-status-ok"}`}
      aria-live="polite"
    >
      <span className="sync-status-symbol" aria-hidden="true">{SYMBOLS[state]}</span>
      <span className={`sync-status-dot ${state === "syncing" ? "pulse-dot" : ""}`} />
      <span>{LABELS[state]}</span>
    </div>
  );
}
