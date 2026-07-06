"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createAiImageGenerationTask,
  drawAiImageThemeFromSupply,
  fetchSupplyStationState,
  retryAiImageGenerationTask,
} from "@/lib/api";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import { cacheSupplyNavSnapshot } from "@/lib/supply-nav-cache";
import { buildSupplyNavContext } from "@/lib/supply-nav-context";
import type { SupplyStationProductionSnapshot } from "@/lib/types";
import {
  CreateAiImageGenerationTaskPayload,
  SupplyAiImageStudioPanel,
} from "./SupplyAiImageStudioPanel";
import { SupplyArtworkBackpackPanel } from "./SupplyArtworkBackpackPanel";
import { SupplyLegacyArchivePanel } from "./SupplyLegacyArchivePanel";
import { SupplyThemeGachaPanel } from "./SupplyThemeGachaPanel";

export type SupplyProductionPanel = "studio" | "themeGacha" | "artworks" | "legacyArchive";
type SupplyAction = "create-ai-image-task" | "retry-ai-image-task" | "draw-ai-image-theme";

interface SupplyErrorState {
  message: string;
  status: number | null;
}

function getSupplyErrorState(caught: unknown): SupplyErrorState {
  if (caught instanceof ApiError) {
    return {
      message: caught.status === 401 ? "登录状态已过期，请重新登录。" : caught.message,
      status: caught.status,
    };
  }

  return {
    message: caught instanceof Error ? caught.message : "牛马补给站加载失败，稍后再试。",
    status: null,
  };
}

const PANEL_OPTIONS: Array<{ id: SupplyProductionPanel; label: string }> = [
  { id: "studio", label: "生图工位" },
  { id: "themeGacha", label: "主题扭蛋" },
  { id: "artworks", label: "作品库" },
  { id: "legacyArchive", label: "旧补给归档" },
];

