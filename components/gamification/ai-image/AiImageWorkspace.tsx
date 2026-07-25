"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createAiImageGenerationTask,
  drawAiImageTheme,
  fetchAiImageState,
  retryAiImageGenerationTask,
} from "@/lib/api";
import {
  aiImagePanelRoutes,
  type AiImagePanelKey,
} from "@/lib/navigation-routes";
import type { AiImageSnapshot } from "@/lib/types";
import {
  CreateAiImageGenerationTaskPayload,
  SupplyAiImageStudioPanel,
} from "@/components/gamification/production/SupplyAiImageStudioPanel";
import { SupplyArtworkBackpackPanel } from "@/components/gamification/production/SupplyArtworkBackpackPanel";
import { SupplyThemeGachaPanel } from "@/components/gamification/production/SupplyThemeGachaPanel";

type AiImageAction = "create" | "retry" | "draw-theme";

interface AiImageErrorState {
  message: string;
  status: number | null;
}

function getErrorState(caught: unknown): AiImageErrorState {
  if (caught instanceof ApiError) {
    return {
      message: caught.status === 401 ? "登录状态已过期，请重新登录。" : caught.message,
      status: caught.status,
    };
  }

  return {
    message: caught instanceof Error ? caught.message : "AI 生图加载失败，稍后再试。",
    status: null,
  };
}

const panelLabels: Record<AiImagePanelKey, string> = {
  studio: "生图工作台",
  themes: "主题获取",
  artworks: "我的作品",
};

export function AiImageWorkspace({ initialPanel = "studio" }: { initialPanel?: AiImagePanelKey }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AiImageSnapshot | null>(null);
  const [activePanel, setActivePanel] = useState<AiImagePanelKey>(initialPanel);
  const [error, setError] = useState<AiImageErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snapshotStale, setSnapshotStale] = useState(false);
  const [activeAction, setActiveAction] = useState<AiImageAction | null>(null);
  const activeActionRef = useRef<AiImageAction | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await fetchAiImageState());
      setSnapshotStale(false);
    } catch (caught) {
      setError(getErrorState(caught));
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    setActivePanel(initialPanel);
  }, [initialPanel]);

  const changePanel = useCallback(
    (panel: AiImagePanelKey) => {
      setActivePanel(panel);
      router.push(aiImagePanelRoutes[panel]);
    },
    [router],
  );

  const runAction = useCallback(
    async (action: AiImageAction, work: () => Promise<string>) => {
      if (activeActionRef.current || snapshotStale) {
        return false;
      }

      activeActionRef.current = action;
      setActiveAction(action);
      setError(null);
      setSuccessMessage(null);

      try {
        const message = await work();
        setSuccessMessage(message);
        try {
          setSnapshot(await fetchAiImageState());
          setSnapshotStale(false);
        } catch {
          setSnapshotStale(true);
        }
        return true;
      } catch (caught) {
        setError(getErrorState(caught));
        return false;
      } finally {
        activeActionRef.current = null;
        setActiveAction(null);
      }
    },
    [snapshotStale],
  );

  const handleCreateTask = useCallback(
    async (payload: CreateAiImageGenerationTaskPayload) => {
      const succeeded = await runAction("create", async () => {
        await createAiImageGenerationTask(payload);
        return "生图任务已创建";
      });
      if (!succeeded) {
        throw new Error("create-ai-image-task-failed");
      }
      return true;
    },
    [runAction],
  );

  const handleRetryTask = useCallback(
    async (taskId: string) => {
      await runAction("retry", async () => {
        await retryAiImageGenerationTask(taskId);
        return "已重新提交失败图片";
      });
    },
    [runAction],
  );

  const handleDrawTheme = useCallback(async () => {
    await runAction("draw-theme", async () => {
      const result = await drawAiImageTheme();
      return `已获得主题：${result.theme.name}`;
    });
  }, [runAction]);

  const showStatus = !snapshot || Boolean(error || successMessage || snapshotStale);

  return (
    <section className="supply-ai-image-shell flex flex-col gap-4" aria-label="AI 生图实验室">
      <div className="flex flex-wrap gap-2" aria-label="AI 生图功能导航">
        {(Object.keys(panelLabels) as AiImagePanelKey[]).map((panel) => (
          <button
            aria-pressed={activePanel === panel}
            className={`rounded-full border-2 border-slate-900 px-4 py-2 text-sm font-black shadow-[0_2px_0_0_#1f2937] ${
              activePanel === panel ? "bg-yellow-200" : "bg-white"
            }`}
            key={panel}
            onClick={() => changePanel(panel)}
            type="button"
          >
            {panelLabels[panel]}
          </button>
        ))}
      </div>

      {showStatus ? (
        <div className="soft-card p-4" role="status">
          {!snapshot && !error ? <p className="text-sm font-bold text-sub">AI 生图加载中...</p> : null}
          {error ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-main">{error.message}</p>
              {error.status === 401 ? <a href="/login">去登录</a> : null}
              {error.status !== 401 ? <button onClick={() => void loadSnapshot()} type="button">重试</button> : null}
            </div>
          ) : null}
          {snapshotStale ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-main">操作已提交，但页面数据尚未刷新。</p>
              <button onClick={() => void loadSnapshot()} type="button">刷新数据</button>
            </div>
          ) : null}
          {successMessage ? <p className="text-sm font-bold text-main">{successMessage}</p> : null}
        </div>
      ) : null}

      {snapshot && activePanel === "studio" ? (
        <SupplyAiImageStudioPanel
          mutationsDisabled={snapshotStale}
          onCreateTask={handleCreateTask}
          onOpenAssets={() => changePanel("artworks")}
          onRetryTask={handleRetryTask}
          snapshot={snapshot}
        />
      ) : null}

      {snapshot && activePanel === "themes" ? (
        <SupplyThemeGachaPanel
          isDrawingTheme={activeAction === "draw-theme"}
          mutationsDisabled={snapshotStale}
          onDrawTheme={handleDrawTheme}
          snapshot={snapshot}
        />
      ) : null}

      {snapshot && activePanel === "artworks" ? (
        <SupplyArtworkBackpackPanel
          onBackToStudio={() => changePanel("studio")}
          snapshot={snapshot}
        />
      ) : null}
    </section>
  );
}
