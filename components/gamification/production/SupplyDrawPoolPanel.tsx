"use client";

import type {
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

type SupplyDrawPoolAction = "draw-single" | "draw-ten";

export interface SupplyDrawPoolPanelProps {
  snapshot: SupplyStationProductionSnapshot;
  latestDraw: GamificationLotteryDrawSnapshot | null;
  activeAction: SupplyDrawPoolAction | string | null;
  onDraw: (drawType: "SINGLE" | "TEN", useCoinTopUp: boolean) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function getDrawResultLabel(draw: GamificationLotteryDrawSnapshot) {
  return draw.drawType === "TEN" ? "十连结果" : "单抽结果";
}

export function SupplyDrawPoolPanel({
  activeAction,
  latestDraw,
  onDraw,
  snapshot,
}: SupplyDrawPoolPanelProps) {
  const wallet = snapshot.drawPool.wallet;
  const lottery = snapshot.drawPool.lottery;
  const hasTopUp = lottery.tenDrawTopUpRequired > 0;
  const isBusy = activeAction !== null;

  return (
    <section className="supply-production-draw-pool" aria-label="抽奖池">
      <header className="supply-production-draw-pool__header">
        <div>
          <p>补给抽卡机</p>
          <h2>抽奖池</h2>
        </div>
        <article className="supply-production-draw-pool__wallet" aria-label="抽奖券钱包">
          <span>抽奖券</span>
          <strong>{formatNumber(wallet.ticketBalance)} 张</strong>
          <small>
            今日获取 {wallet.todayEarned}/{wallet.maxFreeTicketsToday} · 今日花费{" "}
            {wallet.todaySpent}
          </small>
        </article>
      </header>

      <section className="supply-production-draw-pool__machine" aria-label="补给抽卡机">
        <p>{lottery.message}</p>
        <div>
          <button
            data-action="draw-single"
            disabled={isBusy || !lottery.singleDrawEnabled}
            onClick={() => onDraw("SINGLE", false)}
            type="button"
          >
            {activeAction === "draw-single" ? "单抽中" : "单抽"}
          </button>
          <button
            data-action="draw-ten"
            disabled={isBusy || !lottery.tenDrawEnabled}
            onClick={() => onDraw("TEN", hasTopUp)}
            type="button"
          >
            {activeAction === "draw-ten" ? "十连中" : hasTopUp ? "补券十连" : "十连 x10"}
          </button>
        </div>
        {hasTopUp ? (
          <p className="supply-production-draw-pool__top-up">
            十连还差 {lottery.tenDrawTopUpRequired} 张券，需要{" "}
            {lottery.tenDrawTopUpCoinCost} 银子补齐。
          </p>
        ) : null}
      </section>

      <section className="supply-production-draw-pool__guarantee" aria-label="十连保底">
        <h3>十连保底</h3>
        <p>十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。</p>
      </section>

      <section className="supply-production-draw-pool__result" aria-label="抽奖结果">
        {latestDraw ? (
          <article>
            <h3>{getDrawResultLabel(latestDraw)}</h3>
            <p>
              本次抽到 {latestDraw.rewards.length} 个奖励
              {latestDraw.guaranteeApplied ? "，触发十连保底" : ""}
            </p>
            <ul>
              {latestDraw.rewards.map((reward, index) => (
                <li key={`${latestDraw.id}-${reward.rewardId}-${index}`}>
                  <strong>{reward.name}</strong>
                  <span>{reward.rewardTier}</span>
                  <p>{reward.effectSummary}</p>
                </li>
              ))}
            </ul>
          </article>
        ) : lottery.recentDraws.length > 0 ? (
          <p>最近 {lottery.recentDraws.length} 次抽奖记录已归档。</p>
        ) : (
          <p>暂时没有抽奖记录。</p>
        )}
      </section>
    </section>
  );
}
