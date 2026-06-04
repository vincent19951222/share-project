"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  claimGamificationLifeTicket,
  completeGamificationTask,
  dismissSocialInvitation,
  drawGamificationLottery,
  fetchSupplyStationState,
  purchaseGamificationShopItem,
  rerollGamificationTask,
  requestRealWorldRedemption,
  respondToSocialInvitation,
  useGamificationItem,
  type UseGamificationItemRequest,
} from "@/lib/api";
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import type { SupplyUiLabTopBarTabId } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { SupplyTaskRecordScene } from "@/components/gamification/ui-lab/supply-task-record/SupplyTaskRecordScene";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import { cacheSupplyNavSnapshot } from "@/lib/supply-nav-cache";
import { buildSupplyNavContext } from "@/lib/supply-nav-context";
import type {
  GamificationDimensionSnapshot,
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";
import {
  toSupplyBackpackPreview,
  toSupplyDashboardPreview,
  toSupplyDrawPoolPreview,
  toSupplyShopPreview,
  toSupplyTaskRecordPreview,
} from "./supply-ui-lab-adapters";

export type SupplyProductionPanel = "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord";
type SupplyDashboardAction = "complete-task" | "reroll-task" | "claim-ticket";
type SupplyAction =
  | SupplyDashboardAction
  | "draw-single"
  | "draw-ten"
  | "use-item"
  | "request-redemption"
  | "purchase-shop-item"
  | "dismiss-social-invitation"
  | "respond-social-invitation";

interface SupplyErrorState {
  message: string;
  status: number | null;
}

export interface SupplyBackpackUseTarget {
  dimensionKey?: string;
  recipientUserId?: string;
  message?: string;
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

function normalizeBackpackUseTarget(
  target?: SupplyBackpackUseTarget,
): UseGamificationItemRequest["target"] {
  if (!target) {
    return undefined;
  }

  const dimensionKey =
    target.dimensionKey === "movement" ||
    target.dimensionKey === "hydration" ||
    target.dimensionKey === "social" ||
    target.dimensionKey === "learning"
      ? target.dimensionKey
      : undefined;

  return {
    dimensionKey,
    recipientUserId: target.recipientUserId,
    message: target.message,
  };
}

export function SupplyStationShell({
  initialPanel = "dashboard",
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
  const [, setActiveAction] = useState<SupplyAction | null>(null);
  const [latestDraw, setLatestDraw] = useState<GamificationLotteryDrawSnapshot | null>(null);
  const [selectedBackpackItemId, setSelectedBackpackItemId] = useState<string | null>(null);
  const [selectedShopItemId, setSelectedShopItemId] = useState<string | null>(null);
  const [error, setError] = useState<SupplyErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const applySnapshot = useCallback((nextSnapshot: SupplyStationProductionSnapshot) => {
    cacheSupplyNavSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      const nextSnapshot = await fetchSupplyStationState();
      applySnapshot(nextSnapshot);
    } catch (caught) {
      setError(getSupplyErrorState(caught));
    }
  }, [applySnapshot]);

  const refreshSnapshotSilently = useCallback(async () => {
    try {
      const nextSnapshot = await fetchSupplyStationState();
      applySnapshot(nextSnapshot);
    } catch {
      // Keep the current snapshot if a background refresh fails.
    }
  }, [applySnapshot]);

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
      setActiveAction(action);
      setError(null);
      setSuccessMessage(null);

      try {
        const message = await work();
        const nextSnapshot = await fetchSupplyStationState();
        applySnapshot(nextSnapshot);
        setSuccessMessage(message ?? "操作成功");
      } catch (caught) {
        setError(getSupplyErrorState(caught));
      } finally {
        setActiveAction(null);
      }
    },
    [applySnapshot],
  );

  const handleCompleteTask = useCallback(
    (dimensionKey: GamificationDimensionSnapshot["key"]) => {
      void runAction("complete-task", async () => {
        await completeGamificationTask({ dimensionKey });
        return "任务已完成";
      });
    },
    [runAction],
  );

  const handleRerollTask = useCallback(
    (dimensionKey: GamificationDimensionSnapshot["key"]) => {
      void runAction("reroll-task", async () => {
        await rerollGamificationTask({ dimensionKey });
        return "任务已更换";
      });
    },
    [runAction],
  );

  const handleClaimTicket = useCallback(() => {
    void runAction("claim-ticket", async () => {
      await claimGamificationLifeTicket();
      return "抽奖券已领取";
    });
  }, [runAction]);

  const handleDraw = useCallback(
    (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => {
      void runAction(drawType === "TEN" ? "draw-ten" : "draw-single", async () => {
        const result = await drawGamificationLottery({ drawType, useCoinTopUp });
        setLatestDraw(result.draw);
        selectPanel("drawPool");
        return drawType === "TEN" ? "十连完成" : "单抽完成";
      });
    },
    [runAction, selectPanel],
  );

  const handleUseItem = useCallback(
    (itemId: string, target?: SupplyBackpackUseTarget) => {
      void runAction("use-item", async () => {
        const result = await useGamificationItem({
          itemId,
          target: normalizeBackpackUseTarget(target),
        });
        return result.itemUse.message;
      });
    },
    [runAction],
  );

  const handleRequestRedemption = useCallback(
    (itemId: string) => {
      void runAction("request-redemption", async () => {
        await requestRealWorldRedemption(itemId);
        return "兑换申请已提交";
      });
    },
    [runAction],
  );

  const handlePurchase = useCallback(
    (itemId: string) => {
      void runAction("purchase-shop-item", async () => {
        await purchaseGamificationShopItem(itemId);
        setSelectedShopItemId(itemId);
        return "购买成功";
      });
    },
    [runAction],
  );

  const handleRespondSocialInvitation = useCallback(
    (invitationId: string) => {
      void runAction("respond-social-invitation", async () => {
        await respondToSocialInvitation({ invitationId });
        return "已回应队友雷达";
      });
    },
    [runAction],
  );

  const handleDismissSocialInvitation = useCallback(
    (invitationId: string) => {
      void runAction("dismiss-social-invitation", async () => {
        await dismissSocialInvitation({ invitationId });
        return "已忽略队友邀请";
      });
    },
    [runAction],
  );

  const handlePanelNavigation = useCallback((target: "home" | "draw-pool" | "backpack" | "shop" | "task-record") => {
    if (target === "home") {
      onBackToPunch?.();
      return;
    }

    const nextPanelByTarget: Record<Exclude<typeof target, "home">, SupplyProductionPanel> = {
      "draw-pool": "drawPool",
      backpack: "backpack",
      shop: "shop",
      "task-record": "taskRecord",
    };

    selectPanel(nextPanelByTarget[target]);
  }, [onBackToPunch, selectPanel]);

  const handleTopBarTabNavigation = useCallback((tabId: SupplyUiLabTopBarTabId) => {
    const nextPanelByTab: Record<SupplyUiLabTopBarTabId, SupplyProductionPanel> = {
      status: "dashboard",
      shop: "shop",
      "task-record": "taskRecord",
    };

    selectPanel(nextPanelByTab[tabId]);
  }, [selectPanel]);

  return (
    <section className="supply-ui-lab-production-frame" aria-label="牛马补给站">
      <div className="supply-ui-lab-production-status" role="status">
        {!snapshot && !error ? <p>补给站加载中...</p> : null}
        {error ? (
          <div>
            <p>{error.message}</p>
            {error.status === 401 ? <a href="/login">去登录</a> : null}
            {error.status !== 401 ? (
              <button onClick={() => void loadSnapshot()} type="button">
                重试
              </button>
            ) : null}
          </div>
        ) : null}
        {successMessage ? <p>{successMessage}</p> : null}
      </div>

      {snapshot ? (
        <>
          {activePanel === "dashboard" ? (
            <SupplyDashboardScene
              chrome="embedded"
              data={toSupplyDashboardPreview(snapshot)}
              feedbackMessage={successMessage}
              onBackToPunch={onBackToPunch}
              onClaimRewards={handleClaimTicket}
              onCompleteQuest={(questId) => handleCompleteTask(questId as GamificationDimensionSnapshot["key"])}
              onNavigate={(target) => handlePanelNavigation(target)}
              onRerollQuest={(questId) => handleRerollTask(questId as GamificationDimensionSnapshot["key"])}
              onSelectSupplyTab={handleTopBarTabNavigation}
            />
          ) : null}

          {activePanel === "drawPool" ? (
            <SupplyDrawPoolScene
              chrome="embedded"
              data={toSupplyDrawPoolPreview(snapshot, latestDraw)}
              onDraw={(actionId) =>
                handleDraw(
                  actionId === "ten" ? "TEN" : "SINGLE",
                  actionId === "ten" && snapshot.drawPool.lottery.tenDrawTopUpRequired > 0,
                )
              }
            />
          ) : null}

          {activePanel === "backpack" ? (
            <SupplyBackpackScene
              chrome="embedded"
              data={toSupplyBackpackPreview(snapshot, selectedBackpackItemId)}
              onRequestRedemption={handleRequestRedemption}
              onSelectItem={setSelectedBackpackItemId}
              onUseItem={handleUseItem}
              selectedItemId={selectedBackpackItemId}
            />
          ) : null}

          {activePanel === "shop" ? (
            <SupplyShopScene
              chrome="embedded"
              data={toSupplyShopPreview(snapshot, selectedShopItemId)}
              onBackToPunch={onBackToPunch}
              onPurchase={handlePurchase}
              onSelectProduct={setSelectedShopItemId}
              onSelectSupplyTab={handleTopBarTabNavigation}
              selectedProductId={selectedShopItemId}
            />
          ) : null}

          {activePanel === "taskRecord" ? (
            <SupplyTaskRecordScene
              chrome="embedded"
              data={toSupplyTaskRecordPreview(snapshot)}
              onBackToPunch={onBackToPunch}
              onDismissSocialInvitation={handleDismissSocialInvitation}
              onRespondSocialInvitation={handleRespondSocialInvitation}
              onSelectSupplyTab={handleTopBarTabNavigation}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
