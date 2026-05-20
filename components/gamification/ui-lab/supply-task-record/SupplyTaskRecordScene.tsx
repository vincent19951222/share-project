"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";
import { SupplyUiLabTopBar } from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabTopBar";
import type {
  SupplyTaskRecordDateOption,
  SupplyTaskRecordDrawHistoryItem,
  SupplyTaskRecordInvite,
  SupplyTaskRecordMode,
  SupplyTaskRecordPreview,
  SupplyTaskRecordRadarStatus,
  SupplyTaskRecordRedemption,
  SupplyTaskRecordTimelineItem,
} from "./types";

const timelineStatusTone: Record<SupplyTaskRecordTimelineItem["status"], "success" | "warning"> = {
  claimed: "warning",
  completed: "success",
};

const redemptionStatusTone: Record<SupplyTaskRecordRedemption["status"], "success" | "warning" | "muted"> = {
  completed: "success",
  expired: "muted",
  processing: "warning",
};

const radarStatusTone: Record<SupplyTaskRecordRadarStatus, "success" | "warning" | "muted"> = {
  expired: "muted",
  pending: "warning",
  responded: "success",
};

const modeTitles: Record<SupplyTaskRecordMode, string> = {
  draws: "抽卡记录",
  radar: "队友雷达",
  redemptions: "兑换记录",
  rules: "规则说明",
  today: "今日记录",
};

