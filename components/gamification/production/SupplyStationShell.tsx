"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  claimGamificationLifeTicket,
  completeGamificationTask,
  drawGamificationLottery,
  fetchSupplyStationState,
  purchaseGamificationShopItem,
  rerollGamificationTask,
  requestRealWorldRedemption,
  respondToSocialInvitation,
  useGamificationItem,
  type UseGamificationItemRequest,
} from "@/lib/api";
import type {
  GamificationDimensionSnapshot,
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";
import {
  SupplyBackpackPanel,
  type SupplyBackpackUseTarget,
} from "./SupplyBackpackPanel";
import { SupplyDashboardPanel } from "./SupplyDashboardPanel";
import { SupplyDrawPoolPanel } from "./SupplyDrawPoolPanel";
import { SupplyShopPanel } from "./SupplyShopPanel";
import { SupplyTaskRecordPanel } from "./SupplyTaskRecordPanel";

type SupplyProductionPanel = "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord";
type SupplyDashboardAction = "complete-task" | "reroll-task" | "claim-ticket";
type SupplyAction =
  | SupplyDashboardAction
  | "draw-single"
  | "draw-ten"
  | "use-item"
  | "request-redemption"
  | "purchase-shop-item"
  | "respond-social-invitation";

interface SupplyErrorState {
  message: string;
  status: number | null;
}

const panelItems: Array<{ key: SupplyProductionPanel; label: string }> = [
  { key: "dashboard", label: "我的状态" },
  { key: "drawPool", label: "抽卡池" },
  { key: "backpack", label: "背包" },
  { key: "shop", label: "补给商店" },
  { key: "taskRecord", label: "任务记录" },
];

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

function isDashboardAction(action: SupplyAction | null): action is SupplyDashboardAction {
  return action === "complete-task" || action === "reroll-task" || action === "claim-ticket";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
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

export function SupplyStationShell() {
  const [snapshot, setSnapshot] = useState<SupplyStationProductionSnapshot | null>(null);
  const [activePanel, setActivePanel] = useState<SupplyProductionPanel>("dashboard");
  const [activeAction, setActiveAction] = useState<SupplyAction | null>(null);
  const [latestDraw, setLatestDraw] = useState<GamificationLotteryDrawSnapshot | null>(null);
  const [selectedBackpackItemId, setSelectedBackpackItemId] = useState<string | null>(null);
  const [selectedShopItemId, setSelectedShopItemId] = useState<string | null>(null);
  const [error, setError] = useState<SupplyErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      const nextSnapshot = await fetchSupplyStationState();
      setSnapshot(nextSnapshot);
    } catch (caught) {
      setError(getSupplyErrorState(caught));
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const runAction = useCallback(
    async (action: SupplyAction, work: () => Promise<string | void>) => {
      setActiveAction(action);
      setError(null);
      setSuccessMessage(null);

      try {
        const message = await work();
        const nextSnapshot = await fetchSupplyStationState();
        setSnapshot(nextSnapshot);
        setSuccessMessage(message ?? "操作成功");
      } catch (caught) {
        setError(getSupplyErrorState(caught));
      } finally {
        setActiveAction(null);
      }
    },
    [],
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
        return "任务已换班";
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
        setActivePanel("drawPool");
        return drawType === "TEN" ? "十连完成" : "单抽完成";
      });
    },
    [runAction],
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

  const handlePanelNavigation = useCallback((target: "draw-pool" | "backpack" | "shop" | "task-record") => {
    const nextPanelByTarget: Record<typeof target, SupplyProductionPanel> = {
      "draw-pool": "drawPool",
      backpack: "backpack",
      shop: "shop",
      "task-record": "taskRecord",
    };

    setActivePanel(nextPanelByTarget[target]);
  }, []);

  return (
    <section className="supply-production-shell" aria-label="牛马补给站">
      <header className="supply-production-shell__header">
        <div>
          <p>脱脂牛马</p>
          <h1>牛马补给站</h1>
        </div>
        {snapshot ? (
          <div className="supply-production-shell__resources" aria-label="补给站资源">
            <span>Lv.{snapshot.profile.level}</span>
            <span>{snapshot.resources.coins.label} {formatNumber(snapshot.resources.coins.value)}</span>
            <span>{snapshot.resources.ticket.label} {formatNumber(snapshot.resources.ticket.value)}</span>
            <span>
              {snapshot.resources.backpack.label} {formatNumber(snapshot.resources.backpack.value)}/
              {formatNumber(snapshot.resources.backpack.maxValue ?? 60)}
            </span>
          </div>
        ) : null}
        <nav className="supply-production-shell__links" aria-label="补给站文档">
          <a href="/docs?tab=rules#supply-station-rules">玩法规则</a>
          <a href="/docs?tab=rules#supply-station-probability">抽奖概率</a>
        </nav>
      </header>

      <nav className="supply-production-shell__tabs" aria-label="补给站页面">
        {panelItems.map((panel) => (
          <button
            aria-pressed={activePanel === panel.key}
            key={panel.key}
            onClick={() => setActivePanel(panel.key)}
            type="button"
          >
            {panel.label}
          </button>
        ))}
      </nav>

      <div className="supply-production-shell__status" role="status">
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
        <main className="supply-production-shell__main">
          {activePanel === "dashboard" ? (
            <SupplyDashboardPanel
              activeAction={isDashboardAction(activeAction) ? activeAction : null}
              onClaimTicket={handleClaimTicket}
              onCompleteTask={handleCompleteTask}
              onNavigate={handlePanelNavigation}
              onRerollTask={handleRerollTask}
              snapshot={snapshot}
            />
          ) : null}

          {activePanel === "drawPool" ? (
            <SupplyDrawPoolPanel
              activeAction={activeAction}
              latestDraw={latestDraw}
              onDraw={handleDraw}
              snapshot={snapshot}
            />
          ) : null}

          {activePanel === "backpack" ? (
            <SupplyBackpackPanel
              activeAction={activeAction}
              onRequestRedemption={handleRequestRedemption}
              onSelectItem={setSelectedBackpackItemId}
              onUseItem={handleUseItem}
              selectedItemId={selectedBackpackItemId}
              snapshot={snapshot}
            />
          ) : null}

          {activePanel === "shop" ? (
            <SupplyShopPanel
              activeAction={activeAction}
              onPurchase={handlePurchase}
              onSelectItem={setSelectedShopItemId}
              selectedItemId={selectedShopItemId}
              snapshot={snapshot}
            />
          ) : null}

          {activePanel === "taskRecord" ? (
            <SupplyTaskRecordPanel
              activeAction={activeAction}
              onRespondSocialInvitation={handleRespondSocialInvitation}
              snapshot={snapshot}
            />
          ) : null}
        </main>
      ) : null}
    </section>
  );
}