export function SupplyStationShell({
  initialPanel = "studio",
  onBackToPunch,
  onNavContextChange,
  onPanelChange,
}: {
  initialPanel?: SupplyProductionPanel;
  onBackToPunch?: () => void;
  onNavContextChange?: (context: SupplyNavContext | null) => void;
  onPanelChange?: (panel: SupplyProductionPanel) => void;
}) {
  const [snapshot, setSnapshot] = useState<SupplyStationProductionSnapshot | null>(null);
  const [activePanel, setActivePanel] = useState<SupplyProductionPanel>(initialPanel);
  const [activeAction, setActiveAction] = useState<SupplyAction | null>(null);
  const [error, setError] = useState<SupplyErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snapshotStaleAfterMutation, setSnapshotStaleAfterMutation] = useState(false);
  const [snapshotRefreshWarning, setSnapshotRefreshWarning] = useState<string | null>(null);
  const activeActionRef = useRef<SupplyAction | null>(null);
  const snapshotStaleAfterMutationRef = useRef(false);

  const markSnapshotFresh = useCallback(() => {
    snapshotStaleAfterMutationRef.current = false;
    setSnapshotStaleAfterMutation(false);
    setSnapshotRefreshWarning(null);
  }, []);

  const markSnapshotStaleAfterMutation = useCallback(() => {
    snapshotStaleAfterMutationRef.current = true;
    setSnapshotStaleAfterMutation(true);
    setSnapshotRefreshWarning("操作已提交成功，但补给站还没刷新出来，请先刷新后再继续。");
  }, []);

  const applySnapshot = useCallback((nextSnapshot: SupplyStationProductionSnapshot) => {
    cacheSupplyNavSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      const nextSnapshot = await fetchSupplyStationState();
      applySnapshot(nextSnapshot);
      markSnapshotFresh();
    } catch (caught) {
      setError(getSupplyErrorState(caught));
    }
  }, [applySnapshot, markSnapshotFresh]);

  const refreshSnapshotSilently = useCallback(async () => {
    try {
      const nextSnapshot = await fetchSupplyStationState();
      applySnapshot(nextSnapshot);
      markSnapshotFresh();
    } catch {
      // Keep the current snapshot if a background refresh fails.
    }
  }, [applySnapshot, markSnapshotFresh]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSnapshotSilently();
      }
    };

    const timer = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshSnapshotSilently]);

  useEffect(() => {
    setActivePanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    onNavContextChange?.(snapshot ? buildSupplyNavContext(snapshot) : null);
  }, [onNavContextChange, snapshot]);

  const selectPanel = useCallback(
    (panel: SupplyProductionPanel) => {
      setActivePanel(panel);
      onPanelChange?.(panel);
    },
    [onPanelChange],
  );

  const runAction = useCallback(
    async (action: SupplyAction, work: () => Promise<string | void>) => {
      if (activeActionRef.current || snapshotStaleAfterMutationRef.current) {
        return false;
      }

      activeActionRef.current = action;
      setActiveAction(action);
      setError(null);
      setSuccessMessage(null);

      try {
        const message = await work();
        setSuccessMessage(message ?? "操作成功");

        try {
          const nextSnapshot = await fetchSupplyStationState();
          applySnapshot(nextSnapshot);
          markSnapshotFresh();
        } catch {
          markSnapshotStaleAfterMutation();
        }

        return true;
      } catch (caught) {
        setError(getSupplyErrorState(caught));
        return false;
      } finally {
        activeActionRef.current = null;
        setActiveAction(null);
      }
    },
    [applySnapshot, markSnapshotFresh, markSnapshotStaleAfterMutation],
  );

  const handleCreateTask = useCallback(
    async (payload: CreateAiImageGenerationTaskPayload) => {
      const didSucceed = await runAction("create-ai-image-task", async () => {
        await createAiImageGenerationTask(payload);
        return "生图任务已创建";
      });

      if (!didSucceed) {
        throw new Error("create-ai-image-task-failed");
      }

      return true;
    },
    [runAction],
  );

  const handleRetryTask = useCallback(
    async (taskId: string) => {
      await runAction("retry-ai-image-task", async () => {
        await retryAiImageGenerationTask(taskId);
        return "已重新提交失败图片";
      });
    },
    [runAction],
  );

  const handleDrawTheme = useCallback(async () => {
    await runAction("draw-ai-image-theme", async () => {
      await drawAiImageThemeFromSupply();
      return "新主题已解锁";
    });
  }, [runAction]);

  return (
    <section className="supply-ai-image-shell flex flex-col gap-4" aria-label="牛马补给站">
      <header className="supply-ai-image-shell-header soft-card flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">SUPPLY STATION</p>
            <h1 className="mt-1 text-3xl font-black text-main">牛马补给站</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {snapshot ? (
              <div className="rounded-xl border-[3px] border-slate-900 bg-yellow-100 px-4 py-3 text-right shadow-[0_4px_0_0_#1f2937]">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">我的银子</p>
                <p className="mt-1 text-2xl font-black text-main">{snapshot.resources.coins.value}</p>
              </div>
            ) : null}
            {onBackToPunch ? (
              <button className="quest-btn px-4 py-2 text-sm" onClick={onBackToPunch} type="button">
                回到打卡
              </button>
            ) : null}
          </div>
        </div>

        <div className="supply-ai-image-shell-nav grid grid-cols-2 gap-2 md:grid-cols-4">
          {PANEL_OPTIONS.map((panel) => (
            <button
              key={panel.id}
              aria-pressed={activePanel === panel.id}
              className={`min-h-12 rounded-xl border-[3px] px-3 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_0_#1f2937] ${
                activePanel === panel.id ? "border-slate-900 bg-yellow-300 text-main" : "border-slate-300 bg-white text-sub"
              }`}
              data-panel={panel.id}
              data-state={activePanel === panel.id ? "active" : "inactive"}
              onClick={() => selectPanel(panel.id)}
              type="button"
            >
              {panel.label}
            </button>
          ))}
        </div>
      </header>

      <div className="soft-card p-4" role="status">
        {!snapshot && !error ? <p className="text-sm font-bold text-sub">补给站加载中...</p> : null}
        {error ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-main">{error.message}</p>
            {error.status === 401 ? <a href="/login">去登录</a> : null}
            {error.status !== 401 ? (
              <button
                className="rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black text-main shadow-[0_2px_0_0_#1f2937]"
                onClick={() => void loadSnapshot()}
                type="button"
              >
                重试
              </button>
            ) : null}
          </div>
        ) : null}
        {snapshotRefreshWarning ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-main">{snapshotRefreshWarning}</p>
            <button
              className="rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black text-main shadow-[0_2px_0_0_#1f2937]"
              onClick={() => void loadSnapshot()}
              type="button"
            >
              刷新补给站
            </button>
          </div>
        ) : null}
        {successMessage ? <p className="text-sm font-bold text-main">{successMessage}</p> : null}
      </div>

      {snapshot ? (
        <>
          {activePanel === "studio" ? (
            <SupplyAiImageStudioPanel
              mutationsDisabled={snapshotStaleAfterMutation}
              onCreateTask={handleCreateTask}
              onRetryTask={handleRetryTask}
              snapshot={snapshot.supplyAiImage}
            />
          ) : null}

          {activePanel === "themeGacha" ? (
            <SupplyThemeGachaPanel
              mutationsDisabled={snapshotStaleAfterMutation}
              isDrawingTheme={activeAction === "draw-ai-image-theme"}
              onDrawTheme={handleDrawTheme}
              snapshot={snapshot.supplyAiImage}
            />
          ) : null}

          {activePanel === "artworks" ? (
            <SupplyArtworkBackpackPanel snapshot={snapshot.supplyAiImage} />
          ) : null}

          {activePanel === "legacyArchive" ? (
            <SupplyLegacyArchivePanel snapshot={snapshot.legacyArchive} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