export function SupplyTaskRecordScene({ data }: { data: SupplyTaskRecordPreview }) {
  const [activeMode, setActiveMode] = useState<SupplyTaskRecordMode>(data.activeMode);
  const [activeDateKey, setActiveDateKey] = useState(data.activeDateKey);
  const selectedDate = useMemo(
    () => data.dates.find((date) => date.key === activeDateKey) ?? data.dates[0],
    [activeDateKey, data.dates],
  );
  const selectedRecords = data.recordsByDate[activeDateKey] ?? [];

  return (
    <main className="supply-task-record-scene">
      <div className="supply-task-record-background" aria-hidden="true" />
      <div className="supply-task-record-content">
        <SupplyUiLabTopBar activeLabel="任务记录" profile={data.topBar.profile} resources={data.topBar.resources} />
        <section className="supply-task-record-shell" aria-label="任务记录静态页">
          <TaskRecordSidebar activeMode={activeMode} data={data} onSelectMode={setActiveMode} />
          <TaskRecordMainPanel
            activeDateKey={activeDateKey}
            activeMode={activeMode}
            data={data}
            records={selectedRecords}
            selectedDate={selectedDate}
            onSelectDate={setActiveDateKey}
          />
          <aside className="supply-task-record-aside" aria-label="任务记录侧栏">
            <TeammateRadarPanel
              invites={data.radar.invites.filter((invite) => invite.status === "pending")}
              tabs={data.radar.tabs}
            />
            <RedemptionStatusPanel items={data.redemptions.items} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function TaskRecordSidebar({
  activeMode,
  data,
  onSelectMode,
}: {
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  onSelectMode: (mode: SupplyTaskRecordMode) => void;
}) {
  return (
    <aside className="supply-task-record-sidebar" aria-label="任务记录分类">
      <SupplyUiLabPixelPanel
        ariaLabel="任务记录分类"
        className="supply-task-record-sidebar-card"
        title={
          <span className="supply-task-record-sidebar-title">
            <span aria-hidden="true">▣</span>
            任务记录
          </span>
        }
      >
        <nav className="supply-task-record-menu" aria-label="任务记录分类">
          {data.sidebar.menuItems.map((item) => {
            const isActive = item.id === activeMode;

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? "is-active" : undefined}
                key={item.id}
                onClick={() => onSelectMode(item.id)}
                type="button"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </nav>
        <div
          className="supply-task-record-sidebar-mascot"
          aria-label="补给大厅引导"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8, 13, 20, 0.18), rgba(8, 13, 20, 0.82)), url(${data.sidebar.mascot.background})`,
          }}
        >
          <Image alt="" height={124} src={data.sidebar.mascot.hero} unoptimized width={124} />
          <p>记录每次脱脂成果，把银子花在刀刃上。</p>
        </div>
        <Link className="supply-task-record-back-link" href={data.sidebar.backHref}>
          返回大厅
        </Link>
      </SupplyUiLabPixelPanel>
    </aside>
  );
}

function TaskRecordMainPanel({
  activeDateKey,
  activeMode,
  data,
  onSelectDate,
  records,
  selectedDate,
}: {
  activeDateKey: string;
  activeMode: SupplyTaskRecordMode;
  data: SupplyTaskRecordPreview;
  onSelectDate: (dateKey: string) => void;
  records: SupplyTaskRecordTimelineItem[];
  selectedDate?: SupplyTaskRecordDateOption;
}) {
  return (
    <section className="supply-task-record-timeline-panel" aria-labelledby="task-record-title">
      <SupplyUiLabPixelPanel ariaLabel={modeTitles[activeMode]} className="supply-task-record-timeline-card">
        <header className="supply-task-record-timeline-header">
          <div>
            <p>{activeMode === "today" ? selectedDate?.label : "完整视图"}</p>
            <h1 id="task-record-title">{modeTitles[activeMode]}</h1>
          </div>
          <div className="supply-task-record-day">
            <strong>{selectedDate?.dateLabel ?? "最近"}</strong>
            <span>{selectedDate?.weekday ?? "全部记录"}</span>
          </div>
        </header>
        {activeMode === "today" ? (
          <TaskTimelinePanel
            activeDateKey={activeDateKey}
            data={data}
            records={records}
            onSelectDate={onSelectDate}
          />
        ) : null}
        {activeMode === "draws" ? <DrawHistoryPanel draws={data.drawHistory} /> : null}
        {activeMode === "redemptions" ? <RedemptionFullPanel items={data.redemptions.items} /> : null}
        {activeMode === "radar" ? <RadarFullPanel invites={data.radar.invites} /> : null}
        {activeMode === "rules" ? <RulesPanel rules={data.rules} /> : null}
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function TaskTimelinePanel({
  activeDateKey,
  data,
  onSelectDate,
  records,
}: {
  activeDateKey: string;
  data: SupplyTaskRecordPreview;
  onSelectDate: (dateKey: string) => void;
  records: SupplyTaskRecordTimelineItem[];
}) {
  return (
    <>
      <div className="supply-task-record-date-tabs" role="tablist" aria-label="记录日期">
        {data.dates.map((date) => (
          <button
            aria-selected={date.key === activeDateKey}
            key={date.key}
            onClick={() => onSelectDate(date.key)}
            role="tab"
            type="button"
          >
            <span>{date.label}</span>
            <small>{date.dateLabel}</small>
          </button>
        ))}
      </div>
      <div className="supply-task-record-filters">
        <SupplyUiLabFilterBar ariaLabel="记录筛选" filters={data.filters} />
      </div>
      <div className="supply-task-record-timeline" aria-label="任务记录时间线">
        {records.length > 0 ? (
          records.map((record) => <TimelineItem key={record.id} record={record} />)
        ) : (
          <div className="supply-task-record-empty">
            <strong>这一天还没有任务记录</strong>
            <p>空状态来自本地 recordsByDate，不再展示假数据。</p>
          </div>
        )}
      </div>
      <SupplyUiLabActionButton className="supply-task-record-load-more" tone="secondary">
        加载更多记录 <span aria-hidden="true">⌄</span>
      </SupplyUiLabActionButton>
    </>
  );
}

function TimelineItem({ record }: { record: SupplyTaskRecordTimelineItem }) {
  return (
    <article className="supply-task-record-timeline-item" data-status={record.status} data-testid="task-record-timeline-item">
      <time>{record.time}</time>
      <span className="supply-task-record-dot" aria-hidden="true" />
      <div className="supply-task-record-entry">
        <div className="supply-task-record-entry-icon" aria-hidden="true">
          {record.icon.type === "image" ? (
            <Image src={record.icon.value} alt="" width={44} height={44} unoptimized />
          ) : (
            record.icon.value
          )}
        </div>
        <div className="supply-task-record-entry-copy">
          <span data-tone={record.categoryTone}>{record.categoryLabel}</span>
          <h2>{record.title}</h2>
          {record.subtitle ? <p>{record.subtitle}</p> : null}
        </div>
        <div className="supply-task-record-reward">
          <b aria-hidden="true">{record.reward.icon}</b>
          <span>
            {record.reward.label} {record.reward.amount}
          </span>
        </div>
        <SupplyUiLabStatusBadge tone={timelineStatusTone[record.status]}>{record.statusLabel}</SupplyUiLabStatusBadge>
      </div>
    </article>
  );
}

function DrawHistoryPanel({ draws }: { draws: SupplyTaskRecordDrawHistoryItem[] }) {
  return (
    <div className="supply-task-record-draw-list" aria-label="抽卡历史">
      {draws.map((draw) => (
        <article className="supply-task-record-draw" data-testid="task-record-draw-history" key={draw.id}>
          <div className="supply-task-record-draw-meta">
            <strong>{draw.drawType}</strong>
            <time>{draw.time}</time>
            <span>消耗抽奖券 {draw.ticketSpent}</span>
          </div>
          <SupplyUiLabStatusBadge tone={draw.guaranteeApplied ? "warning" : "muted"}>
            {draw.guaranteeLabel}
          </SupplyUiLabStatusBadge>
          <div className="supply-task-record-reward-grid" aria-label={`${draw.drawType}奖励明细`}>
            {draw.rewards.map((reward) => (
              <span key={`${draw.id}-${reward.name}-${reward.quantityLabel}`}>
                <b>{reward.rarity}</b>
                {reward.name} {reward.quantityLabel}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RedemptionFullPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整兑换记录">
      {items.map((item) => (
        <div data-testid="task-record-redemption-full" key={item.id}>
          <RedemptionRecord item={item} />
        </div>
      ))}
    </div>
  );
}

function RadarFullPanel({ invites }: { invites: SupplyTaskRecordInvite[] }) {
  return (
    <div className="supply-task-record-full-list" aria-label="完整队友雷达">
      {invites.map((invite) => (
        <div data-testid="task-record-radar-invite-full" key={invite.id}>
          <InviteRecord invite={invite} />
        </div>
      ))}
    </div>
  );
}

function RulesPanel({ rules }: { rules: string[] }) {
  return (
    <ol className="supply-task-record-rules-list" aria-label="任务记录规则说明">
      {rules.map((rule) => (
        <li data-testid="task-record-rule" key={rule}>
          {rule}
        </li>
      ))}
    </ol>
  );
}

function InviteRecord({ invite }: { invite: SupplyTaskRecordInvite }) {
  return (
    <article className="supply-task-record-invite" data-testid="task-record-radar-invite" key={invite.id}>
      <Image src={invite.avatar} alt={invite.name} width={54} height={54} unoptimized />
      <div>
        <h3>{invite.name}</h3>
        <p>{invite.message}</p>
        <time>{invite.timeLabel}</time>
      </div>
      <div className="supply-task-record-radar-actions">
        <SupplyUiLabStatusBadge tone={radarStatusTone[invite.status]}>{invite.statusLabel}</SupplyUiLabStatusBadge>
        {invite.status === "pending" ? <button type="button">回应</button> : null}
        {invite.status === "pending" ? <button type="button">忽略</button> : null}
      </div>
    </article>
  );
}

function RedemptionRecord({ item }: { item: SupplyTaskRecordRedemption }) {
  return (
    <article className="supply-task-record-redemption" data-status={item.status} data-testid="task-record-redemption">
      <div className="supply-task-record-redemption-icon">
        <Image src={item.icon} alt="" width={54} height={54} unoptimized />
      </div>
      <div>
        <h3>{item.title}</h3>
        <p>{item.requestedAt}</p>
        <p>{item.secondaryLabel}</p>
      </div>
      <SupplyUiLabStatusBadge tone={redemptionStatusTone[item.status]}>{item.statusLabel}</SupplyUiLabStatusBadge>
    </article>
  );
}

function TeammateRadarPanel({
  tabs,
  invites,
}: {
  tabs: SupplyTaskRecordPreview["radar"]["tabs"];
  invites: SupplyTaskRecordInvite[];
}) {
  return (
    <section className="supply-task-record-radar" aria-labelledby="task-record-radar-title">
      <SupplyUiLabPixelPanel
        ariaLabel="队友雷达"
        className="supply-task-record-radar-card"
        title={
          <span className="supply-task-record-side-title">
            <span id="task-record-radar-title">队友雷达</span>
            <button type="button">全部已读</button>
          </span>
        }
      >
        <div className="supply-task-record-radar-tabs" role="tablist" aria-label="队友雷达状态">
          {tabs.map((tab) => (
            <button aria-selected={tab.active} key={tab.id} role="tab" type="button">
              {tab.label}
            </button>
          ))}
        </div>
        <div className="supply-task-record-invite-list">
          {invites.map((invite) => (
            <InviteRecord invite={invite} key={invite.id} />
          ))}
        </div>
        <SupplyUiLabActionButton className="supply-task-record-view-all" tone="ghost">
          查看全部 <span aria-hidden="true">›</span>
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </section>
  );
}

function RedemptionStatusPanel({ items }: { items: SupplyTaskRecordRedemption[] }) {
  return (
    <section className="supply-task-record-redemptions" aria-labelledby="task-record-redemptions-title">
      <SupplyUiLabPixelPanel
        ariaLabel="兑换状态"
        className="supply-task-record-redemptions-card"
        title={<span id="task-record-redemptions-title">兑换状态</span>}
      >
        <div className="supply-task-record-redemption-list">
          {items.map((item) => (
            <RedemptionRecord item={item} key={item.id} />
          ))}
        </div>
        <SupplyUiLabActionButton className="supply-task-record-view-all" tone="ghost">
          查看全部 <span aria-hidden="true">›</span>
        </SupplyUiLabActionButton>
      </SupplyUiLabPixelPanel>
    </section>
  );
}
