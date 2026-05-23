"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabActionButton,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "../supply-dashboard/SupplyUiLabPrimitives";
import { supplyUiLabResourceIconPaths } from "../supply-data/resources";
import type { SupplyDrawPoolPreview, SupplyDrawPoolRewardRow } from "./types";

function DrawPoolTopBar({ data, ticketBalance }: { data: SupplyDrawPoolPreview; ticketBalance: number }) {
  return (
    <header className="supply-draw-pool-topbar" aria-label="顶部菜单栏">
      <div className="supply-draw-pool-brand">
        <Image alt="" height={48} src="/logo.png" unoptimized width={48} />
        <strong>牛马补给站</strong>
      </div>
      <div className="supply-draw-pool-top-resources" aria-label="资源余额">
        {data.topBar.resources.map((resource) => (
          <div className="supply-draw-pool-resource-pill" key={resource.id}>
            <span aria-hidden="true">
              {resource.iconImage ? (
                <Image alt="" height={44} src={resource.iconImage} unoptimized width={44} />
              ) : (
                resource.icon
              )}
            </span>
            <em>{resource.label}</em>
            <strong>{resource.id === "ticket" ? ticketBalance : resource.value}</strong>
            <b aria-hidden="true">+</b>
          </div>
        ))}
      </div>
      <Link className="supply-draw-pool-close" href={data.topBar.closeHref} aria-label="返回大厅">
        ×
      </Link>
    </header>
  );
}

function TicketWalletPanel({
  data,
  ticketBalance,
}: {
  data: SupplyDrawPoolPreview;
  ticketBalance: number;
}) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="抽奖券钱包" className="supply-draw-pool-wallet" title="当前拥有">
      <div className="supply-draw-pool-ticket-count">
        <Image alt="" height={84} src={data.wallet.ticketIcon} unoptimized width={84} />
        <p>
          <span>抽奖券</span>
          <strong>{ticketBalance} 张</strong>
        </p>
      </div>
      <SupplyUiLabProgress current={data.wallet.dailyEarned} label="今日获取上限" max={data.wallet.dailyLimit} />
      <p className="supply-draw-pool-wallet-helper">{data.wallet.helper}</p>
      <div className="supply-draw-pool-wallet-actions">
        {data.wallet.actions.map((action) => (
          <SupplyUiLabActionButton ariaLabel={action.label} key={action.id} tone={action.tone}>
            {action.label}
          </SupplyUiLabActionButton>
        ))}
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function DrawGuidePanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="抽卡提示" className="supply-draw-pool-guide" title="补给提示">
      <Image alt="健身牛马助手" height={96} src={data.guide.mascotImage} unoptimized width={96} />
      <div>
        <p>{data.guide.message}</p>
        <SupplyUiLabActionButton ariaLabel={data.guide.actionLabel} tone="secondary">
          {data.guide.actionLabel}
        </SupplyUiLabActionButton>
      </div>
    </SupplyUiLabPixelPanel>
  );
}

function PoolPreviewPanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="奖池预览" className="supply-draw-pool-rates" tone="dark" title="奖池预览">
      <p className="supply-draw-pool-rates-note">掉落概率分布</p>
      <ol>
        {data.poolRates.map((rate) => (
          <li
            aria-label={`${rate.rarity} 掉落概率 ${rate.percent}%`}
            className={`supply-draw-pool-rate supply-draw-pool-rate--${rate.tone}`}
            key={rate.tier}
          >
            <em>{rate.rarity}</em>
            <span>
              <i style={{ width: `${rate.percent}%` }} />
            </span>
            <strong>{rate.percent}%</strong>
          </li>
        ))}
      </ol>
    </SupplyUiLabPixelPanel>
  );
}

function DrawMachineStage({
  data,
  onDraw,
  ticketBalance,
}: {
  data: SupplyDrawPoolPreview;
  onDraw: (drawCount: number) => void;
  ticketBalance: number;
}) {
  return (
    <section className="supply-draw-pool-machine" aria-label="补给抽卡机">
      <div className="supply-draw-pool-machine-stage">
        <Image
          alt="补给抽卡机"
          className="supply-draw-pool-machine-image"
          height={992}
          priority
          src={data.media.machine}
          unoptimized
          width={1586}
        />
        <div className="supply-draw-pool-machine-title">
          <h1>{data.machine.title}</h1>
        </div>
        <Image
          alt=""
          className="supply-draw-pool-window-emblem"
          height={128}
          src={data.machine.emblemImage}
          unoptimized
          width={128}
        />
        <Image
          alt=""
          className="supply-draw-pool-capsules"
          height={180}
          src={data.media.capsuleBed}
          unoptimized
          width={640}
        />
        <div className="supply-draw-pool-machine-controls">
          {data.machine.actions.map((action) => {
            const shortage = Math.max(0, action.costTicket - ticketBalance);
            const disabled = shortage > 0;

            return (
              <SupplyUiLabActionButton
                ariaLabel={`${action.label} x${action.drawCount}，消耗抽奖券 x${action.costTicket}，${action.guaranteeLabel}${
                  disabled ? `，抽奖券不足，还差 ${shortage} 张` : ""
                }`}
                className={`supply-draw-pool-action supply-draw-pool-action--${action.tone}`}
                disabled={disabled}
                key={action.id}
                onClick={() => onDraw(action.drawCount)}
              >
                <strong>
                  {action.label} x{action.drawCount}
                </strong>
                <em>
                  <Image alt="" height={32} src={supplyUiLabResourceIconPaths.ticket} unoptimized width={32} />
                  x{action.costTicket}
                </em>
                <span>{action.guaranteeLabel}</span>
              </SupplyUiLabActionButton>
            );
          })}
        </div>
        {data.machine.actions.some((action) => action.id === "ten" && ticketBalance < action.costTicket) ? (
          <p className="supply-draw-pool-ticket-shortage">
            十连还差 {Math.max(0, 10 - ticketBalance)} 张抽奖券
          </p>
        ) : null}
        <label className="supply-draw-pool-skip-toggle">
          <input checked={data.machine.skipAnimation} readOnly type="checkbox" />
          跳过抽奖动画
        </label>
      </div>
    </section>
  );
}

function DrawInfoRail({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <aside className="supply-draw-pool-right-rail">
      <Link className="supply-draw-pool-probability" href={data.probabilityHref}>
        概率公示
      </Link>
      <SupplyUiLabPixelPanel
        ariaLabel={data.guarantee.title}
        className="supply-draw-pool-guarantee"
        title={data.guarantee.title}
      >
        <p>{data.guarantee.description}</p>
        <ul>
          {data.guarantee.eligibleTierLabels.map((tierLabel) => (
            <li key={tierLabel}>{tierLabel}</li>
          ))}
        </ul>
      </SupplyUiLabPixelPanel>
      <SupplyUiLabPixelPanel ariaLabel="查看规则" className="supply-draw-pool-rules" title="查看规则">
        <ol>
          {data.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <Link aria-label="查看规则" href={data.probabilityHref}>
          查看规则
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function DrawRewardList({ rewards }: { rewards: SupplyDrawPoolRewardRow[] }) {
  return (
    <ul className="supply-draw-pool-drop-list">
      {rewards.map((drop) => (
        <li className={`supply-draw-pool-drop supply-draw-pool-drop--${drop.rarity.toLowerCase()}`} key={drop.id}>
          <SupplyUiLabStatusBadge tone={drop.rarity === "SSR" ? "warning" : "muted"}>{drop.rarity}</SupplyUiLabStatusBadge>
          <Image alt="" height={84} src={drop.image} unoptimized width={84} />
          <strong>{drop.quantityLabel}</strong>
          <p>{drop.name}</p>
        </li>
      ))}
    </ul>
  );
}

function DrawResultPanel({
  resultLabel,
  results,
  ticketBalance,
}: {
  resultLabel: string | null;
  results: SupplyDrawPoolRewardRow[];
  ticketBalance: number;
}) {
  if (!resultLabel) {
    return null;
  }

  return (
    <SupplyUiLabPixelPanel ariaLabel={resultLabel} className="supply-draw-pool-result" title={resultLabel}>
      <p>剩余 {ticketBalance} 张抽奖券</p>
      <DrawRewardList rewards={results} />
    </SupplyUiLabPixelPanel>
  );
}

function RecentDropsPanel({ data }: { data: SupplyDrawPoolPreview }) {
  return (
    <SupplyUiLabPixelPanel ariaLabel="最近掉落" className="supply-draw-pool-recent">
      <header>
        <h2>最近掉落</h2>
        <Link aria-label="全部记录" href={data.recordsHref}>
          全部记录
        </Link>
      </header>
      <DrawRewardList rewards={data.recentDrops} />
    </SupplyUiLabPixelPanel>
  );
}

export function SupplyDrawPoolScene({ data }: { data: SupplyDrawPoolPreview }) {
  const [ticketBalance, setTicketBalance] = useState(data.wallet.ticketBalance);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [drawResults, setDrawResults] = useState(data.singleDrawResult);
  const emptyDrawMessage = useMemo(() => data.emptyDrawMessage, [data.emptyDrawMessage]);

  function handleDraw(drawCount: number) {
    if (ticketBalance < drawCount) {
      setResultLabel(emptyDrawMessage);
      return;
    }

    setTicketBalance((current) => current - drawCount);
    setDrawResults(drawCount === 10 ? data.tenDrawResult : data.singleDrawResult);
    setResultLabel(drawCount === 10 ? "本次十连结果" : "本次结果");
  }

  return (
    <main className="supply-draw-pool-scene" aria-label="抽卡池 UI Lab">
      <div className="supply-draw-pool-background" aria-hidden="true">
        <Image alt="" fill priority sizes="100vw" src={data.media.background} unoptimized />
      </div>
      <div className="supply-draw-pool-content">
        <DrawPoolTopBar data={data} ticketBalance={ticketBalance} />
        <div className="supply-draw-pool-layout">
          <aside className="supply-draw-pool-left-rail">
            <TicketWalletPanel data={data} ticketBalance={ticketBalance} />
            <DrawGuidePanel data={data} />
            <PoolPreviewPanel data={data} />
          </aside>
          <div className="supply-draw-pool-center">
            <DrawMachineStage data={data} onDraw={handleDraw} ticketBalance={ticketBalance} />
            <DrawResultPanel resultLabel={resultLabel} results={drawResults} ticketBalance={ticketBalance} />
            <RecentDropsPanel data={data} />
          </div>
          <DrawInfoRail data={data} />
        </div>
        <Link className="supply-draw-pool-back" href={data.backHref}>
          <span aria-hidden="true">⌂</span>
          返回大厅
        </Link>
      </div>
    </main>
  );
}
